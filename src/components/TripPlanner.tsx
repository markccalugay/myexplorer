import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map from './Map';
import { Timeline } from './Timeline';
import { StopCard } from './StopCard';
import { FilterPanel } from './FilterPanel';
import {
    ActiveNavigationRecommendationSession,
    RecommendationCandidate,
    RecommendationVote,
    Stop,
    Trip,
} from '../types/trip';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { BASIC_PLACE_FIELDS, toAppPlace, fetchPlaceFromPrediction } from '../lib/googlePlaces';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { getStopColor } from '../lib/stopColors';
import { AppRoute, AppRouteStep, computeDrivingRoute, getRouteDistanceKm, getRouteDurationMinutes, getRoutePath, getRouteSteps } from '../lib/googleRoutes';
import { AppPlace } from '../types/place';
import { ConveyPanel } from './ConveyPanel';
import './TripPlanner.css';

interface TripPlannerProps {
    trip: Trip;
    onTripChange: (trip: Trip) => void;
    onSaveTrip: (trip: Trip) => void;
    isDirty: boolean;
    isSavedTrip: boolean;
    conveyDefaultOverlay?: 'vehicles' | 'invite' | 'assignments' | null;
    onConveyOverlayHandled?: () => void;
    onClose: () => void;
}

// Average fuel efficiency assumed for estimation
const FUEL_EFFICIENCY_KM_PER_L = 12;
const FAVORITE_STORAGE_KEY = 'myexplorer.favorite-places';
const RECOMMENDATION_DISPLAY_DELAY_MS = 5_000;
const RECOMMENDATION_DECISION_WINDOW_MS = 300_000;
const RECOMMENDATION_MIN_DISTANCE_KM = 25;
const RECOMMENDATION_MIN_DURATION_MINUTES = 30;
const RECOMMENDATION_MAX_NEARBY_RESULTS = 6;
const RECOMMENDATION_DUPLICATE_RADIUS_KM = 1;
const DEFAULT_RECOMMENDATION_TYPES = ['tourist_attraction', 'park', 'restaurant', 'cafe', 'museum'];

interface FavoritePlace {
    id: string;
    label: string;
    place: AppPlace;
}

interface RecommendationFilters {
    fuel: string[];
    dining: string[];
    essentials: string[];
}

// Helper: interpolate a fraction (0–1) along an encoded polyline path
const interpolatePath = (
    path: google.maps.LatLng[],
    fraction: number
): google.maps.LatLngLiteral => {
    if (fraction <= 0) return { lat: path[0].lat(), lng: path[0].lng() };
    if (fraction >= 1) {
        const last = path[path.length - 1];
        return { lat: last.lat(), lng: last.lng() };
    }

    // Calculate total path length in approximate degrees
    let totalLen = 0;
    const segments: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i + 1].lat() - path[i].lat();
        const dy = path[i + 1].lng() - path[i].lng();
        const len = Math.sqrt(dx * dx + dy * dy);
        segments.push(len);
        totalLen += len;
    }

    let target = fraction * totalLen;
    for (let i = 0; i < segments.length; i++) {
        if (target <= segments[i]) {
            const t = segments[i] > 0 ? target / segments[i] : 0;
            return {
                lat: path[i].lat() + t * (path[i + 1].lat() - path[i].lat()),
                lng: path[i].lng() + t * (path[i + 1].lng() - path[i].lng()),
            };
        }
        target -= segments[i];
    }
    const last = path[path.length - 1];
    return { lat: last.lat(), lng: last.lng() };
};

const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatElapsedTime = (elapsedMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatCountdown = (remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const hasJourneyDetailsChanged = (previousStops: Stop[], nextStops: Stop[]) =>
    previousStops.length !== nextStops.length ||
    previousStops.some((stop, index) => {
        const nextStop = nextStops[index];
        return (
            stop.distanceFromPrevious !== nextStop.distanceFromPrevious ||
            stop.durationFromPrevious !== nextStop.durationFromPrevious ||
            stop.arrivalTime !== nextStop.arrivalTime
        );
    });

const stripInstructionMarkup = (instruction?: string | null) => {
    if (!instruction) return 'Continue on the current road';
    return instruction.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const getInstructionDistance = (step?: AppRouteStep | null) => {
    const localized = step?.localizedValues?.distance?.text?.trim();
    if (localized) return localized;

    const distanceMeters = step?.distanceMeters;
    if (typeof distanceMeters !== 'number') return null;
    if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)} km`;
    return `${Math.round(distanceMeters)} m`;
};

const getInstructionDuration = (step?: AppRouteStep | null) => {
    const localized = step?.localizedValues?.staticDuration?.text?.trim();
    if (localized) return localized;

    const durationMillis = step?.durationMillis;
    if (typeof durationMillis !== 'number') return null;

    const totalMinutes = Math.max(1, Math.round(durationMillis / 60_000));
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return `${totalMinutes} min`;
};

const normalizeLabel = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKmBetweenPoints = (
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral
) => {
    const earthRadiusKm = 6371;
    const latDistance = toRadians(end.lat - start.lat);
    const lngDistance = toRadians(end.lng - start.lng);
    const a = Math.sin(latDistance / 2) ** 2 +
        Math.cos(toRadians(start.lat)) * Math.cos(toRadians(end.lat)) * Math.sin(lngDistance / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNavigationLegKey = (
    origin: google.maps.LatLngLiteral | null,
    stopIndex: number,
    stop: Stop | null
) => {
    if (!origin || !stop) return null;

    return [
        stopIndex,
        stop.id,
        origin.lat.toFixed(5),
        origin.lng.toFixed(5),
        stop.location.lat.toFixed(5),
        stop.location.lng.toFixed(5),
    ].join(':');
};

const getRecommendationCategoryLabel = (primaryType?: string) => (
    primaryType
        ? primaryType
            .split('_')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ')
        : 'Things to do'
);

const getRecommendationTypes = (filters: RecommendationFilters) => {
    const preferredTypes = new Set<string>(DEFAULT_RECOMMENDATION_TYPES);
    const diningLabels = filters.dining.map((value) => normalizeLabel(value));
    const essentialLabels = filters.essentials.map((value) => normalizeLabel(value));

    if (diningLabels.some((label) => label.includes('coffee'))) {
        preferredTypes.add('cafe');
    }
    if (diningLabels.some((label) => label.includes('fast food') || label.includes('drive-thru'))) {
        preferredTypes.add('meal_takeaway');
    }
    if (diningLabels.length > 0) {
        preferredTypes.add('restaurant');
    }
    if (essentialLabels.some((label) => label.includes('7-eleven') || label.includes('alfamart'))) {
        preferredTypes.add('convenience_store');
    }
    if (essentialLabels.some((label) => label.includes('clean toilets') || label.includes('24-hour'))) {
        preferredTypes.add('rest_stop');
    }

    return Array.from(preferredTypes).slice(0, 10);
};

const getGeolocation = () =>
    new Promise<google.maps.LatLngLiteral>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not available on this device.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                resolve({
                    lat: coords.latitude,
                    lng: coords.longitude,
                });
            },
            (error) => reject(new Error(error.message || 'Unable to access your current location.')),
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60_000,
            }
        );
    });

const reverseGeocodeLocation = async (
    googleMaps: typeof google | null,
    location: google.maps.LatLngLiteral
): Promise<Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>> => {
    if (!googleMaps?.maps?.Geocoder) {
        return {
            name: 'Current location',
            formattedAddress: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
            location,
        };
    }

    try {
        const geocoder = new googleMaps.maps.Geocoder();
        const response = await geocoder.geocode({ location });
        const topResult = response.results?.[0];

        return {
            name: topResult?.address_components?.[0]?.long_name || 'Current location',
            formattedAddress: topResult?.formatted_address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
            location,
        };
    } catch (error) {
        console.warn('Failed to reverse geocode current location:', error);
        return {
            name: 'Current location',
            formattedAddress: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
            location,
        };
    }
};

const createStopFromPlace = (
    place: Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>,
    type: Stop['type']
): Stop => ({
    id: Math.random().toString(36).substr(2, 9),
    name: place.name,
    formattedAddress: place.formattedAddress,
    location: place.location,
    type,
    source: 'manual',
});

export const TripPlanner: React.FC<TripPlannerProps> = ({
    trip: initialTrip,
    onTripChange,
    onSaveTrip,
    isDirty,
    isSavedTrip,
    conveyDefaultOverlay = null,
    onConveyOverlayHandled,
    onClose,
}) => {
    const [trip, setTrip] = useState<Trip>(initialTrip);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isPreparingNavigation, setIsPreparingNavigation] = useState(false);
    const [editingStopId, setEditingStopId] = useState<string | null>(null);
    const [navigationRoute, setNavigationRoute] = useState<AppRoute | null>(null);
    const [currentStopIndex, setCurrentStopIndex] = useState(1);
    const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
    const [tripStartedAt, setTripStartedAt] = useState<number | null>(null);
    const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
    const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
    const [favoriteLabel, setFavoriteLabel] = useState('');
    const [favoritePlaceDraft, setFavoritePlaceDraft] = useState<AppPlace | null>(null);
    const [favoriteSearchValue, setFavoriteSearchValue] = useState('');
    const [favoriteInputKey, setFavoriteInputKey] = useState(0);
    const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
    const [originLocationError, setOriginLocationError] = useState<string | null>(null);
    const [recommendationFilters, setRecommendationFilters] = useState<RecommendationFilters>({
        fuel: [],
        dining: [],
        essentials: [],
    });
    const [recommendationSession, setRecommendationSession] = useState<ActiveNavigationRecommendationSession | null>(null);
    const [recommendationNowMs, setRecommendationNowMs] = useState(() => Date.now());
    const { google } = useGoogleMaps();
    const autoPitstopRouteKeyRef = useRef<string | null>(null);
    const offeredRecommendationLegsRef = useRef<Set<string>>(new Set());
    const updateTrip = useCallback((updater: Trip | ((previousTrip: Trip) => Trip)) => {
        setTrip((previousTrip) => {
            const nextTrip = typeof updater === 'function'
                ? (updater as (previousTrip: Trip) => Trip)(previousTrip)
                : updater;
            onTripChange(nextTrip);
            return nextTrip;
        });
    }, [onTripChange]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as FavoritePlace[];
            if (Array.isArray(parsed)) {
                setFavorites(parsed);
            }
        } catch (error) {
            console.error('Failed to load favorite places:', error);
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favorites));
        } catch (error) {
            console.error('Failed to save favorite places:', error);
        }
    }, [favorites]);

    useEffect(() => {
        setTrip(initialTrip);
        setIsAddingStop(false);
        setEditingStopId(null);
        setIsNavigating(false);
        setIsPreparingNavigation(false);
        setNavigationRoute(null);
        setCurrentStopIndex(1);
        setCurrentLocation(null);
        setNavigationNotice(null);
        setTripStartedAt(null);
        setElapsedTimeMs(0);
        setIsUsingCurrentLocation(false);
        setOriginLocationError(null);
        setRecommendationFilters({
            fuel: [],
            dining: [],
            essentials: [],
        });
        setRecommendationSession(null);
        setRecommendationNowMs(Date.now());
        autoPitstopRouteKeyRef.current = null;
        offeredRecommendationLegsRef.current = new Set();
    }, [initialTrip]);

    useEffect(() => {
        if (!isNavigating || tripStartedAt === null) {
            setElapsedTimeMs(0);
            return;
        }

        setElapsedTimeMs(Date.now() - tripStartedAt);
        const intervalId = window.setInterval(() => {
            setElapsedTimeMs(Date.now() - tripStartedAt);
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isNavigating, tripStartedAt]);

    // ── Retype stops so first=start, last=destination ─────────────────────────
    const retypeStops = useCallback((stops: Stop[]): Stop[] => {
        if (stops.length === 0) return stops;
        return stops.map((s, i) => {
            if (i === 0) return { ...s, type: 'start' };
            if (i === stops.length - 1) return { ...s, type: 'destination' };
            return { ...s, type: 'stop' };
        });
    }, []);

    const stripAutoSuggestedStops = useCallback((stops: Stop[]) => (
        stops.filter((stop) => !stop.isAutoSuggested)
    ), []);

    const getEndpointRouteKey = useCallback((stops: Stop[]) => {
        if (stops.length < 2) return null;

        const start = stops[0]?.location;
        const destination = stops[stops.length - 1]?.location;
        if (!start || !destination) return null;

        return [
            start.lat.toFixed(6),
            start.lng.toFixed(6),
            destination.lat.toFixed(6),
            destination.lng.toFixed(6),
        ].join(':');
    }, []);

    // ── Recalculate journey times + distances ──────────────────────────────────
    const calculateJourneyDetails = useCallback((stops: Stop[]) => {
        if (!google || stops.length < 2) return;

        Promise.all(
            stops.slice(0, -1).map((stop, index) =>
                computeDrivingRoute(google, stop.location, stops[index + 1].location)
            )
        )
            .then((routes) => {
                const newStops = [...stops];
                let currentTime = new Date();
                currentTime.setHours(8, 0, 0, 0);
                newStops[0].arrivalTime = formatTime(currentTime);

                routes.forEach((route, index) => {
                    const distKm = getRouteDistanceKm(route);
                    const durMins = getRouteDurationMinutes(route);
                    newStops[index + 1].distanceFromPrevious = distKm;
                    newStops[index + 1].durationFromPrevious = durMins;
                    currentTime = new Date(currentTime.getTime() + (durMins + 30) * 60_000);
                    newStops[index + 1].arrivalTime = formatTime(currentTime);
                });

                updateTrip((prev) => (
                    hasJourneyDetailsChanged(prev.stops, newStops)
                        ? { ...prev, stops: newStops }
                        : prev
                ));
            })
            .catch((error) => {
                console.error('Failed to calculate trip segment details:', error);
            });
    }, [google, updateTrip]);

    // ── Auto-pitstop injection ─────────────────────────────────────────────────
    const autoInsertPitstops = useCallback((stops: Stop[]) => {
        if (!google || stops.length < 2) return;

        const start = stops[0];
        const dest = stops[stops.length - 1];
        const routeKey = getEndpointRouteKey(stops);

        computeDrivingRoute(google, start.location, dest.location)
            .then((route) => {
                const durationMins = getRouteDurationMinutes(route);
                const baseStops = stripAutoSuggestedStops(stops);

                // Only insert pitstops for trips > 90 minutes
                if (durationMins < 90) {
                    autoPitstopRouteKeyRef.current = routeKey;
                    updateTrip((prev) => ({ ...prev, stops: retypeStops(baseStops) }));
                    return;
                }

                const path = getRoutePath(route).map((point) => new google.maps.LatLng(point));
                if (!path.length) {
                    autoPitstopRouteKeyRef.current = routeKey;
                    updateTrip((prev) => ({ ...prev, stops: retypeStops(baseStops) }));
                    return;
                }

                const fractions = durationMins >= 180 ? [1 / 3, 2 / 3] : [1 / 2];

                const pitstopPromises: Promise<Stop | null>[] = fractions.map(async (fraction) => {
                    const midpoint = interpolatePath(path, fraction);
                    try {
                        const response = await google.maps.places.Place.searchNearby({
                            fields: [...BASIC_PLACE_FIELDS, 'primaryType'],
                            includedPrimaryTypes: ['gas_station'],
                            locationRestriction: {
                                center: midpoint,
                                radius: 5000,
                            },
                            maxResultCount: 1,
                            rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE,
                            language: 'en',
                            region: 'ph',
                        });

                        const place = response.places?.[0];
                        const appPlace = place ? toAppPlace(place) : null;
                        if (!appPlace) {
                            return null;
                        }

                        const pitstop: Stop = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: appPlace.name,
                            formattedAddress: appPlace.formattedAddress,
                            location: appPlace.location,
                            type: 'stop',
                            source: 'auto-pitstop',
                            isAutoSuggested: true,
                            category: 'Gas Station',
                            googleMapsUri: appPlace.googleMapsUri,
                        };
                        return pitstop;
                    } catch (error) {
                        console.error('Failed to load an auto-suggested pitstop:', error);
                        return null;
                    }
                });

                Promise.all(pitstopPromises).then((pitstops) => {
                    const valid = pitstops
                        .filter((pitstop): pitstop is Stop => pitstop !== null)
                        .filter(
                            (pitstop, index, list) =>
                                list.findIndex(
                                    (candidate) =>
                                        candidate.location.lat === pitstop.location.lat &&
                                        candidate.location.lng === pitstop.location.lng
                                ) === index
                        );

                    updateTrip(prev => {
                        // Insert pitstops between start and destination, preserving any manually-added stops.
                        const manualStops = baseStops.filter((s) => s.type === 'stop');
                        const newStops = [
                            baseStops[0],
                            ...manualStops,
                            ...valid,
                            baseStops[baseStops.length - 1],
                        ];
                        const retyped = retypeStops(newStops);
                        autoPitstopRouteKeyRef.current = routeKey;
                        return { ...prev, stops: retyped };
                    });
                });
            })
            .catch((error) => {
                console.error('Failed to compute auto-pitstop route:', error);
            });
    }, [google, getEndpointRouteKey, retypeStops, stripAutoSuggestedStops, updateTrip]);

    // Trigger calculations whenever stops change (≥ 2)
    useEffect(() => {
        if (!google || trip.stops.length < 2) return;
        calculateJourneyDetails(trip.stops);
    }, [google, trip.stops, calculateJourneyDetails]);

    // Trigger auto-pitstop insertion when we have exactly start + destination
    useEffect(() => {
        if (!google || trip.stops.length < 2) {
            autoPitstopRouteKeyRef.current = null;
            return;
        }

        const hasStart = trip.stops[0]?.type === 'start';
        const hasDest = trip.stops[trip.stops.length - 1]?.type === 'destination';
        const routeKey = getEndpointRouteKey(trip.stops);
        const shouldRefreshAutoPitstops = routeKey !== autoPitstopRouteKeyRef.current;
        if (hasStart && hasDest && shouldRefreshAutoPitstops) {
            autoInsertPitstops(trip.stops);
        }
    }, [google, trip.stops, autoInsertPitstops, getEndpointRouteKey]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleRemoveStop = (id: string) => {
        updateTrip(prev => {
            const filtered = prev.stops.filter(s => s.id !== id);
            const retyped = retypeStops(filtered);
            if (retyped.length >= 2) calculateJourneyDetails(retyped);
            return { ...prev, stops: retyped };
        });
    };

    const handleEditStop = (id: string) => {
        setEditingStopId(id);
    };

    const handleStopEdited = (id: string, updated: Stop) => {
        setEditingStopId(null);
        updateTrip(prev => {
            const newStops = prev.stops.map(s => (s.id === id ? updated : s));
            const retyped = retypeStops(newStops);
            if (retyped.length >= 2) calculateJourneyDetails(retyped);
            return { ...prev, stops: retyped };
        });
    };

    const handleReorder = (newStops: Stop[]) => {
        updateTrip(prev => ({ ...prev, stops: newStops }));
        if (newStops.length >= 2) calculateJourneyDetails(newStops);
    };

    const handleFilterChange = (category: keyof RecommendationFilters, values: string[]) => {
        setRecommendationFilters((previous) => ({
            ...previous,
            [category]: values,
        }));
    };

    const handleAddPlaceAsStop = useCallback((place: Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>) => {
        updateTrip((prev) => {
            const isFirst = prev.stops.length === 0;
            const newStop = createStopFromPlace(place, isFirst ? 'start' : 'stop');
            const updated = [...prev.stops, newStop];
            const retyped = retypeStops(updated);
            return { ...prev, stops: retyped };
        });
        setOriginLocationError(null);
        setIsAddingStop(false);
    }, [retypeStops, updateTrip]);

    const handleUseCurrentLocationAsOrigin = useCallback(async () => {
        if (trip.stops.length > 0) return;

        setIsUsingCurrentLocation(true);
        setOriginLocationError(null);

        try {
            const liveLocation = await getGeolocation();
            const originPlace = await reverseGeocodeLocation(google, liveLocation);
            handleAddPlaceAsStop(originPlace);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Unable to access your current location.';
            setOriginLocationError(message);
        } finally {
            setIsUsingCurrentLocation(false);
        }
    }, [google, handleAddPlaceAsStop, trip.stops.length]);

    const handleSaveFavorite = () => {
        const trimmedLabel = favoriteLabel.trim();
        if (!trimmedLabel || !favoritePlaceDraft) return;

        const favorite: FavoritePlace = {
            id: `${trimmedLabel.toLowerCase()}-${Date.now()}`,
            label: trimmedLabel,
            place: favoritePlaceDraft,
        };

        setFavorites((prev) => {
            const filtered = prev.filter(
                (entry) => entry.label.trim().toLowerCase() !== trimmedLabel.toLowerCase()
            );
            return [favorite, ...filtered];
        });
        setFavoriteLabel('');
        setFavoritePlaceDraft(null);
        setFavoriteSearchValue('');
        setFavoriteInputKey((prev) => prev + 1);
    };

    const handleRemoveFavorite = (favoriteId: string) => {
        setFavorites((prev) => prev.filter((favorite) => favorite.id !== favoriteId));
    };

    const stopCount = trip.stops.length;
    const hasTripRoute = stopCount >= 2;
    const hasRemainingStop = currentStopIndex < stopCount;
    const nextStop = hasRemainingStop ? trip.stops[currentStopIndex] : null;
    const finalStop = stopCount > 0 ? trip.stops[stopCount - 1] : null;
    const navigationOrigin = currentLocation ?? trip.stops[Math.max(0, currentStopIndex - 1)]?.location ?? null;
    const currentLegDistanceKm = getRouteDistanceKm(navigationRoute, 0);
    const currentLegDurationMinutes = getRouteDurationMinutes(navigationRoute, 0);
    const currentLegSteps = getRouteSteps(navigationRoute, 0);
    const nextStep = currentLegSteps[0] ?? null;
    const estimatedArrivalTime = currentLegDurationMinutes > 0
        ? formatTime(new Date(Date.now() + currentLegDurationMinutes * 60_000))
        : '--';
    const elapsedTimeLabel = formatElapsedTime(elapsedTimeMs);
    const activeConveyParticipants = trip.convey?.participants.filter((participant) => participant.status === 'joined') ?? [];
    const recommendationLegKey = getNavigationLegKey(navigationOrigin, currentStopIndex, nextStop);
    const recommendationTimeLeftMs = recommendationSession?.expiresAt
        ? Math.max(0, recommendationSession.expiresAt - recommendationNowMs)
        : 0;
    const recommendationYesVotes = activeConveyParticipants.filter(
        (participant) => recommendationSession?.votes[participant.id] === 'yes'
    ).length;
    const recommendationNoVotes = activeConveyParticipants.filter(
        (participant) => recommendationSession?.votes[participant.id] === 'no'
    ).length;
    const recommendationPendingVotes = Math.max(
        0,
        activeConveyParticipants.length - recommendationYesVotes - recommendationNoVotes
    );

    const dismissRecommendationSession = useCallback(() => {
        setRecommendationSession(null);
        setRecommendationNowMs(Date.now());
    }, []);

    const finalizeRecommendationSession = useCallback((
        session: ActiveNavigationRecommendationSession,
        outcome: 'accepted' | 'rejected' | 'expired'
    ) => {
        offeredRecommendationLegsRef.current.add(session.legKey);
        const acceptedCandidate = session.candidate;

        if (outcome === 'accepted' && acceptedCandidate) {
            updateTrip((previousTrip) => {
                const targetIndex = previousTrip.stops.findIndex((stop) => stop.id === session.targetStopId);
                if (targetIndex < 0) return previousTrip;

                const recommendationStop: Stop = {
                    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: acceptedCandidate.name,
                    formattedAddress: acceptedCandidate.formattedAddress,
                    location: acceptedCandidate.location,
                    type: 'stop',
                    source: 'activity-recommendation',
                    category: acceptedCandidate.category,
                    description: acceptedCandidate.description,
                    rating: acceptedCandidate.rating,
                    googleMapsUri: acceptedCandidate.googleMapsUri,
                };

                const nextStops = [...previousTrip.stops];
                nextStops.splice(targetIndex, 0, recommendationStop);
                return {
                    ...previousTrip,
                    stops: retypeStops(nextStops),
                };
            });
            setNavigationNotice(`Added ${acceptedCandidate.name} to your route before ${session.targetStopName}.`);
        } else if (outcome === 'expired') {
            setNavigationNotice(`The detour recommendation for ${session.targetStopName} expired with no route change.`);
        }

        setRecommendationSession((current) => {
            if (!current || current.legKey !== session.legKey) return current;

            let resultLabel = 'Recommendation dismissed.';
            if (outcome === 'accepted') {
                resultLabel = `${session.candidate?.name || 'Recommendation'} added to your route.`;
            } else if (outcome === 'expired') {
                resultLabel = activeConveyParticipants.length > 0
                    ? 'Vote window ended. The route stays the same.'
                    : 'Recommendation expired. The route stays the same.';
            } else if (activeConveyParticipants.length > 0) {
                resultLabel = 'Vote did not pass. The route stays the same.';
            } else {
                resultLabel = 'Recommendation skipped.';
            }

            return {
                ...current,
                status: outcome,
                resultLabel,
            };
        });
    }, [activeConveyParticipants.length, retypeStops, updateTrip]);

    const handleVoteRecommendation = useCallback((participantId: string, vote: RecommendationVote) => {
        setRecommendationSession((current) => {
            if (!current || current.status !== 'awaitingDecision') return current;
            return {
                ...current,
                votes: {
                    ...current.votes,
                    [participantId]: vote,
                },
            };
        });
    }, []);

    const handleRejectRecommendation = useCallback(() => {
        if (!recommendationSession) return;
        finalizeRecommendationSession(recommendationSession, 'rejected');
    }, [finalizeRecommendationSession, recommendationSession]);

    const handleAcceptRecommendation = useCallback(() => {
        if (!recommendationSession) return;
        finalizeRecommendationSession(recommendationSession, 'accepted');
    }, [finalizeRecommendationSession, recommendationSession]);

    useEffect(() => {
        if (!isNavigating || !google || !navigationOrigin || !nextStop || !finalStop) return;

        let isCancelled = false;

        const intermediateStops = trip.stops
            .slice(currentStopIndex, Math.max(currentStopIndex, stopCount - 1))
            .map((stop) => stop.location);

        computeDrivingRoute(
            google,
            navigationOrigin,
            finalStop.location,
            intermediateStops
        )
            .then((route) => {
                if (!isCancelled) {
                    setNavigationRoute(route);
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    console.error('Failed to compute navigation route:', error);
                    setNavigationNotice('We could not refresh turn-by-turn guidance right now.');
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [currentStopIndex, finalStop, google, isNavigating, navigationOrigin, nextStop, stopCount, trip.stops]);

    useEffect(() => {
        if (!recommendationSession || recommendationSession.status !== 'awaitingDecision') return;

        setRecommendationNowMs(Date.now());
        const intervalId = window.setInterval(() => {
            setRecommendationNowMs(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [recommendationSession]);

    useEffect(() => {
        if (!recommendationSession || recommendationSession.status !== 'awaitingDecision') return;
        if (recommendationTimeLeftMs > 0) return;

        const outcome = activeConveyParticipants.length > 0 &&
            recommendationYesVotes > recommendationNoVotes + recommendationPendingVotes
            ? 'accepted'
            : 'expired';

        finalizeRecommendationSession(recommendationSession, outcome);
    }, [
        activeConveyParticipants.length,
        finalizeRecommendationSession,
        recommendationNoVotes,
        recommendationPendingVotes,
        recommendationSession,
        recommendationTimeLeftMs,
        recommendationYesVotes,
    ]);

    useEffect(() => {
        if (!recommendationSession || recommendationSession.status !== 'awaitingDecision') return;
        if (activeConveyParticipants.length === 0) return;
        if (recommendationPendingVotes > 0) return;

        finalizeRecommendationSession(
            recommendationSession,
            recommendationYesVotes > recommendationNoVotes ? 'accepted' : 'rejected'
        );
    }, [
        activeConveyParticipants.length,
        finalizeRecommendationSession,
        recommendationNoVotes,
        recommendationPendingVotes,
        recommendationSession,
        recommendationYesVotes,
    ]);

    useEffect(() => {
        if (!recommendationSession || recommendationSession.status === 'awaitingDecision') return;

        const timeoutId = window.setTimeout(() => {
            dismissRecommendationSession();
        }, 2500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [dismissRecommendationSession, recommendationSession]);

    useEffect(() => {
        if (!isNavigating || !google || !navigationRoute || !nextStop || !recommendationLegKey) return;
        if (currentLegDistanceKm < RECOMMENDATION_MIN_DISTANCE_KM &&
            currentLegDurationMinutes < RECOMMENDATION_MIN_DURATION_MINUTES) {
            return;
        }
        if (offeredRecommendationLegsRef.current.has(recommendationLegKey) || recommendationSession) {
            return;
        }

        let isCancelled = false;
        let displayTimer: number | undefined;

        displayTimer = window.setTimeout(async () => {
            if (isCancelled) return;

            setRecommendationSession({
                legKey: recommendationLegKey,
                targetStopId: nextStop.id,
                targetStopName: nextStop.name,
                status: 'loadingCandidate',
                votes: {},
            });

            try {
                const path = getRoutePath(navigationRoute).map((point) => new google.maps.LatLng(point));
                if (!path.length) {
                    setRecommendationSession(null);
                    return;
                }

                const midpoint = interpolatePath(path, 0.5);
                const preferredTypes = getRecommendationTypes(recommendationFilters);
                const response = await google.maps.places.Place.searchNearby({
                    fields: ['displayName', 'formattedAddress', 'location', 'rating', 'editorialSummary', 'googleMapsURI', 'primaryType'],
                    includedPrimaryTypes: preferredTypes,
                    locationRestriction: {
                        center: midpoint,
                        radius: 5000,
                    },
                    maxResultCount: RECOMMENDATION_MAX_NEARBY_RESULTS,
                    rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE,
                    language: 'en',
                    region: 'ph',
                });

                if (isCancelled) return;

                const existingNames = new Set(trip.stops.map((stop) => normalizeLabel(stop.name)));
                const candidate = (response.places ?? [])
                    .map((place) => toAppPlace(place))
                    .filter((place): place is AppPlace => Boolean(place))
                    .find((place) => {
                        const normalizedName = normalizeLabel(place.name);
                        if (existingNames.has(normalizedName)) return false;

                        return !trip.stops.some((stop) =>
                            getDistanceKmBetweenPoints(stop.location, place.location) <= RECOMMENDATION_DUPLICATE_RADIUS_KM
                        );
                    });

                if (!candidate) {
                    setRecommendationSession(null);
                    return;
                }

                const nextCandidate: RecommendationCandidate = {
                    id: candidate.id,
                    name: candidate.name,
                    formattedAddress: candidate.formattedAddress,
                    location: candidate.location,
                    category: getRecommendationCategoryLabel(candidate.primaryType),
                    description: candidate.summary,
                    rating: candidate.rating,
                    googleMapsUri: candidate.googleMapsUri,
                };
                const startedAt = Date.now();

                setRecommendationSession({
                    legKey: recommendationLegKey,
                    targetStopId: nextStop.id,
                    targetStopName: nextStop.name,
                    status: 'awaitingDecision',
                    candidate: nextCandidate,
                    startedAt,
                    expiresAt: startedAt + RECOMMENDATION_DECISION_WINDOW_MS,
                    votes: {},
                });
                setRecommendationNowMs(startedAt);
            } catch (error) {
                console.error('Failed to load an along-the-route recommendation:', error);
                if (!isCancelled) {
                    setRecommendationSession(null);
                }
            }
        }, RECOMMENDATION_DISPLAY_DELAY_MS);

        return () => {
            isCancelled = true;
            if (displayTimer) {
                window.clearTimeout(displayTimer);
            }
        };
    }, [
        currentLegDistanceKm,
        currentLegDurationMinutes,
        google,
        isNavigating,
        navigationRoute,
        nextStop,
        recommendationFilters,
        recommendationLegKey,
        recommendationSession,
        trip.stops,
    ]);

    const handleStartTrip = async () => {
        if (!hasTripRoute) return;

        setIsPreparingNavigation(true);
        setCurrentStopIndex(1);
        setNavigationRoute(null);
        setNavigationNotice(null);
        setTripStartedAt(Date.now());
        setElapsedTimeMs(0);
        setRecommendationSession(null);
        setRecommendationNowMs(Date.now());
        offeredRecommendationLegsRef.current = new Set();

        try {
            const liveLocation = await getGeolocation();
            setCurrentLocation(liveLocation);
            setNavigationNotice('Using your live location to guide you to the next stop.');
        } catch (error) {
            console.warn('Falling back to the planned trip origin for navigation:', error);
            setCurrentLocation(null);
            setNavigationNotice('Live location was unavailable, so navigation starts from your planned origin.');
        } finally {
            setIsNavigating(true);
            setIsPreparingNavigation(false);
        }
    };

    const handleExitNavigation = () => {
        setIsNavigating(false);
        setNavigationRoute(null);
        setNavigationNotice(null);
        setCurrentLocation(null);
        setCurrentStopIndex(1);
        setTripStartedAt(null);
        setElapsedTimeMs(0);
        setRecommendationSession(null);
        setRecommendationNowMs(Date.now());
        offeredRecommendationLegsRef.current = new Set();
    };

    const handleAdvanceToNextStop = () => {
        if (!hasRemainingStop || !nextStop) return;

        const nextIndex = currentStopIndex + 1;
        setCurrentLocation(nextStop.location);
        setRecommendationSession(null);
        setRecommendationNowMs(Date.now());

        if (nextIndex >= stopCount) {
            setNavigationNotice(`You have arrived at ${nextStop.name}.`);
            setCurrentStopIndex(nextIndex);
            setNavigationRoute(null);
            return;
        }

        setCurrentStopIndex(nextIndex);
        setNavigationNotice(`Marked ${nextStop.name} as completed. Routing you to the next stop.`);
    };

    // ── Summary calculations ───────────────────────────────────────────────────
    const totalDistanceKm = trip.stops.reduce((acc, s) => acc + (s.distanceFromPrevious || 0), 0);
    const totalDurationMins = trip.stops.reduce((acc, s) => acc + (s.durationFromPrevious || 0), 0);
    const totalHours = Math.floor(totalDurationMins / 60);
    const totalMinutes = totalDurationMins % 60;
    const gasEstimateL = totalDistanceKm > 0
        ? (totalDistanceKm / FUEL_EFFICIENCY_KM_PER_L).toFixed(1)
        : null;
    const needsBathroomBreak = totalDurationMins >= 180;
    const canRecommendPitstops = trip.stops.length >= 2;
    const selectedRecommendationCount = Object.values(recommendationFilters)
        .reduce((total, values) => total + values.length, 0);
    const addStopPrompt = trip.stops.length === 0
        ? {
            title: 'Use your current location',
            description: 'Your trip will start from this device. Allow location access, then add your final destination.',
            placeholder: '',
        }
        : trip.stops.length === 1
        ? {
            title: 'Add your final destination',
            description: 'Your second stop becomes the final destination. Once both ends are set, we can recommend pitstops along the drive.',
            placeholder: 'Enter your final destination',
        }
        : {
            title: 'Add a stop between the route',
            description: 'Add optional stops between your origin and destination. We will also recommend pitstops for longer drives.',
            placeholder: 'Add another stop or pitstop',
        };

    // ── Markers ───────────────────────────────────────────────────────────────
    const tripMarkers = trip.stops.map(s => ({
        position: s.location,
        title: s.name,
        color: getStopColor(s),
    }));
    const navigationMarkers = [
        ...tripMarkers,
        ...(currentLocation
            ? [{
                position: currentLocation,
                title: 'Your location',
                color: '#34a853',
            }]
            : []),
    ];
    const isConveyRecommendation = activeConveyParticipants.length > 0;
    const showRecommendationCard = Boolean(recommendationSession && nextStop);

    return (
        <div className="trip-planner-view">
            <div className="planner-sidebar">
                <div className="sidebar-header">
                    <h2>{isNavigating ? 'Navigating…' : 'My Trip Planner'}</h2>
                    <button className="close-btn" onClick={isNavigating ? handleExitNavigation : onClose}>
                        {isNavigating ? '←' : '×'}
                    </button>
                </div>

                <div className="planner-timeline-scroll">
                    {isNavigating ? (
                        <div className="navigation-instructions">
                            {navigationNotice && (
                                <div className="navigation-notice">{navigationNotice}</div>
                            )}
                            <div className="next-turn">
                                <span className="distance">
                                    {getInstructionDistance(nextStep) || `${currentLegDistanceKm} km`}
                                </span>
                                <span className="instruction">
                                    {nextStop
                                        ? stripInstructionMarkup(nextStep?.navigationInstruction?.instructions)
                                        : 'Trip complete'}
                                </span>
                                {nextStop && (
                                    <span className="instruction-meta">
                                        {currentLegDurationMinutes > 0 ? `${currentLegDurationMinutes} min to ` : 'Next stop: '}
                                        {nextStop.name}
                                    </span>
                                )}
                            </div>

                            {nextStop && (
                                <div className="navigation-summary-grid">
                                    <div className="nav-summary-item">
                                        <span className="label">Estimated Arrival</span>
                                        <span className="value">{estimatedArrivalTime}</span>
                                        <span className="subvalue">Elapsed {elapsedTimeLabel}</span>
                                    </div>
                                    <div className="nav-summary-item">
                                        <span className="label">Leg Distance</span>
                                        <span className="value">{currentLegDistanceKm} km</span>
                                    </div>
                                    <div className="nav-summary-item">
                                        <span className="label">Leg Time</span>
                                        <span className="value">{currentLegDurationMinutes} min</span>
                                    </div>
                                    <div className="nav-summary-item">
                                        <span className="label">Stops Left</span>
                                        <span className="value">{stopCount - currentStopIndex}</span>
                                    </div>
                                </div>
                            )}

                            {showRecommendationCard && recommendationSession && (
                                <div className={`route-recommendation-card route-recommendation-card--${recommendationSession.status}`}>
                                    <div className="route-recommendation-card__header">
                                        <div>
                                            <span className="route-recommendation-card__eyebrow">
                                                {isConveyRecommendation ? 'Convoy Detour Vote' : 'Detour Recommendation'}
                                            </span>
                                            <h4>
                                                {recommendationSession.status === 'loadingCandidate'
                                                    ? 'Finding something worth the detour'
                                                    : recommendationSession.candidate?.name || 'Checking nearby stops'}
                                            </h4>
                                        </div>
                                        {recommendationSession.status === 'awaitingDecision' && (
                                            <span className="route-recommendation-card__timer">
                                                {formatCountdown(recommendationTimeLeftMs)}
                                            </span>
                                        )}
                                    </div>

                                    {recommendationSession.candidate ? (
                                        <>
                                            <p className="route-recommendation-card__category">
                                                {recommendationSession.candidate.category || 'Things to do'}
                                                {typeof recommendationSession.candidate.rating === 'number'
                                                    ? ` • ${recommendationSession.candidate.rating.toFixed(1)}★`
                                                    : ''}
                                            </p>
                                            <p className="route-recommendation-card__address">
                                                {recommendationSession.candidate.formattedAddress || 'Along your current route'}
                                            </p>
                                            {recommendationSession.candidate.description && (
                                                <p className="route-recommendation-card__description">
                                                    {recommendationSession.candidate.description}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="route-recommendation-card__address">
                                            We are checking places between here and {recommendationSession.targetStopName}.
                                        </p>
                                    )}

                                    {recommendationSession.status === 'awaitingDecision' ? (
                                        isConveyRecommendation ? (
                                            <>
                                                <div className="route-recommendation-card__tally">
                                                    <span>Yes {recommendationYesVotes}</span>
                                                    <span>No {recommendationNoVotes}</span>
                                                    <span>Pending {recommendationPendingVotes}</span>
                                                </div>
                                                <div className="route-recommendation-votes">
                                                    {activeConveyParticipants.map((participant) => (
                                                        <div className="route-recommendation-vote-row" key={participant.id}>
                                                            <span className="route-recommendation-vote-row__name">
                                                                {participant.displayName}
                                                            </span>
                                                            <div className="route-recommendation-vote-row__actions">
                                                                <button
                                                                    type="button"
                                                                    className={recommendationSession.votes[participant.id] === 'yes'
                                                                        ? 'route-recommendation-vote-btn is-active'
                                                                        : 'route-recommendation-vote-btn'}
                                                                    onClick={() => handleVoteRecommendation(participant.id, 'yes')}
                                                                >
                                                                    Yes
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={recommendationSession.votes[participant.id] === 'no'
                                                                        ? 'route-recommendation-vote-btn is-active is-negative'
                                                                        : 'route-recommendation-vote-btn is-negative'}
                                                                    onClick={() => handleVoteRecommendation(participant.id, 'no')}
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="route-recommendation-card__actions">
                                                <button
                                                    type="button"
                                                    className="route-recommendation-primary-btn"
                                                    onClick={handleAcceptRecommendation}
                                                >
                                                    Add to Route
                                                </button>
                                                <button
                                                    type="button"
                                                    className="route-recommendation-secondary-btn"
                                                    onClick={handleRejectRecommendation}
                                                >
                                                    Not Now
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="route-recommendation-card__result">
                                            {recommendationSession.resultLabel}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="upcoming-stops">
                                <h4>{nextStop ? 'Next Stop' : 'Arrived'}</h4>
                                {nextStop ? (
                                    <StopCard
                                        stop={nextStop}
                                        index={currentStopIndex}
                                    />
                                ) : (
                                    <div className="navigation-complete-card">
                                        <strong>{finalStop?.name || 'Destination reached'}</strong>
                                        <p>Your planned route is complete.</p>
                                    </div>
                                )}
                            </div>

                            {currentLegSteps.length > 0 && nextStop && (
                                <div className="turn-list">
                                    <h4>Recommended Turns</h4>
                                    <div className="turn-list-items">
                                        {currentLegSteps.slice(0, 6).map((step, index) => (
                                            <div className="turn-list-item" key={`${currentStopIndex}-${index}`}>
                                                <span className="turn-order">{index + 1}</span>
                                                <div className="turn-copy">
                                                    <span className="turn-instruction">
                                                        {stripInstructionMarkup(step.navigationInstruction?.instructions)}
                                                    </span>
                                                    <span className="turn-meta">
                                                        {[getInstructionDistance(step), getInstructionDuration(step)].filter(Boolean).join(' • ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="navigation-actions">
                                {nextStop ? (
                                    <button className="start-trip-btn" onClick={handleAdvanceToNextStop}>
                                        Mark Stop as Reached
                                    </button>
                                ) : (
                                    <button className="start-trip-btn" onClick={handleExitNavigation}>
                                        Finish Trip
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="planner-timeline">
                                {trip.stops.length > 0 || isAddingStop ? (
                                    <>
                                        <Timeline
                                            trip={trip}
                                            onRemoveStop={handleRemoveStop}
                                            onEditStop={handleEditStop}
                                            onStopEdited={handleStopEdited}
                                            onReorder={handleReorder}
                                            editingStopId={editingStopId}
                                        />
                                        {isAddingStop ? (
                                            <div className="add-stop-input-container">
                                                <div className="add-stop-copy">
                                                    <h4>{addStopPrompt.title}</h4>
                                                    <p>{addStopPrompt.description}</p>
                                                </div>
                                                {trip.stops.length === 0 ? (
                                                    <div className="origin-location-panel">
                                                        <button
                                                            type="button"
                                                            className="use-current-location-btn"
                                                            onClick={() => void handleUseCurrentLocationAsOrigin()}
                                                            disabled={isUsingCurrentLocation}
                                                        >
                                                            {isUsingCurrentLocation ? 'Finding Your Location...' : 'Use My Current Location'}
                                                        </button>
                                                        <p className="origin-location-hint">
                                                            We will ask the browser for permission and use that point as your trip origin.
                                                        </p>
                                                        {originLocationError && (
                                                            <p className="origin-location-error">{originLocationError}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <PlaceAutocompleteInput
                                                        className="add-stop-input"
                                                        placeholder={addStopPrompt.placeholder}
                                                        onSelect={async (prediction) => {
                                                            const place = await fetchPlaceFromPrediction(prediction, BASIC_PLACE_FIELDS);
                                                            if (!place) return;
                                                            handleAddPlaceAsStop(place);
                                                        }}
                                                    />
                                                )}
                                                {favorites.length > 0 && (
                                                    <div className="favorite-shortcuts">
                                                        <span className="favorite-shortcuts__label">Quick picks</span>
                                                        <div className="favorite-shortcuts__list">
                                                            {favorites.map((favorite) => (
                                                                <button
                                                                    key={favorite.id}
                                                                    type="button"
                                                                    className="favorite-shortcut"
                                                                    onClick={() => handleAddPlaceAsStop(favorite.place)}
                                                                >
                                                                    {favorite.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <button className="cancel-add" onClick={() => setIsAddingStop(false)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="add-stop-btn inline" onClick={() => setIsAddingStop(true)}>
                                                + Add Stop
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="timeline-placeholder">
                                        <p>Set your origin first, then add your final destination.</p>
                                        <button className="add-stop-btn" onClick={() => setIsAddingStop(true)}>
                                            + Add Stop
                                        </button>
                                    </div>
                                )}

                                <ConveyPanel
                                    trip={trip}
                                    defaultOverlay={conveyDefaultOverlay}
                                    onOverlayHandled={onConveyOverlayHandled}
                                    onTripChange={updateTrip}
                                />

                                <div className="favorites-panel">
                                    <div className="favorites-panel__header">
                                        <div>
                                            <h3>Saved Places</h3>
                                            <p>Save labels like Home, Office, or Grandpa's Place for one-tap route planning.</p>
                                        </div>
                                    </div>

                                    <div className="favorites-panel__form">
                                        <input
                                            type="text"
                                            className="favorite-label-input"
                                            placeholder="Favorite label"
                                            value={favoriteLabel}
                                            onChange={(event) => setFavoriteLabel(event.target.value)}
                                        />
                                        <PlaceAutocompleteInput
                                            key={favoriteInputKey}
                                            className="favorite-place-input"
                                            placeholder="Search for a favorite address"
                                            defaultValue={favoriteSearchValue}
                                            onSelect={async (prediction) => {
                                                const place = await fetchPlaceFromPrediction(prediction, BASIC_PLACE_FIELDS);
                                                if (!place) return;
                                                setFavoritePlaceDraft(place);
                                                setFavoriteSearchValue(place.name);
                                            }}
                                        />
                                        <button
                                            className="favorite-save-btn"
                                            onClick={handleSaveFavorite}
                                            disabled={!favoriteLabel.trim() || !favoritePlaceDraft}
                                        >
                                            Save Favorite
                                        </button>
                                    </div>

                                    {favorites.length > 0 ? (
                                        <div className="favorite-chip-grid">
                                            {favorites.map((favorite) => (
                                                <div className="favorite-chip" key={favorite.id}>
                                                    <button
                                                        type="button"
                                                        className="favorite-chip__main"
                                                        onClick={() => handleAddPlaceAsStop(favorite.place)}
                                                    >
                                                        <span className="favorite-chip__label">{favorite.label}</span>
                                                        <span className="favorite-chip__address">
                                                            {favorite.place.formattedAddress || favorite.place.name}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="favorite-chip__remove"
                                                        onClick={() => handleRemoveFavorite(favorite.id)}
                                                        aria-label={`Remove ${favorite.label}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="favorites-empty">
                                            No saved places yet. Add one above to reuse it for your origin, destination, or extra stops.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="suggestions-teaser">
                                <h3>Route Recommendations</h3>
                                <p>
                                    {canRecommendPitstops
                                        ? selectedRecommendationCount > 0
                                            ? `With ${selectedRecommendationCount} travel preference${selectedRecommendationCount === 1 ? '' : 's'} selected, we will bias pitstop recommendations toward those needs along the drive.`
                                            : 'With an origin and final destination in place, we can recommend pitstops along the drive.'
                                        : 'Set your origin and final destination first, then we will recommend pitstops between them.'}
                                </p>
                            </div>

                            <FilterPanel onFilterChange={handleFilterChange} />
                        </>
                    )}
                </div>

                {!isNavigating && (
                    <div className="planner-footer">
                        <div className="planner-save-bar">
                            <div className="planner-save-copy">
                                <span className="planner-save-title">
                                    {isDirty
                                        ? isSavedTrip
                                            ? 'Unsaved trip changes'
                                            : 'Trip not saved yet'
                                        : isSavedTrip
                                        ? 'All trip changes saved'
                                        : 'Save this trip to Bookings'}
                                </span>
                                <span className="planner-save-description">
                                    {isDirty
                                        ? 'Save before leaving if you want these route updates available from Bookings.'
                                        : 'You can reopen this trip from Bookings and start it later with one tap.'}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="save-trip-btn"
                                onClick={() => onSaveTrip(trip)}
                                disabled={!isDirty && isSavedTrip}
                            >
                                {isSavedTrip ? (isDirty ? 'Save Changes' : 'Saved') : 'Save Trip'}
                            </button>
                        </div>

                        {trip.stops.length >= 2 && (
                            <div className="journey-summary">
                                <div className="summary-item">
                                    <span className="label">Total Distance</span>
                                    <span className="value">{totalDistanceKm} km</span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">Travel Time</span>
                                    <span className="value">{totalHours}h {totalMinutes}m</span>
                                </div>
                                {gasEstimateL && (
                                    <div className="summary-item">
                                        <span className="label">Est. Fuel</span>
                                        <span className="value">~{gasEstimateL} L</span>
                                    </div>
                                )}
                                <div className="summary-note">
                                    Pitstop recommendations appear automatically on longer drives.
                                </div>
                            </div>
                        )}

                        {needsBathroomBreak && (
                            <div className="bathroom-advisory">
                                🚻 Bathroom break recommended — trip is over 3 hours
                            </div>
                        )}

                        <button
                            className="start-trip-btn"
                            onClick={handleStartTrip}
                            disabled={!hasTripRoute || isPreparingNavigation}
                        >
                            {isPreparingNavigation
                                ? 'Preparing Navigation...'
                                : hasTripRoute
                                ? 'Start Trip'
                                : 'Add Destination to Start'}
                        </button>
                    </div>
                )}
            </div>

            <div className="planner-map-container">
                <Map
                    center={
                        currentLocation ||
                        trip.stops[trip.stops.length - 1]?.location ||
                        { lat: 14.5995, lng: 120.9842 }
                    }
                    zoom={12}
                    markers={isNavigating ? navigationMarkers : tripMarkers}
                    directions={isNavigating ? navigationRoute : null}
                />
            </div>
        </div>
    );
};

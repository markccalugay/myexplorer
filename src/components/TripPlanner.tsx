import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map from './Map';
import { Timeline } from './Timeline';
import { StopCard } from './StopCard';
import { FilterPanel } from './FilterPanel';
import { Trip, Stop } from '../types/trip';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { BASIC_PLACE_FIELDS, toAppPlace, fetchPlaceFromPrediction } from '../lib/googlePlaces';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { getStopColor } from '../lib/stopColors';
import { computeDrivingRoute, getRouteDistanceKm, getRouteDurationMinutes, getRoutePath } from '../lib/googleRoutes';
import './TripPlanner.css';

interface TripPlannerProps {
    trip: Trip;
    onClose: () => void;
}

// Average fuel efficiency assumed for estimation
const FUEL_EFFICIENCY_KM_PER_L = 12;

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

export const TripPlanner: React.FC<TripPlannerProps> = ({ trip: initialTrip, onClose }) => {
    const [trip, setTrip] = useState<Trip>(initialTrip);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [editingStopId, setEditingStopId] = useState<string | null>(null);
    const { google } = useGoogleMaps();
    const autoPitstopRouteKeyRef = useRef<string | null>(null);

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

                setTrip((prev) => (
                    hasJourneyDetailsChanged(prev.stops, newStops)
                        ? { ...prev, stops: newStops }
                        : prev
                ));
            })
            .catch((error) => {
                console.error('Failed to calculate trip segment details:', error);
            });
    }, [google]);

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
                    setTrip((prev) => ({ ...prev, stops: retypeStops(baseStops) }));
                    return;
                }

                const path = getRoutePath(route).map((point) => new google.maps.LatLng(point));
                if (!path.length) {
                    autoPitstopRouteKeyRef.current = routeKey;
                    setTrip((prev) => ({ ...prev, stops: retypeStops(baseStops) }));
                    return;
                }

                const fractions = durationMins >= 180 ? [1 / 3, 2 / 3] : [1 / 2];

                const pitstopPromises = fractions.map(
                    (fraction) =>
                        new Promise<Stop | null>(async (resolve) => {
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
                                    resolve(null);
                                    return;
                                }

                                const pitstop: Stop = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    name: appPlace.name,
                                    formattedAddress: appPlace.formattedAddress,
                                    location: appPlace.location,
                                    type: 'stop',
                                    isAutoSuggested: true,
                                    category: 'Gas Station',
                                };
                                resolve(pitstop);
                            } catch (error) {
                                console.error('Failed to load an auto-suggested pitstop:', error);
                                resolve(null);
                            }
                        })
                );

                Promise.all(pitstopPromises).then((pitstops) => {
                    const valid = pitstops
                        .filter((pitstop): pitstop is Stop => Boolean(pitstop))
                        .filter(
                            (pitstop, index, list) =>
                                list.findIndex(
                                    (candidate) =>
                                        candidate.location.lat === pitstop.location.lat &&
                                        candidate.location.lng === pitstop.location.lng
                                ) === index
                        );

                    setTrip(prev => {
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
    }, [google, getEndpointRouteKey, retypeStops, stripAutoSuggestedStops]);

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
        setTrip(prev => {
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
        setTrip(prev => {
            const newStops = prev.stops.map(s => (s.id === id ? updated : s));
            const retyped = retypeStops(newStops);
            if (retyped.length >= 2) calculateJourneyDetails(retyped);
            return { ...prev, stops: retyped };
        });
    };

    const handleReorder = (newStops: Stop[]) => {
        setTrip(prev => ({ ...prev, stops: newStops }));
        if (newStops.length >= 2) calculateJourneyDetails(newStops);
    };

    const handleFilterChange = (category: string, value: string) => {
        console.log(`Filter: ${category} = ${value}`);
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
    const addStopPrompt = trip.stops.length === 0
        ? {
            title: 'Add your origin',
            description: 'Your first stop becomes the starting point for the trip.',
            placeholder: 'Enter your origin',
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

    return (
        <div className="trip-planner-view">
            <div className="planner-sidebar">
                <div className="sidebar-header">
                    <h2>{isNavigating ? 'Navigating…' : 'My Trip Planner'}</h2>
                    <button className="close-btn" onClick={isNavigating ? () => setIsNavigating(false) : onClose}>
                        {isNavigating ? '←' : '×'}
                    </button>
                </div>

                <div className="planner-timeline-scroll">
                    {isNavigating ? (
                        <div className="navigation-instructions">
                            <div className="next-turn">
                                <span className="distance">500m</span>
                                <span className="instruction">Turn right onto EDSA</span>
                            </div>
                            <div className="upcoming-stops">
                                <h4>Next Stop</h4>
                                {trip.stops[1] && (
                                    <StopCard
                                        stop={trip.stops[1]}
                                        index={1}
                                    />
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
                                                <PlaceAutocompleteInput
                                                    className="add-stop-input"
                                                    placeholder={addStopPrompt.placeholder}
                                                    onSelect={async (prediction) => {
                                                        const place = await fetchPlaceFromPrediction(prediction, BASIC_PLACE_FIELDS);
                                                        if (!place) return;

                                                        const isFirst = trip.stops.length === 0;
                                                        const stopType: Stop['type'] = isFirst ? 'start' : 'stop';

                                                        const newStop: Stop = {
                                                            id: Math.random().toString(36).substr(2, 9),
                                                            name: place.name,
                                                            formattedAddress: place.formattedAddress,
                                                            location: place.location,
                                                            type: stopType,
                                                        };

                                                        setTrip(prev => {
                                                            const updated = [...prev.stops, newStop];
                                                            const retyped = retypeStops(updated);
                                                            return { ...prev, stops: retyped };
                                                        });
                                                        setIsAddingStop(false);
                                                    }}
                                                />
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
                            </div>

                            <div className="suggestions-teaser">
                                <h3>Route Recommendations</h3>
                                <p>
                                    {canRecommendPitstops
                                        ? 'With an origin and final destination in place, we can recommend pitstops along the drive.'
                                        : 'Set your origin and final destination first, then we will recommend pitstops between them.'}
                                </p>
                            </div>

                            <FilterPanel onFilterChange={handleFilterChange} />
                        </>
                    )}
                </div>

                {!isNavigating && (
                    <div className="planner-footer">
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

                        <button className="start-trip-btn" onClick={() => setIsNavigating(true)}>
                            Start Trip
                        </button>
                    </div>
                )}
            </div>

            <div className="planner-map-container">
                <Map
                    center={
                        trip.stops[trip.stops.length - 1]?.location || { lat: 14.5995, lng: 120.9842 }
                    }
                    zoom={12}
                    markers={tripMarkers}
                />
            </div>
        </div>
    );
};

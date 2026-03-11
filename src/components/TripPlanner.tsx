import React, { useState, useRef, useEffect, useCallback } from 'react';
import Map from './Map';
import { Timeline } from './Timeline';
import { StopCard } from './StopCard';
import { FilterPanel } from './FilterPanel';
import { Trip, Stop } from '../types/trip';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
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

export const TripPlanner: React.FC<TripPlannerProps> = ({ trip: initialTrip, onClose }) => {
    const [trip, setTrip] = useState<Trip>(initialTrip);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [editingStopId, setEditingStopId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { google } = useGoogleMaps();

    // ── Add stop Autocomplete ──────────────────────────────────────────────────
    useEffect(() => {
        if (!google || !isAddingStop || !searchInputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'ph' },
            fields: ['geometry', 'name', 'place_id', 'formatted_address'],
        });

        const listener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const isFirst = trip.stops.length === 0;
                // Determine type: first stop = start, subsequent = stop until destination assigned
                const stopType: Stop['type'] = isFirst ? 'start' : 'stop';

                const newStop: Stop = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: place.name || place.formatted_address || 'Unknown',
                    formattedAddress: place.formatted_address,
                    location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    },
                    type: stopType,
                };

                setTrip(prev => {
                    const updated = [...prev.stops, newStop];
                    // Always mark last stop as destination when there are ≥ 2 stops
                    const retyped = retypeStops(updated);
                    return { ...prev, stops: retyped };
                });
                setIsAddingStop(false);
            }
        });

        searchInputRef.current.focus();
        return () => { google.maps.event.removeListener(listener); };
    }, [google, isAddingStop]);

    // ── Retype stops so first=start, last=destination ─────────────────────────
    const retypeStops = (stops: Stop[]): Stop[] => {
        if (stops.length === 0) return stops;
        return stops.map((s, i) => {
            if (i === 0) return { ...s, type: 'start' };
            if (i === stops.length - 1) return { ...s, type: 'destination' };
            return { ...s, type: 'stop' };
        });
    };

    // ── Recalculate journey times + distances ──────────────────────────────────
    const calculateJourneyDetails = useCallback((stops: Stop[]) => {
        if (!google || stops.length < 2) return;

        const service = new google.maps.DistanceMatrixService();
        const origins = stops.slice(0, -1).map(s => s.location);
        const destinations = stops.slice(1).map(s => s.location);

        service.getDistanceMatrix(
            { origins, destinations, travelMode: google.maps.TravelMode.DRIVING },
        (response: google.maps.DistanceMatrixResponse | null, status: google.maps.DistanceMatrixStatus) => {
                if (status === google.maps.DistanceMatrixStatus.OK && response) {
                    const newStops = [...stops];
                    let currentTime = new Date();
                    currentTime.setHours(8, 0, 0, 0);
                    newStops[0].arrivalTime = formatTime(currentTime);

                    for (let i = 0; i < response.rows.length; i++) {
                        const el = response.rows[i].elements[i];
                        if (el.status === 'OK') {
                            const distKm = Math.round(el.distance.value / 1000);
                            const durMins = Math.round(el.duration.value / 60);
                            newStops[i + 1].distanceFromPrevious = distKm;
                            newStops[i + 1].durationFromPrevious = durMins;
                            currentTime = new Date(currentTime.getTime() + (durMins + 30) * 60_000);
                            newStops[i + 1].arrivalTime = formatTime(currentTime);
                        }
                    }
                    setTrip(prev => ({ ...prev, stops: newStops }));
                }
            }
        );
    }, [google]);

    // ── Auto-pitstop injection ─────────────────────────────────────────────────
    const autoInsertPitstops = useCallback((stops: Stop[]) => {
        if (!google || stops.length < 2) return;

        const start = stops[0];
        const dest = stops[stops.length - 1];

        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
            {
                origin: start.location,
                destination: dest.location,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
                if (status !== google.maps.DirectionsStatus.OK || !result) return;

                const leg = result.routes[0].legs[0];
                const durationMins = Math.round(leg.duration!.value / 60);

                // Only insert pitstops for trips > 90 minutes
                if (durationMins < 90) return;

                const path = result.routes[0].overview_path;
                const fractions = durationMins >= 180 ? [1 / 3, 2 / 3] : [1 / 2];

                const placesService = new google.maps.places.PlacesService(
                    document.createElement('div')
                );

                const pitstopPromises = fractions.map(
                    (fraction) =>
                        new Promise<Stop | null>((resolve) => {
                            const midpoint = interpolatePath(path, fraction);
                            placesService.nearbySearch(
                                {
                                    location: midpoint,
                                    radius: 5000,
                                    type: 'gas_station',
                                    rankBy: google.maps.places.RankBy.DISTANCE,
                                },
                                (results: google.maps.places.PlaceResult[] | null, psStatus: google.maps.places.PlacesServiceStatus) => {
                                    if (
                                        psStatus === google.maps.places.PlacesServiceStatus.OK &&
                                        results &&
                                        results.length > 0
                                    ) {
                                        const place = results[0];
                                        const loc = place.geometry?.location;
                                        if (!loc) { resolve(null); return; }

                                        // Fetch full details to get formatted_address
                                        placesService.getDetails(
                                            {
                                                placeId: place.place_id!,
                                                fields: ['name', 'geometry', 'formatted_address', 'place_id'],
                                            },
                                            (detail: google.maps.places.PlaceResult | null, detailStatus: google.maps.places.PlacesServiceStatus) => {
                                                if (
                                                    detailStatus === google.maps.places.PlacesServiceStatus.OK &&
                                                    detail
                                                ) {
                                                    const pitstop: Stop = {
                                                        id: Math.random().toString(36).substr(2, 9),
                                                        name: detail.name || place.name || 'Pitstop',
                                                        formattedAddress: detail.formatted_address,
                                                        location: {
                                                            lat: detail.geometry!.location!.lat(),
                                                            lng: detail.geometry!.location!.lng(),
                                                        },
                                                        type: 'stop',
                                                        isAutoSuggested: true,
                                                        category: 'Gas Station',
                                                    };
                                                    resolve(pitstop);
                                                } else {
                                                    resolve(null);
                                                }
                                            }
                                        );
                                    } else {
                                        resolve(null);
                                    }
                                }
                            );
                        })
                );

                Promise.all(pitstopPromises).then((pitstops) => {
                    const valid = pitstops.filter(Boolean) as Stop[];
                    if (valid.length === 0) return;

                    setTrip(prev => {
                        // Insert pitstops between start and destination, preserving any manually-added stops
                        const manualStops = prev.stops.filter(
                            s => !s.isAutoSuggested && s.type === 'stop'
                        );
                        const newStops = [
                            prev.stops[0],           // start
                            ...manualStops,           // manually added
                            ...valid,                 // auto-suggested
                            prev.stops[prev.stops.length - 1], // destination
                        ];
                        const retyped = retypeStops(newStops);
                        calculateJourneyDetails(retyped);
                        return { ...prev, stops: retyped };
                    });
                });
            }
        );
    }, [google, calculateJourneyDetails]);

    // Trigger calculations whenever stops change (≥ 2)
    useEffect(() => {
        if (!google || trip.stops.length < 2) return;
        calculateJourneyDetails(trip.stops);
    }, [google, trip.stops.length]);

    // Trigger auto-pitstop insertion when we have exactly start + destination
    useEffect(() => {
        if (!google || trip.stops.length < 2) return;
        const hasStart = trip.stops[0]?.type === 'start';
        const hasDest = trip.stops[trip.stops.length - 1]?.type === 'destination';
        const hasAutoStop = trip.stops.some(s => s.isAutoSuggested);
        if (hasStart && hasDest && !hasAutoStop) {
            autoInsertPitstops(trip.stops);
        }
    }, [google, trip.stops.length]);

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

    // ── Markers ───────────────────────────────────────────────────────────────
    const tripMarkers = trip.stops.map(s => ({
        position: s.location,
        title: s.name,
        icon:
            s.type === 'start'
                ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                : s.type === 'destination'
                ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                : s.isAutoSuggested
                ? 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'
                : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
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
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Where to next?"
                                                    className="add-stop-input"
                                                    autoFocus
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
                                        <p>Your journey starts here.</p>
                                        <button className="add-stop-btn" onClick={() => setIsAddingStop(true)}>
                                            + Add Stop
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="suggestions-teaser">
                                <h3>Pitstop Suggestions</h3>
                                <p>Refine your journey experience along the route.</p>
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

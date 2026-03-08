import React, { useState, useRef, useEffect } from 'react';
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

export const TripPlanner: React.FC<TripPlannerProps> = ({ trip: initialTrip, onClose }) => {
    const [trip, setTrip] = useState<Trip>(initialTrip);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && isAddingStop && searchInputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
                componentRestrictions: { country: "ph" },
                fields: ["geometry", "name", "place_id", "formatted_address"]
            });

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (place.geometry?.location) {
                    const newStop: Stop = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: place.name || "Unknown",
                        location: {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        },
                        type: trip.stops.length === 0 ? 'start' : 'stop',
                    };

                    setTrip(prev => ({
                        ...prev,
                        stops: [...prev.stops, newStop]
                    }));
                    setIsAddingStop(false);
                }
            });
        }
    }, [google, isAddingStop, trip.stops.length]);

    useEffect(() => {
        if (google && trip.stops.length >= 2) {
            calculateJourneyDetails();
        }
    }, [google, trip.stops.length]);

    const calculateJourneyDetails = async () => {
        if (!google) return;
        const service = new google.maps.DistanceMatrixService();

        const origins = trip.stops.slice(0, -1).map(s => s.location);
        const destinations = trip.stops.slice(1).map(s => s.location);

        service.getDistanceMatrix({
            origins,
            destinations,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (response: google.maps.DistanceMatrixResponse | null, status: google.maps.DistanceMatrixStatus) => {
            if (status === google.maps.DistanceMatrixStatus.OK && response) {
                const newStops = [...trip.stops];
                let currentTime = new Date();
                currentTime.setHours(8, 0, 0);

                newStops[0].arrivalTime = formatTime(currentTime);

                for (let i = 0; i < response.rows.length; i++) {
                    const result = response.rows[i].elements[i];
                    if (result.status === 'OK') {
                        const distanceKm = Math.round(result.distance.value / 1000);
                        const durationMins = Math.round(result.duration.value / 60);

                        newStops[i + 1].distanceFromPrevious = distanceKm;
                        newStops[i + 1].durationFromPrevious = durationMins;

                        currentTime = new Date(currentTime.getTime() + (durationMins + 30) * 60000);
                        newStops[i + 1].arrivalTime = formatTime(currentTime);
                    }
                }
                setTrip(prev => ({ ...prev, stops: newStops }));
            }
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleRemoveStop = (id: string) => {
        setTrip(prev => ({
            ...prev,
            stops: prev.stops.filter((s: Stop) => s.id !== id)
        }));
    };

    const handleAddStopClick = () => {
        setIsAddingStop(true);
    };

    const handleStartTrip = () => {
        setIsNavigating(true);
    };

    const handleStopNavigation = () => {
        setIsNavigating(false);
    };

    const handleFilterChange = (category: string, value: string) => {
        console.log(`Filter changed: ${category} = ${value}`);
    };

    return (
        <div className="trip-planner-view">
            <div className="planner-sidebar">
                <div className="sidebar-header">
                    <h2>{isNavigating ? 'Navigating...' : 'My Trip Planner'}</h2>
                    <button className="close-btn" onClick={isNavigating ? handleStopNavigation : onClose}>
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
                                {trip.stops[1] && <StopCard stop={trip.stops[1]} index={1} />}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="planner-timeline">
                                {trip.stops.length > 0 || isAddingStop ? (
                                    <>
                                        <Timeline trip={trip} onRemoveStop={handleRemoveStop} />
                                        {isAddingStop ? (
                                            <div className="add-stop-input-container">
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Where to next?"
                                                    className="add-stop-input"
                                                    autoFocus
                                                />
                                                <button className="cancel-add" onClick={() => setIsAddingStop(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className="add-stop-btn inline" onClick={handleAddStopClick}>+ Add Stop</button>
                                        )}
                                    </>
                                ) : (
                                    <div className="timeline-placeholder">
                                        <p>Your journey starts here.</p>
                                        <button className="add-stop-btn" onClick={handleAddStopClick}>+ Add Stop</button>
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
                                    <span className="value">{trip.stops.reduce((acc, s) => acc + (s.distanceFromPrevious || 0), 0)} km</span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">Travel Time</span>
                                    <span className="value">
                                        {Math.floor(trip.stops.reduce((acc, s) => acc + (s.durationFromPrevious || 0), 0) / 60)}h {trip.stops.reduce((acc, s) => acc + (s.durationFromPrevious || 0), 0) % 60}m
                                    </span>
                                </div>
                            </div>
                        )}
                        <button className="start-trip-btn" onClick={handleStartTrip}>Start Trip</button>
                    </div>
                )}
            </div>

            <div className="planner-map-container">
                <Map
                    center={trip.stops[trip.stops.length - 1]?.location || { lat: 14.5995, lng: 120.9842 }}
                    zoom={12}
                    markers={trip.stops.map((s: Stop) => ({
                        position: s.location,
                        title: s.name,
                        icon: s.type === 'start' ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' :
                            s.type === 'destination' ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
                                'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }))}
                />
            </div>
        </div>
    );
};

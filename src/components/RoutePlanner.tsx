import React, { useRef, useEffect } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './RoutePlanner.css';

interface RoutePlannerProps {
    destination: google.maps.places.PlaceResult;
    onClose: () => void;
    onRouteFound: (result: google.maps.DirectionsResult) => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ destination, onClose, onRouteFound }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && inputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                componentRestrictions: { country: "ph" },
                fields: ["geometry", "name"]
            });

            autocomplete.addListener("place_changed", () => {
                const startPlace = autocomplete.getPlace();
                if (startPlace.geometry?.location) {
                    calculateRoute(startPlace.geometry.location);
                }
            });
        }
    }, [google]);

    const calculateRoute = (origin: google.maps.LatLng) => {
        if (!google || !destination.geometry?.location) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
            {
                origin: origin,
                destination: destination.geometry.location,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    onRouteFound(result);
                } else {
                    console.error("Directions request failed due to " + status);
                }
            }
        );
    };

    return (
        <div className="route-planner-panel">
            <div className="planner-header">
                <h3>Plan Your Trip</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="planner-body">
                <p>To: <strong>{destination.name}</strong></p>
                <div className="input-group">
                    <label>Starting Point</label>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter start location (e.g. Manila)"
                        className="route-input"
                    />
                </div>
            </div>
        </div>
    );
};

import React, { useRef, useEffect, useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './RoutePlanner.css';

interface RoutePlannerProps {
    destination: google.maps.places.PlaceResult;
    onClose: () => void;
    onRouteFound: (result: google.maps.DirectionsResult) => void;
}

const COMMON_ORIGINS = [
    { label: "Manila City", lat: 14.5995, lng: 120.9842 },
    { label: "Makati City", lat: 14.5547, lng: 121.0244 },
    { label: "Quezon City", lat: 14.6760, lng: 121.0437 },
    { label: "Cebu City", lat: 10.3157, lng: 123.8854 },
    { label: "Davao City", lat: 7.1907, lng: 125.4553 }
];

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ destination: initialDestination, onClose, onRouteFound }) => {
    const originInputRef = useRef<HTMLInputElement>(null);
    const destInputRef = useRef<HTMLInputElement>(null);
    const { google } = useGoogleMaps();

    const [origin, setOrigin] = useState<google.maps.LatLng | google.maps.LatLngLiteral | null>(null);
    const [destination, setDestination] = useState<google.maps.places.PlaceResult>(initialDestination);

    useEffect(() => {
        if (google && originInputRef.current && destInputRef.current) {
            const originAutocomplete = new google.maps.places.Autocomplete(originInputRef.current, {
                componentRestrictions: { country: "ph" },
                fields: ["geometry", "name"]
            });

            const destAutocomplete = new google.maps.places.Autocomplete(destInputRef.current, {
                componentRestrictions: { country: "ph" },
                fields: ["geometry", "name", "place_id", "formatted_address", "photos", "rating", "vicinity"]
            });

            originAutocomplete.addListener("place_changed", () => {
                const place = originAutocomplete.getPlace();
                if (place.geometry?.location) {
                    setOrigin(place.geometry.location);
                }
            });

            destAutocomplete.addListener("place_changed", () => {
                const place = destAutocomplete.getPlace();
                if (place.geometry?.location) {
                    setDestination(place);
                }
            });
        }
    }, [google]);

    useEffect(() => {
        if (origin && destination.geometry?.location) {
            calculateRoute(origin, destination.geometry.location);
        }
    }, [origin, destination]);

    const calculateRoute = (start: google.maps.LatLng | google.maps.LatLngLiteral, end: google.maps.LatLng | google.maps.LatLngLiteral) => {
        if (!google) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
            {
                origin: start,
                destination: end,
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

    const handleQuickOrigin = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            const selected = COMMON_ORIGINS.find(o => o.label === val);
            if (selected) {
                const loc = { lat: selected.lat, lng: selected.lng };
                setOrigin(loc);
                if (originInputRef.current) originInputRef.current.value = selected.label;
            }
        }
    };

    return (
        <div className="route-planner-panel">
            <div className="planner-header">
                <h3>Route Options</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="planner-body">
                <div className="input-group">
                    <label>Quick Start</label>
                    <select className="route-select" onChange={handleQuickOrigin}>
                        <option value="">Select a common starting point</option>
                        {COMMON_ORIGINS.map(o => (
                            <option key={o.label} value={o.label}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label>Starting Point</label>
                    <input
                        ref={originInputRef}
                        type="text"
                        placeholder="Search for start location"
                        className="route-input"
                    />
                </div>

                <div className="input-divider">
                    <div className="line"></div>
                    <span>to</span>
                    <div className="line"></div>
                </div>

                <div className="input-group">
                    <label>Destination</label>
                    <input
                        ref={destInputRef}
                        type="text"
                        placeholder="Search for destination"
                        defaultValue={destination.name}
                        className="route-input"
                    />
                </div>
            </div>
        </div>
    );
};

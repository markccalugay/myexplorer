import React, { useCallback, useEffect, useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './RoutePlanner.css';
import { AppPlace } from '../types/place';
import { BASIC_PLACE_FIELDS, fetchPlaceFromPrediction } from '../lib/googlePlaces';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { AppRoute } from '../lib/googleRoutes';
import { createGoogleMapsRouteProvider } from '../platform/routing/googleMapsRouteProvider';
import type { GeoPoint } from '../types/geo';

interface RoutePlannerProps {
    destination: AppPlace;
    onClose: () => void;
    onRouteFound: (result: AppRoute) => void;
}

const COMMON_ORIGINS = [
    { label: "Manila City", lat: 14.5995, lng: 120.9842 },
    { label: "Makati City", lat: 14.5547, lng: 121.0244 },
    { label: "Quezon City", lat: 14.6760, lng: 121.0437 },
    { label: "Cebu City", lat: 10.3157, lng: 123.8854 },
    { label: "Davao City", lat: 7.1907, lng: 125.4553 }
];

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ destination: initialDestination, onClose, onRouteFound }) => {
    const { google } = useGoogleMaps();
    const routeProvider = createGoogleMapsRouteProvider(google);

    const [origin, setOrigin] = useState<GeoPoint | null>(null);
    const [destination, setDestination] = useState<AppPlace>(initialDestination);

    const calculateRoute = useCallback((start: GeoPoint, end: GeoPoint) => {
        if (!routeProvider) return;

        routeProvider.computeDrivingRoute(start, end)
            .then((route) => {
                if (route) {
                    onRouteFound(route);
                } else {
                    console.error('Routes API returned no route.');
                }
            })
            .catch((error) => {
                console.error('Routes request failed:', error);
            });
    }, [onRouteFound, routeProvider]);

    useEffect(() => {
        if (origin) {
            calculateRoute(origin, destination.location);
        }
    }, [calculateRoute, destination.location, origin]);

    const handleQuickOrigin = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            const selected = COMMON_ORIGINS.find(o => o.label === val);
            if (selected) {
                const loc = { lat: selected.lat, lng: selected.lng };
                setOrigin(loc);
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
                    <PlaceAutocompleteInput
                        className="route-input"
                        placeholder="Search for start location"
                        defaultValue=""
                        onSelect={async (prediction) => {
                            const place = await fetchPlaceFromPrediction(prediction, BASIC_PLACE_FIELDS);
                            if (place) {
                                setOrigin(place.location);
                            }
                        }}
                    />
                </div>

                <div className="input-divider">
                    <div className="line"></div>
                    <span>to</span>
                    <div className="line"></div>
                </div>

                <div className="input-group">
                    <label>Destination</label>
                    <PlaceAutocompleteInput
                        className="route-input"
                        placeholder="Search for destination"
                        defaultValue={destination.name}
                        onSelect={async (prediction) => {
                            const place = await fetchPlaceFromPrediction(prediction);
                            if (place) {
                                setDestination(place);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

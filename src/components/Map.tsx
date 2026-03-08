import React, { useRef, useEffect } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './SearchBar.css';

interface MapProps {
    center?: google.maps.LatLngLiteral;
    zoom?: number;
    markers?: google.maps.MarkerOptions[];
    onMarkerClick?: (marker: google.maps.Marker) => void;
    directions?: google.maps.DirectionsResult | null;
}

const Map: React.FC<MapProps> = ({
    center = { lat: 14.5995, lng: 120.9842 }, // Manila
    zoom = 10,
    markers = [],
    onMarkerClick,
    directions
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && mapRef.current && !googleMapRef.current) {
            googleMapRef.current = new google.maps.Map(mapRef.current, {
                center,
                zoom,
                styles: [
                    {
                        "featureType": "poi",
                        "elementType": "labels",
                        "stylers": [{ "visibility": "off" }]
                    }
                ],
                disableDefaultUI: false,
                zoomControl: true,
            });

            directionsRendererRef.current = new google.maps.DirectionsRenderer({
                map: googleMapRef.current,
                suppressMarkers: false,
            });
        }
    }, [google, center, zoom]);

    useEffect(() => {
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(directions || null);
        }
    }, [directions]);

    useEffect(() => {
        if (google && googleMapRef.current) {
            // Add markers logic
            markers.forEach((options: google.maps.MarkerOptions) => {
                const marker = new google.maps.Marker({
                    ...options,
                    map: googleMapRef.current
                });

                if (onMarkerClick) {
                    marker.addListener('click', () => {
                        onMarkerClick(marker);
                    });
                }
            });
        }
    }, [google, markers, onMarkerClick]);

    useEffect(() => {
        if (googleMapRef.current) {
            googleMapRef.current.setCenter(center);
            googleMapRef.current.setZoom(zoom);
        }
    }, [center, zoom]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default Map;

import React, { useRef, useEffect } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { AppRoute, getRoutePath } from '../lib/googleRoutes';
import './SearchBar.css';

interface MapMarker {
    position: google.maps.LatLngLiteral;
    title?: string;
    placeId?: string;
    color?: string;
}

interface MapProps {
    center?: google.maps.LatLngLiteral;
    zoom?: number;
    markers?: MapMarker[];
    onMarkerClick?: (marker: MapMarker) => void;
    directions?: AppRoute | null;
}

const MAP_INLINE_STYLES: google.maps.MapTypeStyle[] = [
    {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    }
];

const Map: React.FC<MapProps> = ({
    center = { lat: 14.5995, lng: 120.9842 }, // Manila
    zoom = 10,
    markers = [],
    onMarkerClick,
    directions
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const markerRefs = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const routePolylineRef = useRef<google.maps.Polyline | null>(null);
    const { google } = useGoogleMaps();
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

    useEffect(() => {
        if (google && mapRef.current && !googleMapRef.current) {
            googleMapRef.current = new google.maps.Map(mapRef.current, {
                center,
                zoom,
                mapId,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: 'cooperative',
            });
        }
    }, [google, center, zoom, mapId]);

    useEffect(() => {
        if (!googleMapRef.current) return;

        if (mapId) {
            googleMapRef.current.setOptions({ styles: null });
            return;
        }

        googleMapRef.current.setOptions({ styles: MAP_INLINE_STYLES });
    }, [mapId]);

    useEffect(() => {
        if (!google || !googleMapRef.current) return;

        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
        }

        const path = getRoutePath(directions);
        if (!path.length) return;

        routePolylineRef.current = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#1a73e8',
            strokeOpacity: 0.85,
            strokeWeight: 5,
            map: googleMapRef.current,
        });

        const bounds = new google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        if (!bounds.isEmpty()) {
            googleMapRef.current.fitBounds(bounds, 64);
        }
    }, [directions, google]);

    useEffect(() => {
        if (google && googleMapRef.current) {
            markerRefs.current.forEach((marker) => {
                marker.map = null;
            });
            markerRefs.current = [];

            markers.forEach((options) => {
                const pin = new google.maps.marker.PinElement({
                    background: options.color || '#d93025',
                    borderColor: '#1f1f1f',
                    glyphColor: '#ffffff',
                });

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: options.position,
                    title: options.title,
                    content: pin,
                    map: googleMapRef.current
                });
                markerRefs.current.push(marker);

                if (onMarkerClick) {
                    marker.addListener('click', () => {
                        onMarkerClick(options);
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

    useEffect(() => {
        return () => {
            markerRefs.current.forEach((marker) => {
                marker.map = null;
            });
            if (routePolylineRef.current) {
                routePolylineRef.current.setMap(null);
            }
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default Map;

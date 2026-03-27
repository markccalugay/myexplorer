import React, { useRef, useEffect } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { AppRoute, getRoutePath } from '../lib/googleRoutes';
import { getGoogleMapsMapId } from '../lib/googleMapsConfig';
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

type ManagedMarker = {
    marker: google.maps.marker.AdvancedMarkerElement;
    pin: google.maps.marker.PinElement;
};

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
    const markerRefs = useRef<globalThis.Map<string, ManagedMarker>>(new globalThis.Map());
    const markerDataRef = useRef<globalThis.Map<string, MapMarker>>(new globalThis.Map());
    const onMarkerClickRef = useRef(onMarkerClick);
    const routePolylineRef = useRef<google.maps.Polyline | null>(null);
    const { google } = useGoogleMaps();
    const mapId = getGoogleMapsMapId() || 'DEMO_MAP_ID';

    useEffect(() => {
        onMarkerClickRef.current = onMarkerClick;
    }, [onMarkerClick]);

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
            const nextKeys = new Set<string>();
            for (const options of markers) {
                const markerKey = options.placeId || [
                    options.title || 'marker',
                    options.position.lat.toFixed(6),
                    options.position.lng.toFixed(6),
                    options.color || '#d93025',
                ].join(':');
                nextKeys.add(markerKey);
                markerDataRef.current.set(markerKey, options);

                const existing = markerRefs.current.get(markerKey);
                if (existing) {
                    existing.marker.position = options.position;
                    existing.marker.title = options.title || '';
                    continue;
                }

                const pin = new google.maps.marker.PinElement({
                    background: options.color || '#d93025',
                    borderColor: '#1f1f1f',
                    glyphColor: '#ffffff',
                });

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: options.position,
                    title: options.title || '',
                    content: pin,
                    map: googleMapRef.current
                });

                if (onMarkerClickRef.current) {
                    marker.addListener('click', () => {
                        const nextMarker = markerDataRef.current.get(markerKey);
                        if (nextMarker) {
                            onMarkerClickRef.current?.(nextMarker);
                        }
                    });
                }

                markerRefs.current.set(markerKey, { marker, pin });
            }

            Array.from(markerRefs.current.entries()).forEach(([markerKey, managedMarker]) => {
                if (nextKeys.has(markerKey)) {
                    return;
                }

                managedMarker.marker.map = null;
                markerRefs.current.delete(markerKey);
                markerDataRef.current.delete(markerKey);
            });
        }
    }, [google, markers]);

    useEffect(() => {
        if (googleMapRef.current) {
            googleMapRef.current.setCenter(center);
            googleMapRef.current.setZoom(zoom);
        }
    }, [center, zoom]);

    useEffect(() => {
        const managedMarkers = markerRefs.current;

        return () => {
            managedMarkers.forEach(({ marker }) => {
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

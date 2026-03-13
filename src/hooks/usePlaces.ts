import { useState, useEffect } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { AppPlace } from '../types/place';
import { APP_PLACE_FIELDS, toAppPlace } from '../lib/googlePlaces';

export const usePlaces = (location: google.maps.LatLngLiteral | null) => {
    const [places, setPlaces] = useState<AppPlace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (!google || !location) return;

        let cancelled = false;

        const loadPlaces = async () => {
            setIsLoading(true);

            try {
                const { Place, SearchNearbyRankPreference } = google.maps.places;
                const response = await Place.searchNearby({
                    fields: [...APP_PLACE_FIELDS],
                    includedPrimaryTypes: ['lodging'],
                    locationRestriction: {
                        center: location,
                        radius: 5000,
                    },
                    maxResultCount: 12,
                    rankPreference: SearchNearbyRankPreference.POPULARITY,
                    language: 'en',
                    region: 'ph',
                });

                if (cancelled) return;
                const nearbyPlaces = (response.places || [])
                    .map((place: google.maps.places.Place) => toAppPlace(place))
                    .filter((place: AppPlace | null): place is AppPlace => Boolean(place));
                setPlaces(nearbyPlaces);
            } catch (error) {
                console.error('Failed to load nearby places:', error);
                if (!cancelled) {
                    setPlaces([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadPlaces();

        return () => {
            cancelled = true;
        };
    }, [google, location]);

    return { places, isLoading };
};

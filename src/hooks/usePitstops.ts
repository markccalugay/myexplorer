import { useState, useEffect } from 'react';
import { useGoogleMaps } from './useGoogleMaps';
import { AppPlace } from '../types/place';
import { BASIC_PLACE_FIELDS, toAppPlace } from '../lib/googlePlaces';

export const usePitstops = (directions: google.maps.DirectionsResult | null) => {
    const [pitstops, setPitstops] = useState<AppPlace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (!google || !directions) return;

        let cancelled = false;

        const loadPitstops = async () => {
            setIsLoading(true);
            const route = directions.routes[0];
            const path = route.overview_path;

            const samplePoints = [
                path[Math.floor(path.length * 0.25)],
                path[Math.floor(path.length * 0.5)],
                path[Math.floor(path.length * 0.75)]
            ];

            try {
                const { Place, SearchNearbyRankPreference } = google.maps.places;
                const responses = await Promise.all(
                    samplePoints.map((point) =>
                        Place.searchNearby({
                            fields: [...BASIC_PLACE_FIELDS, 'rating', 'primaryType'],
                            includedPrimaryTypes: ['gas_station'],
                            locationRestriction: {
                                center: point,
                                radius: 2000,
                            },
                            maxResultCount: 2,
                            rankPreference: SearchNearbyRankPreference.DISTANCE,
                            language: 'en',
                            region: 'ph',
                        })
                    )
                );

                if (cancelled) return;

                const allResults = responses
                    .flatMap((response) => response.places || [])
                    .map((place) => toAppPlace(place))
                    .filter((place): place is AppPlace => Boolean(place));

                const deduped = allResults.filter(
                    (place, index, list) => list.findIndex((item) => item.id === place.id) === index
                );
                setPitstops(deduped);
            } catch (error) {
                console.error('Failed to load route pitstops:', error);
                if (!cancelled) {
                    setPitstops([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadPitstops();

        return () => {
            cancelled = true;
        };
    }, [google, directions]);

    return { pitstops, isLoading };
};

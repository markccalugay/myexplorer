import { useState, useEffect } from 'react';
import { useGoogleMaps } from './useGoogleMaps';

export const usePitstops = (directions: google.maps.DirectionsResult | null) => {
    const [pitstops, setPitstops] = useState<google.maps.places.PlaceResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && directions) {
            setIsLoading(true);
            const route = directions.routes[0];
            const path = route.overview_path;

            // For MVP, we'll pick midpoints or samples along the path
            // Real implementation would use Search Along Route if available or sample points
            const samplePoints = [
                path[Math.floor(path.length * 0.25)],
                path[Math.floor(path.length * 0.5)],
                path[Math.floor(path.length * 0.75)]
            ];

            const service = new google.maps.places.PlacesService(document.createElement('div'));
            const allResults: google.maps.places.PlaceResult[] = [];

            let completedRequests = 0;
            samplePoints.forEach(point => {
                const request: google.maps.places.PlaceSearchRequest = {
                    location: point,
                    radius: 2000,
                    type: 'gas_station' // We can expand this to restaurants, cafes etc.
                };

                service.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        allResults.push(...results.slice(0, 2)); // Take top 2 from each point
                    }
                    completedRequests++;
                    if (completedRequests === samplePoints.length) {
                        setPitstops(allResults.filter((v, i, a) => a.findIndex(t => t.place_id === v.place_id) === i));
                        setIsLoading(false);
                    }
                });
            });
        }
    }, [google, directions]);

    return { pitstops, isLoading };
};

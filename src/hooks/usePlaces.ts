import { useState, useEffect } from 'react';
import { useGoogleMaps } from './useGoogleMaps';

export const usePlaces = (location: google.maps.LatLngLiteral | null) => {
    const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && location) {
            setIsLoading(true);
            const service = new google.maps.places.PlacesService(document.createElement('div'));

            const request: google.maps.places.PlaceSearchRequest = {
                location,
                radius: 5000,
                type: 'lodging'
            };

            service.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    setPlaces(results);
                }
                setIsLoading(false);
            });
        }
    }, [google, location]);

    return { places, isLoading };
};

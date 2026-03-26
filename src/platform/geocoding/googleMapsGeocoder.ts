import type { ReverseGeocodeResult, Geocoder } from './geocoder';
import type { GeoPoint } from '../../types/geo';

const formatFallbackLocation = (location: GeoPoint): ReverseGeocodeResult => ({
    name: 'Current location',
    formattedAddress: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
    location,
});

export const createGoogleMapsGeocoder = (googleMaps: typeof google | null): Geocoder => ({
    async reverseGeocode(location) {
        if (!googleMaps?.maps?.Geocoder) {
            return formatFallbackLocation(location);
        }

        try {
            const geocoder = new googleMaps.maps.Geocoder();
            const response = await geocoder.geocode({ location });
            const topResult = response.results?.[0];

            return {
                name: topResult?.address_components?.[0]?.long_name || 'Current location',
                formattedAddress: topResult?.formatted_address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
                location,
            };
        } catch (error) {
            console.warn('Failed to reverse geocode current location:', error);
            return formatFallbackLocation(location);
        }
    },
});

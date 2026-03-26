import type { Geocoder, ReverseGeocodeResult } from '../platform/geocoding/geocoder';
import type { LocationProvider } from '../platform/location/locationProvider';

export const resolveCurrentLocationOrigin = async (
    locationProvider: LocationProvider,
    geocoder: Geocoder
): Promise<ReverseGeocodeResult> => {
    const liveLocation = await locationProvider.getCurrentLocation();
    return geocoder.reverseGeocode(liveLocation);
};

import type { AppPlace } from '../../types/place';

export type ReverseGeocodeResult = Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>;

export interface Geocoder {
    reverseGeocode(location: google.maps.LatLngLiteral): Promise<ReverseGeocodeResult>;
}

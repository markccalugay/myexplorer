import type { AppPlace } from '../../types/place';
import type { GeoPoint } from '../../types/geo';

export type ReverseGeocodeResult = Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>;

export interface Geocoder {
    reverseGeocode(location: GeoPoint): Promise<ReverseGeocodeResult>;
}

import type { GeoPoint } from '../../types/geo';

export interface LocationProvider {
    getCurrentLocation(): Promise<GeoPoint>;
}

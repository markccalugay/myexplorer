import type { AppRoute } from '../../lib/googleRoutes';
import type { GeoPoint } from '../../types/geo';

export interface RouteProvider {
    computeDrivingRoute(
        origin: GeoPoint,
        destination: GeoPoint,
        intermediates?: GeoPoint[]
    ): Promise<AppRoute | null>;
}

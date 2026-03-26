import type { AppRoute } from '../../lib/googleRoutes';

export interface RouteProvider {
    computeDrivingRoute(
        origin: google.maps.LatLng | google.maps.LatLngLiteral,
        destination: google.maps.LatLng | google.maps.LatLngLiteral,
        intermediates?: Array<google.maps.LatLng | google.maps.LatLngLiteral>
    ): Promise<AppRoute | null>;
}

import { computeDrivingRoute } from '../../lib/googleRoutes';
import type { RouteProvider } from './routeProvider';

export const createGoogleMapsRouteProvider = (googleMaps: typeof google | null): RouteProvider | null => {
    if (!googleMaps) return null;

    return {
        computeDrivingRoute(origin, destination, intermediates = []) {
            return computeDrivingRoute(googleMaps, origin, destination, intermediates);
        },
    };
};

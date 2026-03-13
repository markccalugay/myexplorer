export interface AppRouteLeg {
    distanceMeters?: number | null;
    durationMillis?: number | null;
}

export interface AppRoute {
    path?: Array<google.maps.LatLng | google.maps.LatLngLiteral> | null;
    legs?: AppRouteLeg[] | null;
}

type RouteRequestLocation = google.maps.LatLng | google.maps.LatLngLiteral;

const toTravelSeconds = (durationMillis?: number | null): number => {
    if (typeof durationMillis !== 'number') return 0;
    return Math.round(durationMillis / 1000);
};

export const computeDrivingRoute = async (
    google: typeof window.google,
    origin: RouteRequestLocation,
    destination: RouteRequestLocation
): Promise<AppRoute | null> => {
    const RouteApi = (google.maps as any)?.routes?.Route;
    if (!RouteApi?.computeRoutes) {
        throw new Error('Google Maps Routes library is unavailable.');
    }

    const response = await RouteApi.computeRoutes({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        fields: ['path', 'legs'],
    });

    return response?.routes?.[0] ?? null;
};

export const getRoutePath = (route: AppRoute | null | undefined): google.maps.LatLngLiteral[] => {
    if (!route?.path?.length) return [];

    return route.path
        .map((point) => {
            if (typeof (point as google.maps.LatLng).lat === 'function') {
                const latLng = point as google.maps.LatLng;
                return { lat: latLng.lat(), lng: latLng.lng() };
            }

            const literal = point as google.maps.LatLngLiteral;
            if (typeof literal.lat === 'number' && typeof literal.lng === 'number') {
                return literal;
            }

            return null;
        })
        .filter((point): point is google.maps.LatLngLiteral => Boolean(point));
};

export const getRouteLeg = (route: AppRoute | null | undefined, index = 0): AppRouteLeg | null => {
    return route?.legs?.[index] ?? null;
};

export const getRouteDistanceKm = (route: AppRoute | null | undefined, index = 0): number => {
    const distanceMeters = getRouteLeg(route, index)?.distanceMeters;
    return typeof distanceMeters === 'number' ? Math.round(distanceMeters / 1000) : 0;
};

export const getRouteDurationMinutes = (route: AppRoute | null | undefined, index = 0): number => {
    const seconds = toTravelSeconds(getRouteLeg(route, index)?.durationMillis);
    return Math.round(seconds / 60);
};

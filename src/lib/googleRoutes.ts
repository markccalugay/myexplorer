export interface AppRouteLeg {
    distanceMeters?: number | null;
    durationMillis?: number | null;
    steps?: AppRouteStep[] | null;
}

export interface AppRoute {
    path?: Array<google.maps.LatLng | google.maps.LatLngLiteral> | null;
    legs?: AppRouteLeg[] | null;
}

export interface AppRouteStep {
    distanceMeters?: number | null;
    durationMillis?: number | null;
    navigationInstruction?: {
        instructions?: string | null;
        maneuver?: string | null;
    } | null;
    localizedValues?: {
        distance?: {
            text?: string | null;
        } | null;
        staticDuration?: {
            text?: string | null;
        } | null;
    } | null;
    startLocation?: google.maps.LatLng | google.maps.LatLngLiteral | null;
    endLocation?: google.maps.LatLng | google.maps.LatLngLiteral | null;
}

type RouteRequestLocation = google.maps.LatLng | google.maps.LatLngLiteral;

const toTravelSeconds = (durationMillis?: number | null): number => {
    if (typeof durationMillis !== 'number') return 0;
    return Math.round(durationMillis / 1000);
};

export const computeDrivingRoute = async (
    google: typeof window.google,
    origin: RouteRequestLocation,
    destination: RouteRequestLocation,
    intermediates: RouteRequestLocation[] = []
): Promise<AppRoute | null> => {
    const RouteApi = (google.maps as any)?.routes?.Route;
    if (!RouteApi?.computeRoutes) {
        throw new Error('Google Maps Routes library is unavailable.');
    }

    const response = await RouteApi.computeRoutes({
        origin,
        destination,
        intermediates: intermediates.map((location) => ({ location })),
        travelMode: google.maps.TravelMode.DRIVING,
        fields: [
            'path',
            'legs',
            'legs.distanceMeters',
            'legs.durationMillis',
            'legs.steps',
            'legs.steps.distanceMeters',
            'legs.steps.durationMillis',
            'legs.steps.localizedValues',
            'legs.steps.navigationInstruction',
            'legs.steps.startLocation',
            'legs.steps.endLocation',
        ],
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

export const getRouteSteps = (route: AppRoute | null | undefined, index = 0): AppRouteStep[] => {
    return getRouteLeg(route, index)?.steps ?? [];
};

export const getRouteDistanceKm = (route: AppRoute | null | undefined, index = 0): number => {
    const distanceMeters = getRouteLeg(route, index)?.distanceMeters;
    return typeof distanceMeters === 'number' ? Math.round(distanceMeters / 1000) : 0;
};

export const getRouteDurationMinutes = (route: AppRoute | null | undefined, index = 0): number => {
    const seconds = toTravelSeconds(getRouteLeg(route, index)?.durationMillis);
    return Math.round(seconds / 60);
};

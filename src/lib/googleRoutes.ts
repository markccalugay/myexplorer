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

const toMillis = (duration?: google.maps.Duration): number | null => {
    if (typeof duration?.value !== 'number') return null;
    return duration.value * 1000;
};

const normalizeStep = (step: google.maps.DirectionsStep): AppRouteStep => ({
    distanceMeters: step.distance?.value ?? null,
    durationMillis: toMillis(step.duration),
    navigationInstruction: {
        instructions: step.instructions ?? null,
        maneuver: step.maneuver ?? null,
    },
    localizedValues: {
        distance: {
            text: step.distance?.text ?? null,
        },
        staticDuration: {
            text: step.duration?.text ?? null,
        },
    },
    startLocation: step.start_location ?? null,
    endLocation: step.end_location ?? null,
});

const normalizeLeg = (leg: google.maps.DirectionsLeg): AppRouteLeg => ({
    distanceMeters: leg.distance?.value ?? null,
    durationMillis: toMillis(leg.duration),
    steps: leg.steps.map(normalizeStep),
});

const normalizeRoute = (route: google.maps.DirectionsRoute): AppRoute => ({
    path: route.overview_path ?? null,
    legs: route.legs.map(normalizeLeg),
});

export const computeDrivingRoute = async (
    google: typeof window.google,
    origin: RouteRequestLocation,
    destination: RouteRequestLocation,
    intermediates: RouteRequestLocation[] = []
): Promise<AppRoute | null> => {
    const directionsService = new google.maps.DirectionsService();
    const response = await directionsService.route({
        origin,
        destination,
        waypoints: intermediates.map((location) => ({ location, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
    });

    return response.routes[0] ? normalizeRoute(response.routes[0]) : null;
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

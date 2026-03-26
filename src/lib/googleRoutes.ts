import type { GeoPoint } from '../types/geo';

export interface AppRouteLeg {
    distanceMeters?: number | null;
    durationMillis?: number | null;
    steps?: AppRouteStep[] | null;
}

export interface AppRoute {
    path?: GeoPoint[] | null;
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
    startLocation?: GeoPoint | null;
    endLocation?: GeoPoint | null;
}

type RouteRequestLocation = GeoPoint;
type RoutePointLike =
    | google.maps.LatLng
    | google.maps.LatLngLiteral
    | google.maps.LatLngAltitude
    | google.maps.LatLngAltitudeLiteral
    | null
    | undefined;
type RouteLegStepLike = {
    distanceMeters?: number | null;
    staticDurationMillis?: number | null;
    instructions?: string | null;
    maneuver?: string | null;
    localizedValues?: {
        distance?: string | null;
        staticDuration?: string | null;
    } | null;
    startLocation?: RoutePointLike;
    endLocation?: RoutePointLike;
};
type RouteLegLike = {
    distanceMeters?: number | null;
    durationMillis?: number | null;
    staticDurationMillis?: number | null;
    steps?: RouteLegStepLike[] | null;
};
type RouteLike = {
    path?: RoutePointLike[] | null;
    legs?: RouteLegLike[] | null;
};
type ComputeRoutesResponseLike = {
    routes?: RouteLike[] | null;
};
type RoutesLibraryWithRouteClass = {
    Route: {
        computeRoutes(request: {
            origin: RouteRequestLocation;
            destination: RouteRequestLocation;
            intermediates?: Array<{ location: RouteRequestLocation }>;
            travelMode: 'DRIVING';
            fields: string[];
        }): Promise<ComputeRoutesResponseLike>;
    };
};

const toTravelSeconds = (durationMillis?: number | null): number => {
    if (typeof durationMillis !== 'number') return 0;
    return Math.round(durationMillis / 1000);
};

const toGeoPoint = (point: RoutePointLike): GeoPoint | null => {
    if (!point) return null;

    if (typeof (point as google.maps.LatLng).lat === 'function') {
        const latLng = point as google.maps.LatLng;
        return { lat: latLng.lat(), lng: latLng.lng() };
    }

    const literal = point as google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral;
    if (typeof literal.lat === 'number' && typeof literal.lng === 'number') {
        return { lat: literal.lat, lng: literal.lng };
    }

    return null;
};

const normalizeStep = (step: RouteLegStepLike): AppRouteStep => ({
    distanceMeters: step.distanceMeters ?? null,
    durationMillis: step.staticDurationMillis ?? null,
    navigationInstruction: {
        instructions: step.instructions ?? null,
        maneuver: step.maneuver ?? null,
    },
    localizedValues: {
        distance: {
            text: step.localizedValues?.distance ?? null,
        },
        staticDuration: {
            text: step.localizedValues?.staticDuration ?? null,
        },
    },
    startLocation: toGeoPoint(step.startLocation),
    endLocation: toGeoPoint(step.endLocation),
});

const normalizeLeg = (leg: RouteLegLike): AppRouteLeg => ({
    distanceMeters: leg.distanceMeters ?? null,
    durationMillis: leg.durationMillis ?? leg.staticDurationMillis ?? null,
    steps: leg.steps?.map(normalizeStep) ?? null,
});

export const normalizeRoute = (route: RouteLike): AppRoute => ({
    path: route.path?.map(toGeoPoint).filter((point): point is GeoPoint => Boolean(point)) ?? null,
    legs: route.legs?.map(normalizeLeg) ?? null,
});

export const computeDrivingRoute = async (
    google: typeof window.google,
    origin: RouteRequestLocation,
    destination: RouteRequestLocation,
    intermediates: RouteRequestLocation[] = []
): Promise<AppRoute | null> => {
    const { Route } = await google.maps.importLibrary('routes') as unknown as RoutesLibraryWithRouteClass;
    const response = await Route.computeRoutes({
        origin,
        destination,
        intermediates: intermediates.map((location) => ({ location })),
        travelMode: 'DRIVING',
        fields: ['path', 'legs'],
    });

    return response.routes?.[0] ? normalizeRoute(response.routes[0]) : null;
};

export const getRoutePath = (route: AppRoute | null | undefined): GeoPoint[] => {
    if (!route?.path?.length) return [];
    return route.path
        .map((point) => toGeoPoint(point as unknown as RoutePointLike))
        .filter((point): point is GeoPoint => Boolean(point));
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

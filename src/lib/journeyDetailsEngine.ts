import { getRouteDistanceKm, getRouteDurationMinutes } from './googleRoutes';
import { hasJourneyDetailsChanged, resetJourneyFields } from './stopSequence';
import type { Stop, Trip } from '../types/trip';
import type { RouteProvider } from '../platform/routing/routeProvider';

export interface JourneyDetailsOptions {
    departureTime?: Date;
    layoverMinutes?: number;
    formatTime?: (date: Date) => string;
}

const DEFAULT_LAYOVER_MINUTES = 30;

const getDefaultDepartureTime = () => {
    const departureTime = new Date();
    departureTime.setHours(8, 0, 0, 0);
    return departureTime;
};

const defaultFormatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const buildJourneyDetails = async (
    stops: Stop[],
    routeProvider: RouteProvider,
    options: JourneyDetailsOptions = {}
) => {
    if (stops.length < 2) {
        return stops;
    }

    const routes = await Promise.all(
        stops.slice(0, -1).map((stop, index) =>
            routeProvider.computeDrivingRoute(stop.location, stops[index + 1].location)
        )
    );

    const departureTime = options.departureTime
        ? new Date(options.departureTime.getTime())
        : getDefaultDepartureTime();
    const formatTime = options.formatTime ?? defaultFormatTime;
    const layoverMinutes = options.layoverMinutes ?? DEFAULT_LAYOVER_MINUTES;
    const nextStops = stops.map(resetJourneyFields);

    nextStops[0] = {
        ...nextStops[0],
        arrivalTime: formatTime(departureTime),
    };

    let currentTime = departureTime;

    routes.forEach((route, index) => {
        if (!nextStops[index + 1]) return;

        const distanceFromPrevious = getRouteDistanceKm(route);
        const durationFromPrevious = getRouteDurationMinutes(route);

        nextStops[index + 1] = {
            ...nextStops[index + 1],
            distanceFromPrevious,
            durationFromPrevious,
        };

        currentTime = new Date(currentTime.getTime() + (durationFromPrevious + layoverMinutes) * 60_000);
        nextStops[index + 1] = {
            ...nextStops[index + 1],
            arrivalTime: formatTime(currentTime),
        };
    });

    return nextStops;
};

export const applyJourneyDetailsIfChanged = (
    trip: Trip,
    nextStops: Stop[]
) => (
    hasJourneyDetailsChanged(trip.stops, nextStops)
        ? { ...trip, stops: nextStops }
        : trip
);

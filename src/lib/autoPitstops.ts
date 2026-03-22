import type { Stop } from '../types/trip';
import type { AppPlace } from '../types/place';

export const AUTO_PITSTOP_MIN_DURATION_MINUTES = 90;
export const AUTO_PITSTOP_MULTI_STOP_DURATION_MINUTES = 180;

const toLocationKey = (location: google.maps.LatLngLiteral) => (
    `${location.lat.toFixed(6)}:${location.lng.toFixed(6)}`
);

export const getPitstopPlanningStops = (stops: Stop[]) => (
    stops.filter((stop) => !stop.isAutoSuggested)
);

export const getPitstopRouteKey = (stops: Stop[]) => {
    const planningStops = getPitstopPlanningStops(stops);
    if (planningStops.length < 2) {
        return null;
    }

    return planningStops
        .map((stop) => `${stop.type}:${toLocationKey(stop.location)}`)
        .join('|');
};

export const getAutoPitstopFractions = (durationMins: number) => {
    if (durationMins < AUTO_PITSTOP_MIN_DURATION_MINUTES) {
        return [];
    }

    return durationMins >= AUTO_PITSTOP_MULTI_STOP_DURATION_MINUTES ? [1 / 3, 2 / 3] : [1 / 2];
};

export const dedupeStopsByLocation = <T extends { location: google.maps.LatLngLiteral; googleMapsUri?: string; id: string }>(stops: T[]) => {
    const seen = new Set<string>();

    return stops.filter((stop) => {
        const dedupeKey = stop.googleMapsUri || toLocationKey(stop.location);
        if (seen.has(dedupeKey)) {
            return false;
        }

        seen.add(dedupeKey);
        return true;
    });
};

export const mergeAutoPitstopsIntoTrip = (baseStops: Stop[], autoPitstopsByLeg: Stop[][]) => {
    if (baseStops.length < 2) {
        return baseStops;
    }

    const mergedStops: Stop[] = [baseStops[0]];

    baseStops.slice(0, -1).forEach((_, index) => {
        mergedStops.push(...dedupeStopsByLocation(autoPitstopsByLeg[index] ?? []), baseStops[index + 1]);
    });

    return mergedStops;
};

export const buildAutoPitstopId = (place: Pick<AppPlace, 'googleMapsUri' | 'location' | 'name'>) => (
    `auto-pitstop:${place.googleMapsUri || `${place.name}:${toLocationKey(place.location)}`}`
);

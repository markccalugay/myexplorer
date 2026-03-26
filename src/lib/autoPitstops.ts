import type { Stop } from '../types/trip';
import type { AppPlace } from '../types/place';
import type { GeoPoint } from '../types/geo';

export const AUTO_PITSTOP_SINGLE_DISTANCE_KM = 50;
export const AUTO_PITSTOP_DOUBLE_DISTANCE_KM = 100;
export const AUTO_PITSTOP_SINGLE_DURATION_MINUTES = 60;

const toLocationKey = (location: GeoPoint) => (
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

export const getMandatoryAutoPitstopCount = (distanceKm: number, durationMins: number) => {
    if (distanceKm > AUTO_PITSTOP_DOUBLE_DISTANCE_KM) {
        return 2;
    }

    if (distanceKm > AUTO_PITSTOP_SINGLE_DISTANCE_KM || durationMins > AUTO_PITSTOP_SINGLE_DURATION_MINUTES) {
        return 1;
    }

    return 0;
};

export const getAutoPitstopFractions = (count: number) => {
    if (count <= 0) {
        return [];
    }

    return count >= 2 ? [1 / 3, 2 / 3] : [1 / 2];
};

export const allocateAutoPitstopsByLeg = (
    legs: Array<{ distanceKm: number; durationMins: number }>
) => {
    const totalDistanceKm = legs.reduce((sum, leg) => sum + Math.max(0, leg.distanceKm), 0);
    const totalDurationMins = legs.reduce((sum, leg) => sum + Math.max(0, leg.durationMins), 0);
    const totalPitstops = getMandatoryAutoPitstopCount(totalDistanceKm, totalDurationMins);
    const counts = legs.map(() => 0);

    if (!legs.length || totalPitstops === 0) {
        return counts;
    }

    const sortedLegIndexes = legs
        .map((leg, index) => ({ index, distanceKm: leg.distanceKm, durationMins: leg.durationMins }))
        .sort((left, right) => {
            if (right.durationMins !== left.durationMins) {
                return right.durationMins - left.durationMins;
            }

            return right.distanceKm - left.distanceKm;
        })
        .map((leg) => leg.index);

    for (let assignment = 0; assignment < totalPitstops; assignment += 1) {
        const legIndex = sortedLegIndexes[Math.min(assignment, sortedLegIndexes.length - 1)];
        counts[legIndex] += 1;
    }

    return counts;
};

export const dedupeStopsByLocation = <T extends { location: GeoPoint; googleMapsUri?: string; id: string }>(stops: T[]) => {
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

import type { AppPlace } from '../types/place';
import type { Stop } from '../types/trip';

export const retypeStops = (stops: Stop[]): Stop[] => {
    if (stops.length === 0) return stops;

    return stops.map((stop, index) => {
        if (index === 0) return { ...stop, type: 'start' };
        if (index === stops.length - 1) return { ...stop, type: 'destination' };
        return { ...stop, type: 'stop' };
    });
};

export const createStopFromPlace = (
    place: Pick<AppPlace, 'name' | 'formattedAddress' | 'location'>,
    type: Stop['type']
): Stop => ({
    id: Math.random().toString(36).substr(2, 9),
    name: place.name,
    formattedAddress: place.formattedAddress,
    location: place.location,
    type,
    source: 'manual',
});

export const resetJourneyFields = (stop: Stop): Stop => ({
    ...stop,
    distanceFromPrevious: undefined,
    durationFromPrevious: undefined,
    arrivalTime: undefined,
});

export const hasJourneyDetailsChanged = (previousStops: Stop[], nextStops: Stop[]) =>
    previousStops.length !== nextStops.length ||
    previousStops.some((stop, index) => {
        const nextStop = nextStops[index];
        return (
            stop.distanceFromPrevious !== nextStop.distanceFromPrevious ||
            stop.durationFromPrevious !== nextStop.durationFromPrevious ||
            stop.arrivalTime !== nextStop.arrivalTime
        );
    });

export const hasSameStopSequence = (previousStops: Stop[], nextStops: Stop[]) =>
    previousStops.length === nextStops.length &&
    previousStops.every((stop, index) => {
        const nextStop = nextStops[index];
        return (
            stop.id === nextStop.id &&
            stop.type === nextStop.type &&
            stop.isAutoSuggested === nextStop.isAutoSuggested &&
            stop.location.lat === nextStop.location.lat &&
            stop.location.lng === nextStop.location.lng
        );
    });

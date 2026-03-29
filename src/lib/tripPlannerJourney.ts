import type { Stop, Trip } from '../types/trip';
import { applyJourneyDetailsIfChanged } from './journeyDetailsEngine';
import { resetJourneyFields, retypeStops } from './stopSequence';

export const applyJourneyDetailsUpdateIfCurrent = (
    trip: Trip,
    nextStops: Stop[],
    activeRequestId: number,
    requestId: number
) => (
    activeRequestId === requestId
        ? applyJourneyDetailsIfChanged(trip, nextStops)
        : trip
);

const prepareStopsForJourneyRecalculation = (stops: Stop[]) =>
    retypeStops(stops).map(resetJourneyFields);

export const removeStopFromTrip = (trip: Trip, stopId: string): Trip => {
    const filteredStops = trip.stops.filter((stop) => stop.id !== stopId);
    return {
        ...trip,
        stops: prepareStopsForJourneyRecalculation(filteredStops),
    };
};

export const replaceStopInTrip = (trip: Trip, stopId: string, updatedStop: Stop): Trip => {
    const nextStops = trip.stops.map((stop) => (stop.id === stopId ? updatedStop : stop));
    return {
        ...trip,
        stops: prepareStopsForJourneyRecalculation(nextStops),
    };
};

export const reorderTripStops = (trip: Trip, nextStops: Stop[]): Trip => ({
    ...trip,
    stops: prepareStopsForJourneyRecalculation(nextStops),
});

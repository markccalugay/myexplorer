import {
  buildRouteKey,
  createRouteSnapshotFromResponse,
  routeSnapshotMatchesTrip,
} from './route';
import {createManualStop, type Trip} from './domain';

const createTrip = (): Trip => ({
  id: 'trip-1',
  name: 'Weekend trip',
  stops: [
    createManualStop({
      name: 'Origin',
      lat: 14.5995,
      lng: 120.9842,
    }),
    createManualStop({
      name: 'Destination',
      lat: 13.7565,
      lng: 121.0583,
    }),
  ],
});

test('buildRouteKey changes when stop order changes', () => {
  const trip = createTrip();
  const originalKey = buildRouteKey(trip.stops);
  const reversedKey = buildRouteKey([...trip.stops].reverse());

  expect(originalKey).toBeTruthy();
  expect(reversedKey).toBeTruthy();
  expect(originalKey).not.toEqual(reversedKey);
});

test('routeSnapshotMatchesTrip detects stale route snapshots', () => {
  const trip = createTrip();
  const routeKey = buildRouteKey(trip.stops);
  expect(routeKey).toBeTruthy();

  const snapshot = createRouteSnapshotFromResponse(
    {
      route: {
        totalDistanceMeters: 12000,
        totalDurationMillis: 960000,
        legs: [{distanceMeters: 12000, durationMillis: 960000}],
      },
    },
    routeKey!,
  );

  expect(routeSnapshotMatchesTrip(snapshot, trip)).toBe(true);
  expect(routeSnapshotMatchesTrip(snapshot, {...trip, stops: [...trip.stops].reverse()})).toBe(
    false,
  );
});

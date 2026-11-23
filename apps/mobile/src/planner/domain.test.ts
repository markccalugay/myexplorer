import {
  cloneTrip,
  createManualStop,
  insertStopIntoTripStops,
  parseManualCoordinate,
  upsertSavedTrip,
  type Trip,
} from './domain';

describe('planner domain stop insertion and manual coordinate parsing', () => {
  const stopA = createManualStop({name: 'Origin', lat: 14.5831, lng: 120.9794});
  const stopB = createManualStop({name: 'Destination', lat: 14.1153, lng: 120.9621});
  const stopMid1 = createManualStop({name: 'Nuvali', lat: 14.239, lng: 121.057});
  const stopMid2 = createManualStop({name: 'Alabang', lat: 14.4234, lng: 121.0454});

  test('insertStopIntoTripStops handles empty, origin-only, complete, and multi-intermediate trips', () => {
    // 1. Empty trip -> start
    const afterFirst = insertStopIntoTripStops([], stopA);
    expect(afterFirst.map(s => [s.name, s.type])).toEqual([['Origin', 'start']]);

    // 2. Origin-only trip -> start + destination
    const afterSecond = insertStopIntoTripStops(afterFirst, stopB);
    expect(afterSecond.map(s => [s.name, s.type])).toEqual([
      ['Origin', 'start'],
      ['Destination', 'destination'],
    ]);

    // 3. Complete trip -> inserts before existing destination and preserves destination
    const afterThird = insertStopIntoTripStops(afterSecond, stopMid1);
    expect(afterThird.map(s => [s.name, s.type])).toEqual([
      ['Origin', 'start'],
      ['Nuvali', 'stop'],
      ['Destination', 'destination'],
    ]);

    // 4. Multiple intermediate stops preserve order before existing destination
    const afterFourth = insertStopIntoTripStops(afterThird, stopMid2);
    expect(afterFourth.map(s => [s.name, s.type])).toEqual([
      ['Origin', 'start'],
      ['Nuvali', 'stop'],
      ['Alabang', 'stop'],
      ['Destination', 'destination'],
    ]);
  });

  test('parseManualCoordinate rejects blank/whitespace/invalid and allows explicit 0', () => {
    expect(parseManualCoordinate('', -90, 90)).toBeNull();
    expect(parseManualCoordinate('   ', -90, 90)).toBeNull();
    expect(parseManualCoordinate('abc', -90, 90)).toBeNull();
    expect(parseManualCoordinate('90.1', -90, 90)).toBeNull();
    expect(parseManualCoordinate('-180.5', -180, 180)).toBeNull();
    expect(parseManualCoordinate('Infinity', -180, 180)).toBeNull();

    expect(parseManualCoordinate('0', -90, 90)).toBe(0);
    expect(parseManualCoordinate(' 0.0 ', -180, 180)).toBe(0);
    expect(parseManualCoordinate('14.5995', -90, 90)).toBe(14.5995);
  });

  test('round-trips legacy convoy, stop metadata, and unknown fields across clone, edit, and save', () => {
    const legacyTrip: Trip = {
      id: 'trip-legacy-convoy',
      name: 'Legacy Convoy Trip',
      stops: [
        {
          id: 's1',
          name: 'Manila',
          location: {lat: 14.5995, lng: 120.9842},
          type: 'start',
          source: 'manual',
          isAutoSuggested: false,
          customStopFlag: 'keep-me',
        },
        {
          id: 's2',
          name: 'Tagaytay',
          location: {lat: 14.1153, lng: 120.9621},
          type: 'destination',
          source: 'auto-pitstop',
          isAutoSuggested: true,
        },
      ],
      convoy: {
        id: 'c1',
        tripId: 'trip-legacy-convoy',
        vehicles: [
          {
            id: 'v1',
            label: 'Lead Car',
            order: 0,
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
        ],
        participants: [],
        invites: [],
        assignments: [],
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      legacyUnknownField: {tag: 'preserved'},
    };

    const cloned = cloneTrip(legacyTrip);
    const edited: Trip = {
      ...cloned,
      name: 'Renamed Legacy Trip',
      stops: insertStopIntoTripStops(cloned.stops, stopMid1),
    };
    const savedList = upsertSavedTrip([], edited);
    const reloaded = JSON.parse(JSON.stringify(savedList)) as Trip[];

    expect(reloaded[0].convoy?.vehicles[0].label).toBe('Lead Car');
    expect(reloaded[0].legacyUnknownField).toEqual({tag: 'preserved'});
    expect(reloaded[0].stops[0].customStopFlag).toBe('keep-me');
    expect(reloaded[0].stops[2].source).toBe('auto-pitstop');
    expect(reloaded[0].stops[2].isAutoSuggested).toBe(true);
  });
});

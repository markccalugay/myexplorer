import {
  createManualStop,
  insertStopIntoTripStops,
  parseManualCoordinate,
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
});

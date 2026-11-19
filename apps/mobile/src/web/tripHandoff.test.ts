import {parseWebTripHandoff, parseWebTripHandoffResult} from './tripHandoff';

describe('parseWebTripHandoff', () => {
  const tripA = {
    id: 'trip-a',
    name: 'Current Trip A',
    updatedAt: '2026-11-19T10:00:00.000Z',
    stops: [
      {
        id: 'a1',
        name: 'Japanese Garden',
        formattedAddress: 'Ermita, Manila',
        location: {lat: 14.5839, lng: 120.9794},
      },
      {
        id: 'a2',
        name: 'Intramuros',
        formattedAddress: 'Intramuros, Manila',
        location: {lat: 14.5896, lng: 120.9747},
      },
      {
        id: 'a3',
        name: 'Binondo',
        formattedAddress: 'Binondo, Manila',
        location: {lat: 14.5995, lng: 120.9745},
      },
    ],
  };

  const tripB = {
    id: 'trip-b',
    name: 'Different Trip B',
    updatedAt: '2026-11-19T12:30:00.000Z',
    stops: [
      {id: 'b1', name: 'Makati', location: {lat: 14.5547, lng: 121.0244}},
      {id: 'b2', name: 'BGC', location: {lat: 14.5509, lng: 121.0503}},
    ],
  };

  it('uses current trip A even when a newer saved trip B exists', () => {
    const payload = JSON.stringify({
      currentTrip: tripA,
      session: null,
      savedTrips: [tripB],
    });

    const trip = parseWebTripHandoff(payload);
    expect(trip).not.toBeNull();
    expect(trip?.id).toBe('trip-a');
    expect(trip?.name).toBe('Current Trip A');
    expect(trip?.stops.map(s => s.name)).toEqual([
      'Japanese Garden',
      'Intramuros',
      'Binondo',
    ]);
  });

  it('uses current trip A even when an older navigation session B exists', () => {
    const payload = JSON.stringify({
      currentTrip: tripA,
      session: {
        tripSnapshot: {
          ...tripB,
          updatedAt: '2026-11-19T08:00:00.000Z',
        },
      },
      savedTrips: [],
    });

    const trip = parseWebTripHandoff(payload);
    expect(trip).not.toBeNull();
    expect(trip?.id).toBe('trip-a');
    expect(trip?.name).toBe('Current Trip A');
  });

  it('accepts a valid unsaved current trip with no savedTrips or session', () => {
    const unsavedTrip = {
      id: 'unsaved-draft-1',
      name: 'Unsaved Waterfront Drive',
      stops: [
        {id: 'u1', name: 'Rizal Park', location: {lat: 14.5831, lng: 120.9794}},
        {id: 'u2', name: 'SM Mall of Asia', location: {lat: 14.535, lng: 120.9822}},
      ],
    };

    const result = parseWebTripHandoffResult(
      JSON.stringify({
        currentTrip: unsavedTrip,
        session: null,
        savedTrips: [],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.trip.id).toBe('unsaved-draft-1');
      expect(result.trip.name).toBe('Unsaved Waterfront Drive');
      expect(result.trip.stops.map(s => [s.name, s.type])).toEqual([
        ['Rizal Park', 'start'],
        ['SM Mall of Asia', 'destination'],
      ]);
    }
  });

  it('rejects a three-stop trip with an invalid middle stop instead of dropping it', () => {
    const payload = JSON.stringify({
      currentTrip: {
        id: 'trip-bad-mid',
        name: 'Bad Middle Stop Trip',
        stops: [
          {id: 's1', name: 'Rizal Park', location: {lat: 14.5831, lng: 120.9794}},
          {id: 's2', name: 'Broken Midpoint', location: {lat: 'nope', lng: 120.9747}},
          {id: 's3', name: 'Binondo', location: {lat: 14.5995, lng: 120.9745}},
        ],
      },
    });

    expect(parseWebTripHandoff(payload)).toBeNull();
    const result = parseWebTripHandoffResult(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('stop 2');
      expect(result.error).toContain('Broken Midpoint');
    }
  });

  it('preserves stop order, coordinates, and start/stop/destination retyping', () => {
    const payload = JSON.stringify({
      currentTrip: tripA,
    });

    const trip = parseWebTripHandoff(payload);
    expect(trip).not.toBeNull();
    expect(
      trip?.stops.map(s => [
        s.id,
        s.name,
        s.formattedAddress,
        s.type,
        s.location.lat,
        s.location.lng,
      ]),
    ).toEqual([
      ['a1', 'Japanese Garden', 'Ermita, Manila', 'start', 14.5839, 120.9794],
      ['a2', 'Intramuros', 'Intramuros, Manila', 'stop', 14.5896, 120.9747],
      ['a3', 'Binondo', 'Binondo, Manila', 'destination', 14.5995, 120.9745],
    ]);
  });

  it('never falls back to savedTrips or session when currentTrip is missing', () => {
    const payload = JSON.stringify({
      currentTrip: null,
      session: {tripSnapshot: tripB},
      savedTrips: [tripB],
    });

    const result = parseWebTripHandoffResult(payload);
    expect(result.ok).toBe(false);
    expect(parseWebTripHandoff(payload)).toBeNull();
  });

  it('rejects malformed payloads and out-of-range coordinates', () => {
    expect(parseWebTripHandoff('')).toBeNull();
    expect(parseWebTripHandoff('{bad')).toBeNull();
    expect(
      parseWebTripHandoff(
        JSON.stringify({
          currentTrip: {
            id: 'x',
            stops: [
              {name: 'Start', location: {lat: 14.5, lng: 120.9}},
              {name: 'OutOfBounds', location: {lat: 91, lng: 120.9}},
            ],
          },
        }),
      ),
    ).toBeNull();
  });
});

import {parseWebTripHandoff} from './tripHandoff';

describe('parseWebTripHandoff', () => {
  it('parses ordered stops and coordinates from savedTrips and retypes start/destination', () => {
    const payload = JSON.stringify({
      session: null,
      savedTrips: [
        {
          id: 'trip-web-1',
          name: 'Manila Heritage',
          updatedAt: '2026-11-19T12:00:00.000Z',
          stops: [
            {
              id: 's1',
              name: 'Japanese Garden',
              location: {lat: 14.5839, lng: 120.9794},
            },
            {
              id: 's2',
              name: 'Intramuros',
              location: {lat: 14.5896, lng: 120.9747},
            },
            {
              id: 's3',
              name: 'Binondo',
              location: {lat: 14.5995, lng: 120.9745},
            },
          ],
        },
      ],
    });

    const trip = parseWebTripHandoff(payload);
    expect(trip).not.toBeNull();
    expect(trip?.id).toBe('trip-web-1');
    expect(trip?.name).toBe('Manila Heritage');
    expect(trip?.stops.map(s => [s.name, s.type, s.location.lat, s.location.lng])).toEqual([
      ['Japanese Garden', 'start', 14.5839, 120.9794],
      ['Intramuros', 'stop', 14.5896, 120.9747],
      ['Binondo', 'destination', 14.5995, 120.9745],
    ]);
  });

  it('rejects malformed payloads and invalid coordinates', () => {
    expect(parseWebTripHandoff('')).toBeNull();
    expect(parseWebTripHandoff('{bad')).toBeNull();
    expect(
      parseWebTripHandoff(
        JSON.stringify({
          savedTrips: [{id: 'x', stops: [{name: 'Bad', location: {lat: 'nope', lng: 1}}]}],
        }),
      ),
    ).toBeNull();
  });
});

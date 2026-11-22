import {NativeModules, Platform} from 'react-native';
import {
  parsePlaceSearchResults,
  placeResultToStop,
  searchPlacesByQuery,
} from './placeSearch';

describe('placeSearch', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOs;
    delete (NativeModules as Record<string, unknown>).MyExplorerNavigation;
  });

  test('parsePlaceSearchResults preserves valid results and counts invalid items', () => {
    const parsed = parsePlaceSearchResults(
      JSON.stringify([
        {
          id: 'p1',
          name: 'SM Mall of Asia',
          formattedAddress: 'Seaside Blvd, Pasay, Metro Manila',
          lat: 14.5351,
          lng: 120.9822,
        },
        {
          id: 'p-bad-coord',
          name: 'Broken Place',
          lat: 95,
          lng: 120.98,
        },
        {
          id: 'p-missing-name',
          lat: 14.5,
          lng: 121.0,
        },
        {
          id: 'p-zero',
          name: 'Null Island',
          lat: 0,
          lng: 0,
        },
      ]),
    );

    expect(parsed.invalidCount).toBe(2);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]).toEqual({
      id: 'p1',
      name: 'SM Mall of Asia',
      formattedAddress: 'Seaside Blvd, Pasay, Metro Manila',
      lat: 14.5351,
      lng: 120.9822,
    });
    expect(parsed.results[1].lat).toBe(0);
    expect(parsed.results[1].lng).toBe(0);
  });

  test('placeResultToStop preserves name, address, and internal coordinates', () => {
    const stop = placeResultToStop({
      id: 'p1',
      name: 'Intramuros',
      formattedAddress: 'Intramuros, Manila, Metro Manila',
      lat: 14.5896,
      lng: 120.9747,
    });

    expect(stop.name).toBe('Intramuros');
    expect(stop.formattedAddress).toBe('Intramuros, Manila, Metro Manila');
    expect(stop.location).toEqual({lat: 14.5896, lng: 120.9747});

    expect(() =>
      placeResultToStop({
        id: 'p-bad',
        name: 'Bad Coords',
        lat: Number.NaN,
        lng: 120.9,
      }),
    ).toThrow('invalid coordinates');
  });

  test('searchPlacesByQuery handles valid search, no results, invalid payload, and network failure', async () => {
    Platform.OS = 'android';
    const searchMock = jest.fn().mockResolvedValueOnce(
      JSON.stringify([
        {
          id: 'p1',
          name: 'Rizal Park',
          formattedAddress: 'Roxas Blvd, Ermita, Manila',
          lat: 14.5831,
          lng: 120.9794,
        },
      ]),
    );
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      searchPlaces: searchMock,
    };

    const ok = await searchPlacesByQuery('Rizal Park');
    expect(ok.results).toHaveLength(1);
    expect(ok.results[0].name).toBe('Rizal Park');

    searchMock.mockResolvedValueOnce('[]');
    const empty = await searchPlacesByQuery('Nowhere XYZ');
    expect(empty.results).toHaveLength(0);

    searchMock.mockResolvedValueOnce(
      JSON.stringify([{id: 'bad', name: 'Bad', lat: 120, lng: 10}]),
    );
    await expect(searchPlacesByQuery('Bad')).rejects.toThrow('invalid coordinates');

    searchMock.mockRejectedValueOnce(new Error('Network unavailable'));
    await expect(searchPlacesByQuery('Manila')).rejects.toThrow('Network unavailable');

    await expect(searchPlacesByQuery('   ')).rejects.toThrow(
      'Enter a place name or address',
    );
  });
});

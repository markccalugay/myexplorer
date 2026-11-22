import {NativeModules, Platform} from 'react-native';
import {createManualStop, type Stop} from './domain';

export interface PlaceSearchResult {
  id: string;
  name: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
}

export interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  invalidCount: number;
}

type NativeSearchModule = {
  searchPlaces?: (query: string) => Promise<string>;
};

export function isValidPlaceCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parsePlaceSearchResults(raw: unknown): PlaceSearchResponse {
  let items: unknown = raw;
  if (typeof raw === 'string') {
    try {
      items = JSON.parse(raw);
    } catch {
      throw new Error('Place search returned unreadable data. Please try again.');
    }
  }
  if (!Array.isArray(items)) {
    throw new Error('Place search returned an unexpected response format.');
  }

  const results: PlaceSearchResult[] = [];
  let invalidCount = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      invalidCount += 1;
      continue;
    }
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const formattedAddress =
      typeof obj.formattedAddress === 'string' && obj.formattedAddress.trim()
        ? obj.formattedAddress.trim()
        : undefined;
    const loc =
      obj.location && typeof obj.location === 'object'
        ? (obj.location as Record<string, unknown>)
        : null;
    const lat = typeof loc?.lat === 'number' ? loc.lat : obj.lat;
    const lng = typeof loc?.lng === 'number' ? loc.lng : obj.lng;

    if ((!name && !formattedAddress) || !isValidPlaceCoordinate(lat, lng)) {
      invalidCount += 1;
      continue;
    }

    results.push({
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : `place-${i + 1}-${lat}-${lng}`,
      name: name || formattedAddress || `Place ${i + 1}`,
      formattedAddress,
      lat: lat as number,
      lng: lng as number,
    });
  }

  return {results, invalidCount};
}

export function placeResultToStop(result: PlaceSearchResult): Stop {
  if (!isValidPlaceCoordinate(result.lat, result.lng)) {
    throw new Error(
      `Selected place "${result.name || 'Unknown'}" has invalid coordinates.`,
    );
  }
  const name = result.name.trim() || result.formattedAddress?.trim() || '';
  if (!name) {
    throw new Error('Selected place is missing a name or address.');
  }
  return createManualStop({
    name,
    formattedAddress: result.formattedAddress,
    lat: result.lat,
    lng: result.lng,
  });
}

export async function searchPlacesByQuery(
  query: string,
): Promise<PlaceSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Enter a place name or address to search.');
  }

  const nativeMod =
    Platform.OS === 'android'
      ? ((NativeModules.MyExplorerNavigation as NativeSearchModule | undefined) ??
        null)
      : null;

  if (!nativeMod || typeof nativeMod.searchPlaces !== 'function') {
    throw new Error(
      'Place search is unavailable on this platform or build. Use manual coordinates if needed.',
    );
  }

  const raw = await nativeMod.searchPlaces(trimmed);
  const parsed = parsePlaceSearchResults(raw);
  if (parsed.results.length === 0 && parsed.invalidCount > 0) {
    throw new Error(
      'Search returned place data with invalid coordinates. Try a more specific search.',
    );
  }
  return parsed;
}

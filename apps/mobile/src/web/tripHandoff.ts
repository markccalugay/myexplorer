import {retypeStops, type Stop, type Trip} from '../planner/domain';

type WebLocation = {
  lat?: unknown;
  lng?: unknown;
};

type WebStop = {
  id?: unknown;
  name?: unknown;
  formattedAddress?: unknown;
  location?: WebLocation;
};

type WebTrip = {
  id?: unknown;
  name?: unknown;
  stops?: unknown;
  savedAt?: unknown;
  updatedAt?: unknown;
};

type WebExportEnvelope = {
  currentTrip?: WebTrip | null;
  session?: {
    tripSnapshot?: WebTrip;
  } | null;
  savedTrips?: WebTrip[] | null;
};

export type WebTripHandoffResult =
  | {ok: true; trip: Trip}
  | {ok: false; error: string};

function isValidLatitude(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function describeStop(raw: unknown, index: number): string {
  if (raw && typeof raw === 'object') {
    const candidate = (raw as WebStop).name;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return `stop ${index + 1} ("${candidate.trim()}")`;
    }
  }
  return `stop ${index + 1}`;
}

function toMobileStop(
  raw: unknown,
  index: number,
): {ok: true; stop: Stop} | {ok: false; error: string} {
  const label = describeStop(raw, index);
  if (!raw || typeof raw !== 'object') {
    return {ok: false, error: `Invalid ${label}: stop entry is malformed.`};
  }
  const stopObj = raw as WebStop;
  const lat = stopObj.location?.lat;
  const lng = stopObj.location?.lng;
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return {
      ok: false,
      error: `Invalid coordinates for ${label}. Every stop must have valid latitude and longitude.`,
    };
  }
  const name =
    typeof stopObj.name === 'string' && stopObj.name.trim().length > 0
      ? stopObj.name.trim()
      : `Stop ${index + 1}`;
  const formattedAddress =
    typeof stopObj.formattedAddress === 'string' &&
    stopObj.formattedAddress.trim().length > 0
      ? stopObj.formattedAddress.trim()
      : undefined;
  const id =
    typeof stopObj.id === 'string' && stopObj.id.trim().length > 0
      ? stopObj.id.trim()
      : `web-stop-${index + 1}`;
  return {
    ok: true,
    stop: {
      id,
      name,
      formattedAddress,
      location: {lat, lng},
      type: 'stop',
    },
  };
}

function convertCurrentWebTrip(
  raw: WebTrip | undefined | null,
): WebTripHandoffResult {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      error:
        'No current trip found in the web planner. Open a trip with at least 2 stops before handing off to Native Nav.',
    };
  }
  if (!Array.isArray(raw.stops) || raw.stops.length === 0) {
    return {
      ok: false,
      error:
        'The current web trip has no stops. Add an origin and destination in the web planner first.',
    };
  }

  const stops: Stop[] = [];
  for (let i = 0; i < raw.stops.length; i += 1) {
    const converted = toMobileStop(raw.stops[i], i);
    if (!converted.ok) {
      return converted;
    }
    stops.push(converted.stop);
  }

  if (stops.length < 2) {
    return {
      ok: false,
      error:
        'The current web trip needs at least 2 stops (origin and destination) before handing off to Native Nav.',
    };
  }

  const now = new Date().toISOString();
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : `web-trip-${Date.now()}`;
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : 'MyExplorer Web Trip';

  return {
    ok: true,
    trip: {
      id,
      name,
      stops: retypeStops(stops),
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : now,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    },
  };
}

export function parseWebTripHandoffResult(
  rawJson: string,
): WebTripHandoffResult {
  if (!rawJson || rawJson.trim().length === 0) {
    return {
      ok: false,
      error:
        'Could not read the current trip from the web planner. Open your trip in the planner and try again.',
    };
  }
  try {
    const parsed = JSON.parse(rawJson) as WebExportEnvelope;
    if (!parsed || typeof parsed !== 'object') {
      return {
        ok: false,
        error: 'Could not read the current trip from the web planner.',
      };
    }
    // Only hand off the exact trip currently displayed in the web planner.
    // Never fall back to savedTrips or an old navigation session.
    return convertCurrentWebTrip(parsed.currentTrip);
  } catch {
    return {
      ok: false,
      error: 'Could not parse the current trip from the web planner.',
    };
  }
}

export function parseWebTripHandoff(rawJson: string): Trip | null {
  const result = parseWebTripHandoffResult(rawJson);
  return result.ok ? result.trip : null;
}

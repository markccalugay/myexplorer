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
  session?: {
    tripSnapshot?: WebTrip;
  } | null;
  savedTrips?: WebTrip[] | null;
};

function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toMobileStop(raw: WebStop, index: number): Stop | null {
  const lat = raw.location?.lat;
  const lng = raw.location?.lng;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) {
    return null;
  }
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : `Stop ${index + 1}`;
  const formattedAddress =
    typeof raw.formattedAddress === 'string' && raw.formattedAddress.trim().length > 0
      ? raw.formattedAddress.trim()
      : undefined;
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : `web-stop-${index + 1}`;
  return {
    id,
    name,
    formattedAddress,
    location: {lat, lng},
    type: 'stop',
  };
}

function convertWebTrip(raw: WebTrip | undefined | null): Trip | null {
  if (!raw || !Array.isArray(raw.stops)) {
    return null;
  }
  const stops = raw.stops
    .map((item, idx) =>
      item && typeof item === 'object' ? toMobileStop(item as WebStop, idx) : null,
    )
    .filter((s): s is Stop => s !== null);

  if (stops.length === 0) {
    return null;
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
    id,
    name,
    stops: retypeStops(stops),
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export function parseWebTripHandoff(rawJson: string): Trip | null {
  if (!rawJson || rawJson.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawJson) as WebExportEnvelope;
    const fromSession = convertWebTrip(parsed.session?.tripSnapshot);
    if (fromSession && fromSession.stops.length >= 2) {
      return fromSession;
    }

    const saved = Array.isArray(parsed.savedTrips) ? parsed.savedTrips : [];
    const sorted = [...saved].sort((a, b) => {
      const ta = typeof a?.updatedAt === 'string' ? Date.parse(a.updatedAt) : 0;
      const tb = typeof b?.updatedAt === 'string' ? Date.parse(b.updatedAt) : 0;
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    for (const candidate of sorted) {
      const converted = convertWebTrip(candidate);
      if (converted && converted.stops.length >= 2) {
        return converted;
      }
    }
    return fromSession ?? (sorted[0] ? convertWebTrip(sorted[0]) : null);
  } catch {
    return null;
  }
}

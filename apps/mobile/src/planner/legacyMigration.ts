import {
  cloneTrip,
  normalizeTrip,
  retypeStops,
  upsertSavedTrip,
  type Convoy,
  type Stop,
  type Trip,
} from './domain';

export interface RejectedLegacyTrip {
  tripId?: string;
  tripName?: string;
  reason: string;
  raw: unknown;
}

export interface LegacyMigrationPlan {
  tripsToImport: Trip[];
  nextMobileTrips: Trip[];
  skippedDuplicateIds: string[];
  renamedCollisionIds: Array<{originalId: string; importedId: string}>;
  rejectedTrips: RejectedLegacyTrip[];
  errors: string[];
}

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
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

function validateAndMapLegacyStop(
  rawStop: unknown,
  index: number,
): {ok: true; stop: Stop} | {ok: false; reason: string} {
  if (!rawStop || typeof rawStop !== 'object') {
    return {ok: false, reason: `Stop ${index + 1} is malformed.`};
  }
  const obj = rawStop as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const loc =
    obj.location && typeof obj.location === 'object'
      ? (obj.location as Record<string, unknown>)
      : null;
  const lat = loc?.lat ?? obj.lat;
  const lng = loc?.lng ?? obj.lng;
  if (!name) {
    return {ok: false, reason: `Stop ${index + 1} is missing a name.`};
  }
  if (!isValidCoordinate(lat, lng)) {
    return {
      ok: false,
      reason: `Stop ${index + 1} ("${name}") has missing or invalid coordinates.`,
    };
  }
  const stopId =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : `legacy-stop-${index + 1}`;
  const stopType =
    obj.type === 'start' || obj.type === 'destination' || obj.type === 'stop'
      ? obj.type
      : 'stop';

  // Spread original object first to preserve supported metadata and unknown legacy fields.
  const mapped: Stop = {
    ...(cloneTrip(obj as unknown as Trip) as unknown as Record<string, unknown>),
    id: stopId,
    name,
    location: {lat: lat as number, lng: lng as number},
    type: stopType,
  };
  return {ok: true, stop: mapped};
}

function validateConvoy(
  rawConvoy: unknown,
): {ok: true; convoy?: Convoy} | {ok: false; reason: string} {
  if (rawConvoy === undefined || rawConvoy === null) {
    return {ok: true, convoy: undefined};
  }
  if (typeof rawConvoy !== 'object' || Array.isArray(rawConvoy)) {
    return {ok: false, reason: 'Trip convoy payload is malformed.'};
  }
  const obj = rawConvoy as Record<string, unknown>;
  if (
    !Array.isArray(obj.vehicles) ||
    !Array.isArray(obj.participants) ||
    !Array.isArray(obj.invites) ||
    !Array.isArray(obj.assignments)
  ) {
    return {ok: false, reason: 'Trip convoy payload is missing required collections.'};
  }
  return {ok: true, convoy: JSON.parse(JSON.stringify(obj)) as Convoy};
}

export function validateLegacyWebTrip(
  rawTrip: unknown,
  importedAtIso: string,
): {ok: true; trip: Trip} | {ok: false; reason: string} {
  if (!rawTrip || typeof rawTrip !== 'object' || Array.isArray(rawTrip)) {
    return {ok: false, reason: 'Trip entry is malformed.'};
  }
  const obj = rawTrip as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  if (!id) {
    return {ok: false, reason: 'Trip is missing a valid id.'};
  }
  if (!Array.isArray(obj.stops) || obj.stops.length === 0) {
    return {ok: false, reason: `Trip "${id}" has no stops.`};
  }

  const mappedStops: Stop[] = [];
  for (let i = 0; i < obj.stops.length; i += 1) {
    const res = validateAndMapLegacyStop(obj.stops[i], i);
    if (!res.ok) {
      return {ok: false, reason: res.reason};
    }
    mappedStops.push(res.stop);
  }

  const convoyCheck = validateConvoy(obj.convoy);
  if (!convoyCheck.ok) {
    return {ok: false, reason: convoyCheck.reason};
  }

  const name =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim()
      : 'Imported Trip';

  // Preserve unknown/unsupported legacy fields alongside mapped Trip fields.
  const clonedRaw = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const trip: Trip = {
    ...clonedRaw,
    id,
    name,
    stops: retypeStops(mappedStops),
    ...(convoyCheck.convoy ? {convoy: convoyCheck.convoy} : {}),
    ...(typeof obj.savedAt === 'string' ? {savedAt: obj.savedAt} : {}),
    ...(typeof obj.updatedAt === 'string' ? {updatedAt: obj.updatedAt} : {}),
    migratedFromWebAt:
      typeof obj.migratedFromWebAt === 'string'
        ? obj.migratedFromWebAt
        : importedAtIso,
  };
  return {ok: true, trip};
}

function tripContentSignature(trip: Trip): string {
  const copy = cloneTrip(trip);
  delete copy.migratedFromWebAt;
  return normalizeTrip(copy);
}

export function planLegacyWebTripMigration(params: {
  rawSavedTripsJson: string | null | undefined;
  rawNavSessionJson?: string | null | undefined;
  existingMobileTrips: Trip[];
  importedAtIso?: string;
}): LegacyMigrationPlan {
  const importedAtIso = params.importedAtIso ?? new Date().toISOString();
  const existing = params.existingMobileTrips.map(cloneTrip);
  const tripsToImport: Trip[] = [];
  const skippedDuplicateIds: string[] = [];
  const renamedCollisionIds: Array<{originalId: string; importedId: string}> = [];
  const rejectedTrips: RejectedLegacyTrip[] = [];
  const errors: string[] = [];

  const candidateRawTrips: unknown[] = [];

  if (params.rawSavedTripsJson && params.rawSavedTripsJson.trim()) {
    try {
      const parsed = JSON.parse(params.rawSavedTripsJson) as unknown;
      if (!Array.isArray(parsed)) {
        errors.push('Legacy saved trips payload is not an array.');
      } else {
        candidateRawTrips.push(...parsed);
      }
    } catch {
      errors.push('Legacy saved trips JSON is malformed.');
    }
  }

  if (params.rawNavSessionJson && params.rawNavSessionJson.trim()) {
    try {
      const parsedSession = JSON.parse(params.rawNavSessionJson) as {
        tripSnapshot?: unknown;
      };
      if (parsedSession && typeof parsedSession === 'object' && parsedSession.tripSnapshot) {
        candidateRawTrips.push(parsedSession.tripSnapshot);
      }
    } catch {
      errors.push('Legacy navigation session JSON is malformed.');
    }
  }

  let workingTrips = [...existing];

  for (const rawCandidate of candidateRawTrips) {
    const validated = validateLegacyWebTrip(rawCandidate, importedAtIso);
    if (!validated.ok) {
      const candidateObj =
        rawCandidate && typeof rawCandidate === 'object'
          ? (rawCandidate as Record<string, unknown>)
          : null;
      rejectedTrips.push({
        tripId: typeof candidateObj?.id === 'string' ? candidateObj.id : undefined,
        tripName: typeof candidateObj?.name === 'string' ? candidateObj.name : undefined,
        reason: validated.reason,
        raw: rawCandidate,
      });
      continue;
    }

    const candidate = validated.trip;
    const candidateSig = tripContentSignature(candidate);

    const exactDup = workingTrips.find(
      t => t.id === candidate.id && tripContentSignature(t) === candidateSig,
    );
    if (exactDup) {
      skippedDuplicateIds.push(candidate.id);
      continue;
    }

    const importedLabel = `${candidate.name} (Imported from Web)`;
    const collisionSameContentAsImported = workingTrips.find(
      t =>
        t.name === importedLabel &&
        tripContentSignature({...t, id: candidate.id, name: candidate.name}) ===
          candidateSig,
    );
    if (collisionSameContentAsImported) {
      skippedDuplicateIds.push(candidate.id);
      continue;
    }

    const idCollision = workingTrips.some(t => t.id === candidate.id);
    if (idCollision) {
      let suffix = 1;
      let uniqueId = `${candidate.id}-web-${suffix}`;
      while (workingTrips.some(t => t.id === uniqueId)) {
        suffix += 1;
        uniqueId = `${candidate.id}-web-${suffix}`;
      }
      const renamedTrip: Trip = {
        ...cloneTrip(candidate),
        id: uniqueId,
        name: importedLabel,
      };
      renamedCollisionIds.push({originalId: candidate.id, importedId: uniqueId});
      tripsToImport.push(renamedTrip);
      workingTrips = upsertSavedTrip(workingTrips, renamedTrip);
    } else {
      tripsToImport.push(candidate);
      workingTrips = upsertSavedTrip(workingTrips, candidate);
    }
  }

  return {
    tripsToImport,
    nextMobileTrips: workingTrips,
    skippedDuplicateIds,
    renamedCollisionIds,
    rejectedTrips,
    errors,
  };
}

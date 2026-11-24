import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {
  cloneTrip,
  retypeStops,
  upsertSavedTrip,
  type Stop,
  type Trip,
} from '../planner/domain';
import {
  requestAndroidNavigationPermissions,
  type NavigationPermissionStatus,
} from './permissions';

export type NavigationSessionStatus =
  | 'idle'
  | 'preparing'
  | 'active'
  | 'paused'
  | 'reconnecting'
  | 'completed'
  | 'abandoned';

export interface NavigationSessionSnapshot {
  sessionId: string;
  tripId: string;
  tripName: string;
  status: NavigationSessionStatus;
  stops?: Stop[];
  currentStopIndex: number;
  currentLegIndex: number;
  nextInstructionText: string;
  nextRoadName: string;
  maneuverCode: number;
  roundaboutExitNumber?: number | null;
  stepDistanceMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  finalRemainingDistanceMeters: number;
  finalRemainingDurationSeconds: number;
  isRerouting: boolean;
  needsNavigatorReconnect: boolean;
  updatedAtMs: number;
  lastError?: string;
  recoveryError?: string;
  hasCorruptRecovery?: boolean;
  permissionStatus?: NavigationPermissionStatus;
}

const STORAGE_KEY = 'myexplorer.mobile.navigationSession.v1';
const EVENT_NAME = 'MyExplorerNavigationStateChanged';

let operationGeneration = 0;

export function isNavigationSessionInProgress(session: NavigationSessionSnapshot): boolean {
  return (
    session.status === 'preparing' ||
    session.status === 'active' ||
    session.status === 'paused' ||
    session.status === 'reconnecting'
  );
}

export function tripContentMatchesSession(
  trip: Trip,
  session: NavigationSessionSnapshot,
): boolean {
  if (!session.tripId || trip.id !== session.tripId || !session.stops) {
    return false;
  }
  const expectedName = session.tripName || 'Current Trip';
  if (trip.name !== expectedName) {
    return false;
  }
  const normalizedSessionStops = retypeStops(session.stops);
  if (trip.stops.length !== normalizedSessionStops.length) {
    return false;
  }
  for (let i = 0; i < trip.stops.length; i += 1) {
    const a = trip.stops[i];
    const b = normalizedSessionStops[i];
    if (
      a.id !== b.id ||
      a.name !== b.name ||
      (a.formattedAddress ?? '') !== (b.formattedAddress ?? '') ||
      a.location.lat !== b.location.lat ||
      a.location.lng !== b.location.lng ||
      a.type !== b.type
    ) {
      return false;
    }
  }
  return true;
}

export type TripRecoveryResult =
  | {action: 'none'}
  | {action: 'restore'; trip: Trip}
  | {action: 'conflict'; sessionTrip: Trip; message: string}
  | {action: 'error'; message: string};

export function reconcileTripWithNavigationSession(params: {
  currentTrip: Trip;
  session: NavigationSessionSnapshot;
  hasUnsavedDraftChanges: boolean;
}): TripRecoveryResult {
  const {currentTrip, session, hasUnsavedDraftChanges} = params;
  if (!isNavigationSessionInProgress(session)) {
    return {action: 'none'};
  }
  if (session.recoveryError) {
    return {action: 'error', message: session.recoveryError};
  }
  const recoveredTrip = buildTripFromNavigationSession(session);
  if (!recoveredTrip) {
    return {
      action: 'error',
      message: 'Recovered navigation session is missing valid start and destination stops.',
    };
  }
  if (tripContentMatchesSession(currentTrip, session)) {
    return {action: 'none'};
  }
  if (hasUnsavedDraftChanges && currentTrip.stops.length > 0) {
    const sameId = currentTrip.id === session.tripId;
    return {
      action: 'conflict',
      sessionTrip: recoveredTrip,
      message: sameId
        ? 'Your local draft edits differ from the active navigation session. Choose which version to keep.'
        : 'You have an unsaved draft that differs from the active navigation session. Choose which trip to keep.',
    };
  }
  return {action: 'restore', trip: recoveredTrip};
}

export function navigationSessionMatchesTrip(
  session: NavigationSessionSnapshot,
  trip: Trip,
): boolean {
  return tripContentMatchesSession(trip, session);
}

export function preserveConflictingDraftInSavedTrips(params: {
  savedTrips: Trip[];
  draftTrip: Trip;
  activeSessionTripId: string;
}): {nextSavedTrips: Trip[]; preservedTrip: Trip | null} {
  const {savedTrips, draftTrip, activeSessionTripId} = params;
  if (draftTrip.stops.length === 0) {
    return {nextSavedTrips: savedTrips, preservedTrip: null};
  }
  const hasIdCollision =
    draftTrip.id === activeSessionTripId ||
    savedTrips.some(saved => saved.id === draftTrip.id);
  let preservedId = draftTrip.id;
  if (hasIdCollision) {
    const baseTimestamp = Date.now();
    let candidate = `${draftTrip.id}-draft-${baseTimestamp}`;
    let suffix = 1;
    while (
      candidate === activeSessionTripId ||
      savedTrips.some(saved => saved.id === candidate)
    ) {
      candidate = `${draftTrip.id}-draft-${baseTimestamp}-${suffix}`;
      suffix += 1;
    }
    preservedId = candidate;
  }
  const baseName = draftTrip.name.trim() || 'Untitled Trip';
  const preservedName = baseName.endsWith('(Preserved Draft)')
    ? baseName
    : `${baseName} (Preserved Draft)`;
  const preservedTrip: Trip = {
    ...cloneTrip(draftTrip),
    id: preservedId,
    name: preservedName,
  };
  return {
    nextSavedTrips: upsertSavedTrip(savedTrips, preservedTrip),
    preservedTrip,
  };
}

export function preserveSessionTripInSavedTrips(params: {
  savedTrips: Trip[];
  sessionTrip: Trip;
  currentDraftId: string;
}): {nextSavedTrips: Trip[]; preservedTrip: Trip | null} {
  const {savedTrips, sessionTrip, currentDraftId} = params;
  if (
    sessionTrip.id === currentDraftId ||
    savedTrips.some(saved => saved.id === sessionTrip.id)
  ) {
    return {nextSavedTrips: savedTrips, preservedTrip: null};
  }
  const preservedTrip = cloneTrip(sessionTrip);
  return {
    nextSavedTrips: upsertSavedTrip(savedTrips, preservedTrip),
    preservedTrip,
  };
}

export const IDLE_NAVIGATION_SESSION: NavigationSessionSnapshot = {
  sessionId: '',
  tripId: '',
  tripName: '',
  status: 'idle',
  currentStopIndex: 0,
  currentLegIndex: 0,
  nextInstructionText: '',
  nextRoadName: '',
  maneuverCode: 0,
  roundaboutExitNumber: null,
  stepDistanceMeters: 0,
  remainingDistanceMeters: 0,
  remainingDurationSeconds: 0,
  finalRemainingDistanceMeters: 0,
  finalRemainingDurationSeconds: 0,
  isRerouting: false,
  needsNavigatorReconnect: false,
  updatedAtMs: 0,
};

export function createPreparingSession(trip: Trip): NavigationSessionSnapshot {
  return {
    ...IDLE_NAVIGATION_SESSION,
    sessionId: `nav-${Date.now()}`,
    tripId: trip.id,
    tripName: trip.name,
    stops: retypeStops(trip.stops),
    status: 'preparing',
    currentStopIndex: trip.stops.length > 1 ? 1 : 0,
    currentLegIndex: 0,
    updatedAtMs: Date.now(),
  };
}

export function transitionNavigationSession(
  current: NavigationSessionSnapshot,
  event:
    | {type: 'activated'}
    | {type: 'paused'; reason?: string}
    | {type: 'reconnecting'}
    | {type: 'completed'}
    | {type: 'abandoned'},
): NavigationSessionSnapshot {
  const now = Date.now();
  switch (event.type) {
    case 'activated':
      return {...current, status: 'active', isRerouting: false, updatedAtMs: now, lastError: undefined};
    case 'paused':
      return {
        ...current,
        status: 'paused',
        nextInstructionText: '',
        nextRoadName: '',
        stepDistanceMeters: 0,
        isRerouting: false,
        updatedAtMs: now,
        lastError: event.reason ?? current.lastError,
      };
    case 'reconnecting':
      return {
        ...current,
        status: 'reconnecting',
        nextInstructionText: '',
        nextRoadName: '',
        stepDistanceMeters: 0,
        isRerouting: true,
        updatedAtMs: now,
      };
    case 'completed':
      return {
        ...current,
        status: 'completed',
        nextInstructionText: 'Arrived at destination',
        nextRoadName: '',
        stepDistanceMeters: 0,
        remainingDistanceMeters: 0,
        remainingDurationSeconds: 0,
        finalRemainingDistanceMeters: 0,
        finalRemainingDurationSeconds: 0,
        isRerouting: false,
        updatedAtMs: now,
      };
    case 'abandoned':
      return {
        ...current,
        status: 'abandoned',
        nextInstructionText: '',
        nextRoadName: '',
        stepDistanceMeters: 0,
        remainingDistanceMeters: 0,
        remainingDurationSeconds: 0,
        finalRemainingDistanceMeters: 0,
        finalRemainingDurationSeconds: 0,
        isRerouting: false,
        updatedAtMs: now,
      };
  }
}

function validateSnapshotStops(rawStops: unknown): {
  stops?: Stop[];
  error?: string;
} {
  if (rawStops === undefined || rawStops === null) {
    return {};
  }
  if (!Array.isArray(rawStops)) {
    return {error: 'Recovered trip stops are malformed.'};
  }
  if (rawStops.length < 2) {
    return {
      error: 'Recovered trip is missing required start or destination stops.',
    };
  }
  const stops: Stop[] = [];
  for (let i = 0; i < rawStops.length; i += 1) {
    const item = rawStops[i];
    if (!item || typeof item !== 'object') {
      return {
        error: `Recovered stop ${i + 1} is invalid. Existing trip data was preserved.`,
      };
    }
    const obj = item as Record<string, unknown>;
    const stopLabel =
      typeof obj.name === 'string' && obj.name.trim()
        ? ` ("${obj.name.trim()}")`
        : '';
    const loc =
      obj.location && typeof obj.location === 'object'
        ? (obj.location as Record<string, unknown>)
        : null;
    const lat = typeof loc?.lat === 'number' ? loc.lat : obj.lat;
    const lng = typeof loc?.lng === 'number' ? loc.lng : obj.lng;
    if (
      typeof lat !== 'number' ||
      !Number.isFinite(lat) ||
      typeof lng !== 'number' ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return {
        error: `Recovered stop ${i + 1}${stopLabel} has missing or out-of-range coordinates. Existing trip data was preserved.`,
      };
    }
    stops.push({
      id: typeof obj.id === 'string' && obj.id ? obj.id : `nav-stop-${i + 1}`,
      name: typeof obj.name === 'string' && obj.name ? obj.name : `Stop ${i + 1}`,
      formattedAddress:
        typeof obj.formattedAddress === 'string' && obj.formattedAddress
          ? obj.formattedAddress
          : undefined,
      location: {lat, lng},
      type:
        obj.type === 'start' || obj.type === 'destination' || obj.type === 'stop'
          ? obj.type
          : 'stop',
    });
  }
  return {stops: retypeStops(stops)};
}

export function buildTripFromNavigationSession(
  session: NavigationSessionSnapshot,
): Trip | null {
  if (
    session.recoveryError ||
    !session.tripId ||
    !session.stops ||
    session.stops.length < 2
  ) {
    return null;
  }
  const now = new Date(session.updatedAtMs || Date.now()).toISOString();
  return {
    id: session.tripId,
    name: session.tripName || 'Current Trip',
    stops: retypeStops(session.stops),
    savedAt: now,
    updatedAt: now,
  };
}

export function parseNativeSessionSnapshot(
  raw: string | null | undefined,
): NavigationSessionSnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NavigationSessionSnapshot>;
    if (!parsed || typeof parsed.status !== 'string') {
      return null;
    }

    const validatedStops = validateSnapshotStops(parsed.stops);
    return {
      ...IDLE_NAVIGATION_SESSION,
      ...parsed,
      stops: validatedStops.stops,
      recoveryError: validatedStops.error,
    };
  } catch {
    return null;
  }
}

export async function persistLocalNavigationSession(
  snapshot: NavigationSessionSnapshot,
): Promise<void> {
  if (
    snapshot.status === 'idle' ||
    snapshot.status === 'abandoned' ||
    snapshot.status === 'completed'
  ) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function loadLocalNavigationSession(): Promise<NavigationSessionSnapshot | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseNativeSessionSnapshot(raw);
}

type NativeNavModule = {
  getSessionState: () => Promise<string>;
  startNavigation: (tripJson: string) => Promise<string>;
  pauseNavigation: () => Promise<string>;
  resumeNavigation: () => Promise<string>;
  stopNavigation: () => Promise<string>;
  discardCorruptRecoverySession?: () => Promise<string>;
};

function getNativeNavModule(): NativeNavModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  return (NativeModules.MyExplorerNavigation as NativeNavModule | undefined) ?? null;
}

export async function restoreNavigationSession(): Promise<NavigationSessionSnapshot> {
  const nativeMod = getNativeNavModule();
  if (nativeMod) {
    const raw = await nativeMod.getSessionState();
    const parsed = parseNativeSessionSnapshot(raw);
    if (parsed) {
      // Authoritative native state overrides any stale AsyncStorage snapshot.
      await persistLocalNavigationSession(parsed);
      return parsed;
    }
    throw new Error('Native navigation module returned a malformed session snapshot.');
  }

  const local = await loadLocalNavigationSession();
  if (!local || local.status === 'abandoned' || local.status === 'completed') {
    return IDLE_NAVIGATION_SESSION;
  }
  return local;
}

export async function startNativeNavigation(
  trip: Trip,
): Promise<NavigationSessionSnapshot> {
  const opGen = ++operationGeneration;

  const permResult = await requestAndroidNavigationPermissions();
  if (opGen !== operationGeneration) {
    return IDLE_NAVIGATION_SESSION;
  }

  if (!permResult.canStartNavigation) {
    return {
      ...IDLE_NAVIGATION_SESSION,
      tripId: trip.id,
      tripName: trip.name,
      status: 'paused',
      lastError: permResult.message ?? 'Location permission is required.',
      permissionStatus: permResult.status,
      updatedAtMs: Date.now(),
    };
  }

  const preparing = createPreparingSession(trip);
  const nativeMod = getNativeNavModule();
  if (!nativeMod) {
    return transitionNavigationSession(preparing, {
      type: 'paused',
      reason: 'Native Android Navigation SDK is only available on Android.',
    });
  }

  const raw = await nativeMod.startNavigation(JSON.stringify(trip));
  if (opGen !== operationGeneration) {
    return await restoreNavigationSession();
  }

  const parsed = parseNativeSessionSnapshot(raw) ?? preparing;
  await persistLocalNavigationSession(parsed);
  return {
    ...parsed,
    permissionStatus: permResult.status,
    lastError: parsed.lastError ?? permResult.message ?? undefined,
  };
}

export async function pauseNativeNavigation(): Promise<NavigationSessionSnapshot> {
  ++operationGeneration;
  const nativeMod = getNativeNavModule();
  if (!nativeMod) {
    return IDLE_NAVIGATION_SESSION;
  }

  const raw = await nativeMod.pauseNavigation();
  const parsed = parseNativeSessionSnapshot(raw) ?? IDLE_NAVIGATION_SESSION;
  await persistLocalNavigationSession(parsed);
  return parsed;
}

export async function resumeNativeNavigation(): Promise<NavigationSessionSnapshot> {
  const opGen = ++operationGeneration;
  const current = await restoreNavigationSession();
  if (!current.sessionId || current.status === 'idle' || current.status === 'abandoned' || current.status === 'completed') {
    return {
      ...current,
      lastError: 'No active or paused navigation session is available to resume.',
    };
  }

  const permResult = await requestAndroidNavigationPermissions();
  if (opGen !== operationGeneration) {
    return await restoreNavigationSession();
  }

  if (!permResult.canStartNavigation) {
    return {
      ...current,
      status: 'paused',
      lastError: permResult.message ?? 'Precise location permission is required.',
      permissionStatus: permResult.status,
    };
  }

  const nativeMod = getNativeNavModule();
  if (!nativeMod) {
    return IDLE_NAVIGATION_SESSION;
  }

  const raw = await nativeMod.resumeNavigation();
  if (opGen !== operationGeneration) {
    return await restoreNavigationSession();
  }

  const parsed = parseNativeSessionSnapshot(raw) ?? IDLE_NAVIGATION_SESSION;
  await persistLocalNavigationSession(parsed);
  return {
    ...parsed,
    permissionStatus: permResult.status,
  };
}

/**
 * Retries starting navigation with [currentTrip] when no native session exists
 * (e.g. after a first-start permission denial), or resumes the existing native session.
 */
export async function resumeOrRetryNavigation(
  session: NavigationSessionSnapshot,
  currentTrip: Trip,
): Promise<NavigationSessionSnapshot> {
  if (!session.sessionId) {
    if (currentTrip.stops.length < 2) {
      return {
        ...session,
        lastError: 'Add at least a start and destination stop before starting navigation.',
      };
    }
    return startNativeNavigation(currentTrip);
  }

  return resumeNativeNavigation();
}

export async function stopNativeNavigation(): Promise<NavigationSessionSnapshot> {
  ++operationGeneration;
  const nativeMod = getNativeNavModule();
  if (!nativeMod) {
    await persistLocalNavigationSession(IDLE_NAVIGATION_SESSION);
    return IDLE_NAVIGATION_SESSION;
  }

  const raw = await nativeMod.stopNavigation();
  const parsed = parseNativeSessionSnapshot(raw) ?? IDLE_NAVIGATION_SESSION;
  await persistLocalNavigationSession(parsed);
  return parsed;
}

export async function discardCorruptRecoverySession(): Promise<NavigationSessionSnapshot> {
  ++operationGeneration;
  const nativeMod = getNativeNavModule();
  if (!nativeMod || typeof nativeMod.discardCorruptRecoverySession !== 'function') {
    await persistLocalNavigationSession(IDLE_NAVIGATION_SESSION);
    return IDLE_NAVIGATION_SESSION;
  }

  const raw = await nativeMod.discardCorruptRecoverySession();
  const parsed = parseNativeSessionSnapshot(raw) ?? IDLE_NAVIGATION_SESSION;
  await persistLocalNavigationSession(parsed);
  return parsed;
}

export function subscribeToNavigationUpdates(
  onUpdate: (snapshot: NavigationSessionSnapshot) => void,
): () => void {
  const nativeMod = getNativeNavModule();
  if (!nativeMod) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(
    NativeModules.MyExplorerNavigation as never,
  );
  const subscription = emitter.addListener(EVENT_NAME, (raw: string) => {
    const parsed = parseNativeSessionSnapshot(raw);
    if (parsed) {
      persistLocalNavigationSession(parsed).catch(() => {});
      onUpdate(parsed);
    }
  });

  return () => subscription.remove();
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import {retypeStops, type Stop, type Trip} from '../planner/domain';
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

export function navigationSessionMatchesTrip(
  session: NavigationSessionSnapshot,
  trip: Trip,
): boolean {
  return Boolean(session.tripId) && session.tripId === trip.id;
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

function parseSnapshotStops(rawStops: unknown): Stop[] | undefined {
  if (!Array.isArray(rawStops)) {
    return undefined;
  }
  const stops: Stop[] = [];
  for (let i = 0; i < rawStops.length; i += 1) {
    const item = rawStops[i];
    if (!item || typeof item !== 'object') {
      continue;
    }
    const obj = item as Record<string, unknown>;
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
      !Number.isFinite(lng)
    ) {
      continue;
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
  return stops.length > 0 ? retypeStops(stops) : undefined;
}

export function buildTripFromNavigationSession(
  session: NavigationSessionSnapshot,
): Trip | null {
  if (!session.tripId || !session.stops || session.stops.length < 2) {
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

    return {
      ...IDLE_NAVIGATION_SESSION,
      ...parsed,
      stops: parseSnapshotStops(parsed.stops),
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
    return IDLE_NAVIGATION_SESSION;
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {
  buildTripFromNavigationSession,
  createPreparingSession,
  isNavigationSessionInProgress,
  navigationSessionMatchesTrip,
  parseNativeSessionSnapshot,
  reconcileTripWithNavigationSession,
  restoreNavigationSession,
  resumeNativeNavigation,
  resumeOrRetryNavigation,
  startNativeNavigation,
  stopNativeNavigation,
  transitionNavigationSession,
} from './session';
import type {Trip} from '../planner/domain';

const sampleTrip: Trip = {
  id: 'trip-1',
  name: 'Manila to Tagaytay',
  stops: [
    {
      id: 'stop-1',
      name: 'Manila',
      location: {lat: 14.5995, lng: 120.9842},
      type: 'start',
    },
    {
      id: 'stop-2',
      name: 'Tagaytay',
      location: {lat: 14.1153, lng: 120.9621},
      type: 'destination',
    },
  ],
  totalDistance: 62000,
  totalDuration: 5400,
};

describe('mobile navigation session', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
    delete (NativeModules as Record<string, unknown>).MyExplorerNavigation;
    jest.restoreAllMocks();
  });

  test('creates preparing session and transitions through active, paused, reconnecting, completed', () => {
    const preparing = createPreparingSession(sampleTrip);
    expect(preparing.status).toBe('preparing');
    expect(preparing.currentStopIndex).toBe(1);

    const active = transitionNavigationSession(preparing, {type: 'activated'});
    expect(active.status).toBe('active');

    const paused = transitionNavigationSession(active, {
      type: 'paused',
      reason: 'Backgrounded',
    });
    expect(paused.status).toBe('paused');
    expect(paused.lastError).toBe('Backgrounded');

    const reconnecting = transitionNavigationSession(paused, {type: 'reconnecting'});
    expect(reconnecting.status).toBe('reconnecting');
    expect(reconnecting.nextInstructionText).toBe('');

    const completed = transitionNavigationSession(reconnecting, {type: 'completed'});
    expect(completed.status).toBe('completed');
    expect(completed.remainingDistanceMeters).toBe(0);
  });

  test('start -> end before native start resolves does not resurrect ended session', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
    } as never);

    let resolveStart!: (value: string) => void;
    const abandonedJson = JSON.stringify({
      sessionId: 'nav-1',
      tripId: 'trip-1',
      tripName: 'Manila to Tagaytay',
      status: 'abandoned',
    });

    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      startNavigation: jest.fn(
        () =>
          new Promise<string>(resolve => {
            resolveStart = resolve;
          }),
      ),
      stopNavigation: jest.fn().mockResolvedValue(abandonedJson),
      getSessionState: jest.fn().mockResolvedValue(abandonedJson),
      pauseNavigation: jest.fn(),
      resumeNavigation: jest.fn(),
    };

    const startPromise = startNativeNavigation(sampleTrip);
    await new Promise<void>(r => setTimeout(r, 0));
    const stopped = await stopNativeNavigation();
    expect(stopped.status).toBe('abandoned');

    resolveStart(
      JSON.stringify({
        sessionId: 'nav-1',
        tripId: 'trip-1',
        tripName: 'Manila to Tagaytay',
        status: 'active',
      }),
    );

    const afterStart = await startPromise;
    expect(afterStart.status).toBe('abandoned');
  });

  test('resume -> end while rerouting is pending keeps session abandoned', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
    } as never);

    let resolveResume!: (value: string) => void;
    const pausedJson = JSON.stringify({
      sessionId: 'nav-2',
      tripId: 'trip-1',
      tripName: 'Manila to Tagaytay',
      status: 'paused',
    });
    const abandonedJson = JSON.stringify({
      sessionId: 'nav-2',
      tripId: 'trip-1',
      tripName: 'Manila to Tagaytay',
      status: 'abandoned',
    });

    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      resumeNavigation: jest.fn(
        () =>
          new Promise<string>(resolve => {
            resolveResume = resolve;
          }),
      ),
      stopNavigation: jest.fn().mockResolvedValue(abandonedJson),
      getSessionState: jest
        .fn()
        .mockResolvedValueOnce(pausedJson)
        .mockResolvedValue(abandonedJson),
      startNavigation: jest.fn(),
      pauseNavigation: jest.fn(),
    };

    const resumePromise = resumeNativeNavigation();
    await new Promise<void>(r => setTimeout(r, 0));
    await stopNativeNavigation();

    resolveResume(
      JSON.stringify({
        sessionId: 'nav-2',
        status: 'active',
      }),
    );

    const afterResume = await resumePromise;
    expect(afterResume.status).toBe('abandoned');
  });

  test('restoreNavigationSession trusts authoritative native abandoned state over stale storage', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      getSessionState: jest.fn().mockResolvedValue(
        JSON.stringify({
          sessionId: 'nav-ended',
          status: 'abandoned',
        }),
      ),
    };

    const restored = await restoreNavigationSession();
    expect(restored.status).toBe('abandoned');
    expect(parseNativeSessionSnapshot('not-json')).toBeNull();
  });

  test('deny first start -> retry -> grant permission -> invokes native startNavigation with selected trip', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    const reqSpy = jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValueOnce({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
          PermissionsAndroid.RESULTS.DENIED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
          PermissionsAndroid.RESULTS.DENIED,
      } as never)
      .mockResolvedValueOnce({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
          PermissionsAndroid.RESULTS.GRANTED,
        [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
          PermissionsAndroid.RESULTS.GRANTED,
      } as never);

    const startMock = jest.fn().mockResolvedValue(
      JSON.stringify({
        sessionId: 'nav-retry-1',
        tripId: sampleTrip.id,
        tripName: sampleTrip.name,
        status: 'active',
      }),
    );
    const resumeMock = jest.fn();

    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      startNavigation: startMock,
      resumeNavigation: resumeMock,
      getSessionState: jest.fn().mockResolvedValue(JSON.stringify({status: 'idle'})),
    };

    const firstAttempt = await startNativeNavigation(sampleTrip);
    expect(firstAttempt.status).toBe('paused');
    expect(firstAttempt.sessionId).toBe('');
    expect(startMock).not.toHaveBeenCalled();

    const retryResult = await resumeOrRetryNavigation(firstAttempt, sampleTrip);
    expect(reqSpy).toHaveBeenCalledTimes(2);
    expect(resumeMock).not.toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledWith(JSON.stringify(sampleTrip));
    expect(retryResult.status).toBe('active');
    expect(retryResult.sessionId).toBe('nav-retry-1');
  });

  test('retry with no native session and invalid trip shows clear error', async () => {
    const emptyTrip: Trip = {id: 'empty', name: 'Empty', stops: []};
    const result = await resumeOrRetryNavigation(
      {
        ...createPreparingSession(emptyTrip),
        sessionId: '',
        status: 'paused',
      },
      emptyTrip,
    );
    expect(result.lastError).toContain('at least a start and destination stop');
  });

  test('isNavigationSessionInProgress and navigationSessionMatchesTrip track active/paused sessions', () => {
    const base = createPreparingSession(sampleTrip);
    expect(isNavigationSessionInProgress(base)).toBe(true);
    expect(isNavigationSessionInProgress({...base, status: 'active'})).toBe(true);
    expect(isNavigationSessionInProgress({...base, status: 'paused'})).toBe(true);
    expect(isNavigationSessionInProgress({...base, status: 'reconnecting'})).toBe(true);
    expect(isNavigationSessionInProgress({...base, status: 'idle'})).toBe(false);
    expect(isNavigationSessionInProgress({...base, status: 'abandoned'})).toBe(false);
    expect(isNavigationSessionInProgress({...base, status: 'completed'})).toBe(false);

    expect(navigationSessionMatchesTrip({...base, status: 'active'}, sampleTrip)).toBe(true);
    expect(
      navigationSessionMatchesTrip({...base, status: 'active'}, {...sampleTrip, id: 'other-trip'}),
    ).toBe(false);
    expect(navigationSessionMatchesTrip({...base, tripId: ''}, sampleTrip)).toBe(false);
  });

  test('parseNativeSessionSnapshot and buildTripFromNavigationSession restore native stops', () => {
    const raw = JSON.stringify({
      sessionId: 'nav-rec-1',
      tripId: 'web-trip-42',
      tripName: 'Tagaytay Run',
      status: 'paused',
      needsNavigatorReconnect: true,
      stops: [
        {id: 's1', name: 'Manila', lat: 14.5831, lng: 120.9794, type: 'start'},
        {id: 's2', name: 'Tagaytay', lat: 14.1153, lng: 120.9621, type: 'destination'},
      ],
    });
    const parsed = parseNativeSessionSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.needsNavigatorReconnect).toBe(true);
    expect(parsed?.stops).toHaveLength(2);
    const recovered = buildTripFromNavigationSession(parsed!);
    expect(recovered?.id).toBe('web-trip-42');
    expect(recovered?.name).toBe('Tagaytay Run');
    expect(recovered?.stops[0].location).toEqual({lat: 14.5831, lng: 120.9794});
    expect(recovered?.stops[1].type).toBe('destination');

    expect(
      buildTripFromNavigationSession({
        ...parsed!,
        stops: parsed!.stops?.slice(0, 1),
      }),
    ).toBeNull();
  });

  test('parseNativeSessionSnapshot rejects invalid middle, missing, and out-of-range stops without partial trip', () => {
    // 1. Invalid middle stop in a 3-stop trip
    const invalidMiddleRaw = JSON.stringify({
      sessionId: 'nav-bad-mid',
      tripId: 'trip-bad-mid',
      tripName: 'Three Stop',
      status: 'paused',
      stops: [
        {id: 's1', name: 'Start', lat: 14.5831, lng: 120.9794, type: 'start'},
        {id: 's2', name: 'Broken Mid', lat: 'not-a-number', lng: 120.97, type: 'stop'},
        {id: 's3', name: 'End', lat: 14.1153, lng: 120.9621, type: 'destination'},
      ],
    });
    const invalidMid = parseNativeSessionSnapshot(invalidMiddleRaw);
    expect(invalidMid?.stops).toBeUndefined();
    expect(invalidMid?.recoveryError).toContain('stop 2');
    expect(invalidMid?.recoveryError).toContain('Broken Mid');
    expect(buildTripFromNavigationSession(invalidMid!)).toBeNull();

    const errResult = reconcileTripWithNavigationSession({
      currentTrip: sampleTrip,
      session: invalidMid!,
      hasUnsavedDraftChanges: false,
    });
    expect(errResult.action).toBe('error');

    // 2. Missing coordinates
    const missingCoordsRaw = JSON.stringify({
      sessionId: 'nav-missing',
      tripId: 'trip-missing',
      tripName: 'Missing Coords',
      status: 'active',
      stops: [
        {id: 's1', name: 'Start', lat: 14.5831, lng: 120.9794},
        {id: 's2', name: 'No Lng', lat: 14.1153},
      ],
    });
    const missingCoords = parseNativeSessionSnapshot(missingCoordsRaw);
    expect(missingCoords?.stops).toBeUndefined();
    expect(missingCoords?.recoveryError).toContain('stop 2');

    // 3. Out-of-range coordinates
    const outOfRangeRaw = JSON.stringify({
      sessionId: 'nav-oor',
      tripId: 'trip-oor',
      tripName: 'Out of Range',
      status: 'paused',
      stops: [
        {id: 's1', name: 'Bad Lat', lat: 91.5, lng: 120.9794},
        {id: 's2', name: 'Valid End', lat: 14.1153, lng: 120.9621},
      ],
    });
    const outOfRange = parseNativeSessionSnapshot(outOfRangeRaw);
    expect(outOfRange?.stops).toBeUndefined();
    expect(outOfRange?.recoveryError).toContain('Bad Lat');

    const outOfRangeLng = parseNativeSessionSnapshot(
      JSON.stringify({
        sessionId: 'nav-oor-lng',
        tripId: 'trip-oor-lng',
        tripName: 'Out of Range Lng',
        status: 'paused',
        stops: [
          {id: 's1', name: 'Valid Start', lat: 14.5831, lng: 120.9794},
          {id: 's2', name: 'Bad Lng', lat: 14.1153, lng: -181},
        ],
      }),
    );
    expect(outOfRangeLng?.stops).toBeUndefined();
    expect(outOfRangeLng?.recoveryError).toContain('Bad Lng');

    // 4. Valid 3-stop trip preserves order and stop details
    const validThreeStop = parseNativeSessionSnapshot(
      JSON.stringify({
        sessionId: 'nav-valid-3',
        tripId: 'trip-valid-3',
        tripName: 'Three Stop Valid',
        status: 'paused',
        stops: [
          {id: 's1', name: 'Rizal Park', formattedAddress: 'Manila', lat: 14.5831, lng: 120.9794},
          {id: 's2', name: 'Intramuros', formattedAddress: 'Manila', lat: 14.5896, lng: 120.9747},
          {id: 's3', name: 'Tagaytay', formattedAddress: 'Cavite', lat: 14.1153, lng: 120.9621},
        ],
      }),
    );
    expect(validThreeStop?.recoveryError).toBeUndefined();
    const recovered3 = buildTripFromNavigationSession(validThreeStop!);
    expect(recovered3?.stops.map(s => [s.id, s.name, s.type, s.formattedAddress])).toEqual([
      ['s1', 'Rizal Park', 'start', 'Manila'],
      ['s2', 'Intramuros', 'stop', 'Manila'],
      ['s3', 'Tagaytay', 'destination', 'Cavite'],
    ]);
  });

  test('reconcileTripWithNavigationSession handles same ID with changed stops, identical content, and different draft', () => {
    const baseSession = parseNativeSessionSnapshot(
      JSON.stringify({
        sessionId: 'nav-rec-2',
        tripId: sampleTrip.id,
        tripName: sampleTrip.name,
        status: 'active',
        updatedAtMs: 2000,
        stops: [
          {id: 'stop-1', name: 'Manila', lat: 14.5995, lng: 120.9842, type: 'start'},
          {id: 'stop-2', name: 'Tagaytay', lat: 14.1153, lng: 120.9621, type: 'destination'},
        ],
      }),
    )!;

    // 1. Same ID with identical content -> no-op
    expect(
      reconcileTripWithNavigationSession({
        currentTrip: sampleTrip,
        session: baseSession,
        hasUnsavedDraftChanges: false,
      }),
    ).toEqual({action: 'none'});

    // 2. Same ID with changed stops (reordered / added middle stop) -> restores changed stops
    const updatedSession = parseNativeSessionSnapshot(
      JSON.stringify({
        sessionId: 'nav-rec-2',
        tripId: sampleTrip.id,
        tripName: sampleTrip.name,
        status: 'active',
        updatedAtMs: 3000,
        stops: [
          {id: 'stop-1', name: 'Manila', lat: 14.5995, lng: 120.9842},
          {id: 'stop-mid', name: 'Nuvali', lat: 14.239, lng: 121.057},
          {id: 'stop-2', name: 'Tagaytay', lat: 14.1153, lng: 120.9621},
        ],
      }),
    )!;
    const restoredSameId = reconcileTripWithNavigationSession({
      currentTrip: sampleTrip,
      session: updatedSession,
      hasUnsavedDraftChanges: false,
    });
    expect(restoredSameId.action).toBe('restore');
    if (restoredSameId.action === 'restore') {
      expect(restoredSameId.trip.id).toBe(sampleTrip.id);
      expect(restoredSameId.trip.stops.map(s => s.id)).toEqual([
        'stop-1',
        'stop-mid',
        'stop-2',
      ]);
    }

    // 3. Different current unsaved draft -> conflict (does not overwrite draft)
    const unrelatedDraft: Trip = {
      id: 'draft-other',
      name: 'Baguio Draft',
      stops: [
        {id: 'd1', name: 'QC', location: {lat: 14.676, lng: 121.0437}, type: 'start'},
        {id: 'd2', name: 'Baguio', location: {lat: 16.4023, lng: 120.596}, type: 'destination'},
      ],
      updatedAt: new Date(4000).toISOString(),
    };
    const conflictResult = reconcileTripWithNavigationSession({
      currentTrip: unrelatedDraft,
      session: updatedSession,
      hasUnsavedDraftChanges: true,
    });
    expect(conflictResult.action).toBe('conflict');
    if (conflictResult.action === 'conflict') {
      expect(conflictResult.sessionTrip.id).toBe(sampleTrip.id);
    }
  });
});

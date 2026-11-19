jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {
  createPreparingSession,
  isNavigationSessionInProgress,
  navigationSessionMatchesTrip,
  parseNativeSessionSnapshot,
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
});

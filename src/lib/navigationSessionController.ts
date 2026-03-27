import {
    beginNavigationReconnect,
    createNavigationRouteFingerprint,
    createNavigationSession,
    failNavigationReconnect,
    getElapsedNavigationTimeMs,
    getNavigationSessionResumeState,
    pauseNavigationSession,
    resumeNavigationSession,
    skipNavigationSessionStop,
    syncNavigationSession,
    updateNavigationSessionStatus,
    type NavigationInstructionSnapshot,
    type PersistedNavigationSession,
} from './navigationSession';
import type { Trip, Stop } from '../types/trip';
import type { AppRoute, AppRouteStep } from './googleRoutes';
import type { LocationProvider } from '../platform/location/locationProvider';
import type { GeoPoint } from '../types/geo';

const getApprovedPitstops = (trip: Trip) => trip.stops.filter((stop) => stop.source === 'auto-pitstop');

export interface RestoredNavigationSessionState {
    session: PersistedNavigationSession;
    notice: string;
    elapsedTimeMs: number;
}

export type NavigationSessionRestoreResult =
    | ({
        status: 'restored';
      } & RestoredNavigationSessionState)
    | {
        status: 'needs-reroute';
        notice: string;
      }
    | {
        status: 'rejected';
        notice: string;
      };

export interface StartedNavigationSessionState {
    session: PersistedNavigationSession;
    currentLocation: GeoPoint | null;
    notice: string;
    startedAt: number;
}

export interface NavigationSessionAdvanceResult {
    session: PersistedNavigationSession;
    completed: boolean;
}

export interface NavigationSessionStatusTransitionResult {
    session: PersistedNavigationSession;
    notice: string;
}

export interface SyncNavigationSessionOptions {
    session: PersistedNavigationSession;
    trip: Trip;
    currentStopIndex: number;
    currentLocation: GeoPoint | null;
    hasRemainingStop: boolean;
    navigationRoute: AppRoute | null;
    nextInstruction?: NavigationInstructionSnapshot;
    now?: number;
}

export const attemptRestoreNavigationSession = (
    session: PersistedNavigationSession | null,
    trip: Trip,
    now = Date.now()
): NavigationSessionRestoreResult => {
    if (!session) {
        return {
            status: 'rejected',
            notice: 'No saved trip session is available to restore.',
        };
    }

    const resumeState = getNavigationSessionResumeState(session, trip);
    if (resumeState.status === 'resume-needs-reroute') {
        return {
            status: 'needs-reroute',
            notice: 'Your last active trip needs a route refresh before it can resume.',
        };
    }

    if (resumeState.status !== 'resume-ok' || !resumeState.session) {
        return {
            status: 'rejected',
            notice: 'Your last active trip is no longer eligible for resume.',
        };
    }

    return {
        status: 'restored',
        session: resumeState.session,
        notice: 'Restored your active trip session.',
        elapsedTimeMs: getElapsedNavigationTimeMs(resumeState.session, now),
    };
};

export const restoreNavigationSession = (
    session: PersistedNavigationSession | null,
    trip: Trip,
    now = Date.now()
): RestoredNavigationSessionState | null => {
    const result = attemptRestoreNavigationSession(session, trip, now);
    return result.status === 'restored'
        ? {
            session: result.session,
            notice: result.notice,
            elapsedTimeMs: result.elapsedTimeMs,
        }
        : null;
};

export const startNavigationSession = async (
    trip: Trip,
    locationProvider: LocationProvider,
    now = Date.now()
): Promise<StartedNavigationSessionState> => {
    const nextSession = createNavigationSession(trip, {
        currentStopIndex: 1,
        currentLegIndex: 0,
        approvedPitstops: getApprovedPitstops(trip),
        routeFingerprint: createNavigationRouteFingerprint(trip),
        lastSyncSource: 'phone-ui',
    });

    try {
        const currentLocation = await locationProvider.getCurrentLocation();
        return {
            session: syncNavigationSession(nextSession, {
                status: 'active',
                currentLocation,
                lastKnownLocationAt: now,
                reconnectState: 'restored',
            }, now),
            currentLocation,
            notice: 'Using your live location to guide you to the next stop.',
            startedAt: now,
        };
    } catch {
        return {
            session: syncNavigationSession(nextSession, {
                status: 'active',
                reconnectState: 'pending',
            }, now),
            currentLocation: null,
            notice: 'Live location was unavailable, so navigation starts from your planned origin.',
            startedAt: now,
        };
    }
};

export const endNavigationSession = (
    session: PersistedNavigationSession,
    hasRemainingStop: boolean,
    now = Date.now()
) => updateNavigationSessionStatus(
    session,
    hasRemainingStop ? 'abandoned' : 'completed',
    now
);

export const advanceNavigationSession = (
    session: PersistedNavigationSession,
    nextIndex: number,
    nextStop: Stop,
    stopCount: number,
    now = Date.now()
): NavigationSessionAdvanceResult => {
    const nextSession = syncNavigationSession(session, {
        currentStopIndex: nextIndex,
        currentLegIndex: Math.max(0, nextIndex - 1),
        currentLocation: nextStop.location,
        lastKnownLocationAt: now,
        reconnectState: 'restored',
    }, now);

    if (nextIndex >= stopCount) {
        return {
            session: updateNavigationSessionStatus(nextSession, 'completed', now),
            completed: true,
        };
    }

    return {
        session: nextSession,
        completed: false,
    };
};

export const pauseActiveNavigationSession = (
    session: PersistedNavigationSession,
    now = Date.now()
): NavigationSessionStatusTransitionResult => ({
    session: pauseNavigationSession(session, now),
    notice: 'Paused your active trip session.',
});

export const beginNavigationSessionReconnect = (
    session: PersistedNavigationSession,
    now = Date.now()
): NavigationSessionStatusTransitionResult => ({
    session: beginNavigationReconnect(session, now),
    notice: 'Trying to reconnect your active trip session.',
});

export const failNavigationSessionReconnect = (
    session: PersistedNavigationSession,
    now = Date.now()
): NavigationSessionStatusTransitionResult => ({
    session: failNavigationReconnect(session, now),
    notice: 'We could not reconnect your trip session yet.',
});

export const resumeActiveNavigationSession = (
    session: PersistedNavigationSession,
    now = Date.now()
): NavigationSessionStatusTransitionResult => ({
    session: resumeNavigationSession(session, 'phone-ui', now),
    notice: 'Resumed your active trip session.',
});

export const skipCurrentNavigationStop = (
    session: PersistedNavigationSession,
    nextStopIndex: number,
    stopCount: number,
    now = Date.now()
): NavigationSessionAdvanceResult => {
    const nextSession = skipNavigationSessionStop(session, nextStopIndex, stopCount, now);
    return {
        session: nextSession,
        completed: nextSession.status === 'completed',
    };
};

const toInstructionSnapshot = (step?: AppRouteStep | null): NavigationInstructionSnapshot | undefined => {
    if (!step?.navigationInstruction?.instructions) {
        return undefined;
    }

    return {
        text: step.navigationInstruction.instructions.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        distanceMeters: step.distanceMeters ?? undefined,
        durationSeconds: typeof step.durationMillis === 'number'
            ? Math.round(step.durationMillis / 1000)
            : undefined,
    };
};

export const syncNavigationSessionProgress = ({
    session,
    trip,
    currentStopIndex,
    currentLocation,
    hasRemainingStop,
    navigationRoute,
    nextInstruction,
    now = Date.now(),
}: SyncNavigationSessionOptions): PersistedNavigationSession => {
    const nextLeg = navigationRoute?.legs?.[0];
    const remainingDurationSeconds = typeof nextLeg?.durationMillis === 'number'
        ? Math.round(nextLeg.durationMillis / 1000)
        : undefined;
    const eta = remainingDurationSeconds
        ? new Date(now + (remainingDurationSeconds * 1000)).toISOString()
        : undefined;

    return syncNavigationSession(session, {
        tripSnapshot: trip,
        status: hasRemainingStop ? 'active' : 'completed',
        currentStopIndex,
        currentLegIndex: Math.max(0, currentStopIndex - 1),
        currentLocation: currentLocation ?? undefined,
        lastKnownLocationAt: currentLocation ? now : undefined,
        nextInstruction: nextInstruction ?? toInstructionSnapshot(navigationRoute?.legs?.[0]?.steps?.[0]),
        remainingDistanceMeters: nextLeg?.distanceMeters ?? undefined,
        remainingDurationSeconds,
        eta,
        approvedPitstops: getApprovedPitstops(trip),
        routeFingerprint: createNavigationRouteFingerprint(trip),
        reconnectState: 'restored',
        lastSyncSource: 'phone-ui',
    }, now);
};

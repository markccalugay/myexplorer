import type { Stop, Trip } from '../types/trip';

export type NavigationSessionStatus =
    | 'idle'
    | 'preparing'
    | 'active'
    | 'paused'
    | 'reconnecting'
    | 'completed'
    | 'abandoned';

export type NavigationSessionReconnectState =
    | 'disconnected'
    | 'pending'
    | 'restored'
    | 'failed';

export type NavigationSessionSyncSource = 'phone-ui' | 'background' | 'vehicle-projection';

export interface NavigationInstructionSnapshot {
    text: string;
    distanceMeters?: number;
    durationSeconds?: number;
}

export interface PersistedNavigationSession {
    sessionId: string;
    tripId: string;
    tripSnapshot: Trip;
    status: NavigationSessionStatus;
    startedAt: number;
    updatedAt: number;
    currentStopIndex: number;
    currentLegIndex: number;
    currentLocation?: google.maps.LatLngLiteral;
    lastKnownLocationAt?: number;
    nextInstruction?: NavigationInstructionSnapshot;
    remainingDistanceMeters?: number;
    remainingDurationSeconds?: number;
    eta?: string;
    approvedPitstops: Stop[];
    routeFingerprint?: string;
    resumeToken?: string;
    reconnectState: NavigationSessionReconnectState;
    lastSyncSource: NavigationSessionSyncSource;
}

const createNavigationSessionId = () =>
    `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createNavigationSession = (
    trip: Trip,
    options?: Partial<Pick<
        PersistedNavigationSession,
        'currentStopIndex'
        | 'currentLegIndex'
        | 'approvedPitstops'
        | 'routeFingerprint'
        | 'resumeToken'
        | 'lastSyncSource'
    >>
): PersistedNavigationSession => {
    const timestamp = Date.now();

    return {
        sessionId: createNavigationSessionId(),
        tripId: trip.id,
        tripSnapshot: trip,
        status: 'preparing',
        startedAt: timestamp,
        updatedAt: timestamp,
        currentStopIndex: options?.currentStopIndex ?? 1,
        currentLegIndex: options?.currentLegIndex ?? 0,
        approvedPitstops: options?.approvedPitstops ?? [],
        routeFingerprint: options?.routeFingerprint,
        resumeToken: options?.resumeToken,
        reconnectState: 'pending',
        lastSyncSource: options?.lastSyncSource ?? 'phone-ui',
    };
};

export const updateNavigationSessionStatus = (
    session: PersistedNavigationSession,
    status: NavigationSessionStatus,
    now = Date.now()
): PersistedNavigationSession => ({
    ...session,
    status,
    updatedAt: now,
});

export const canResumeNavigationSession = (session: PersistedNavigationSession) =>
    session.status === 'active' ||
    session.status === 'paused' ||
    session.status === 'reconnecting' ||
    session.status === 'preparing';

export const getElapsedNavigationTimeMs = (
    session: Pick<PersistedNavigationSession, 'startedAt' | 'status'>,
    now = Date.now()
) => {
    if (session.status !== 'active' && session.status !== 'reconnecting') {
        return 0;
    }

    return Math.max(0, now - session.startedAt);
};

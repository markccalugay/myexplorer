import { cloneTrip, normalizeLoadedTrip, type LegacyTrip } from './tripDocument';
import type { PersistedNavigationSession } from './navigationSession';
import type { KeyValueStore } from '../platform/storage/keyValueStore';
import type { GeoPoint } from '../types/geo';
import { sanitizePersistedNavigationSession, sanitizePersistedStop, sanitizePersistedTrip } from './persistence';

export const NAVIGATION_SESSION_STORAGE_KEY = 'myexplorer.navigation-session';

export interface NavigationSessionStore {
    load(): PersistedNavigationSession | null;
    save(session: PersistedNavigationSession): void;
    clear(): void;
}

const VALID_STATUSES = new Set<PersistedNavigationSession['status']>([
    'idle',
    'preparing',
    'active',
    'paused',
    'reconnecting',
    'completed',
    'abandoned',
]);

const VALID_RECONNECT_STATES = new Set<PersistedNavigationSession['reconnectState']>([
    'disconnected',
    'pending',
    'restored',
    'failed',
]);

const VALID_SYNC_SOURCES = new Set<PersistedNavigationSession['lastSyncSource']>([
    'phone-ui',
    'background',
    'vehicle-projection',
]);

const normalizeGeoPoint = (value: unknown): GeoPoint | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.lat === 'number' && typeof candidate.lng === 'number'
        ? { lat: candidate.lat, lng: candidate.lng }
        : undefined;
};

export const createNavigationSessionStore = (storage: KeyValueStore): NavigationSessionStore => ({
    load() {
        try {
            const raw = storage.getItem(NAVIGATION_SESSION_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw) as PersistedNavigationSession & { tripSnapshot?: LegacyTrip };
            if (!parsed || typeof parsed !== 'object' || typeof parsed.tripId !== 'string' || typeof parsed.sessionId !== 'string') {
                return null;
            }

            return {
                ...parsed,
                tripSnapshot: parsed.tripSnapshot
                    ? sanitizePersistedTrip(cloneTrip(normalizeLoadedTrip(parsed.tripSnapshot)))
                    : normalizeLoadedTrip({
                        id: parsed.tripId,
                        name: 'Recovered trip',
                        stops: [],
                    }),
                status: VALID_STATUSES.has(parsed.status) ? parsed.status : 'preparing',
                reconnectState: VALID_RECONNECT_STATES.has(parsed.reconnectState)
                    ? parsed.reconnectState
                    : 'pending',
                lastSyncSource: VALID_SYNC_SOURCES.has(parsed.lastSyncSource)
                    ? parsed.lastSyncSource
                    : 'phone-ui',
                currentStopIndex: typeof parsed.currentStopIndex === 'number'
                    ? Math.max(1, parsed.currentStopIndex)
                    : 1,
                currentLegIndex: typeof parsed.currentLegIndex === 'number'
                    ? Math.max(0, parsed.currentLegIndex)
                    : 0,
                currentLocation: normalizeGeoPoint(parsed.currentLocation),
                approvedPitstops: Array.isArray(parsed.approvedPitstops)
                    ? parsed.approvedPitstops.map(sanitizePersistedStop)
                    : [],
            };
        } catch (error) {
            console.error('Failed to load navigation session:', error);
            return null;
        }
    },
    save(session) {
        storage.setItem(
            NAVIGATION_SESSION_STORAGE_KEY,
            JSON.stringify(sanitizePersistedNavigationSession(session))
        );
    },
    clear() {
        storage.removeItem?.(NAVIGATION_SESSION_STORAGE_KEY);
    },
});

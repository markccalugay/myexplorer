import { cloneTrip, normalizeLoadedTrip, type LegacyTrip } from './tripDocument';
import type { PersistedNavigationSession } from './navigationSession';
import type { KeyValueStore } from '../platform/storage/keyValueStore';

export const NAVIGATION_SESSION_STORAGE_KEY = 'myexplorer.navigation-session';

export interface NavigationSessionStore {
    load(): PersistedNavigationSession | null;
    save(session: PersistedNavigationSession): void;
    clear(): void;
}

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
                tripSnapshot: parsed.tripSnapshot ? cloneTrip(normalizeLoadedTrip(parsed.tripSnapshot)) : normalizeLoadedTrip({
                    id: parsed.tripId,
                    name: 'Recovered trip',
                    stops: [],
                }),
                approvedPitstops: Array.isArray(parsed.approvedPitstops) ? parsed.approvedPitstops : [],
            };
        } catch (error) {
            console.error('Failed to load navigation session:', error);
            return null;
        }
    },
    save(session) {
        storage.setItem(NAVIGATION_SESSION_STORAGE_KEY, JSON.stringify(session));
    },
    clear() {
        storage.removeItem?.(NAVIGATION_SESSION_STORAGE_KEY);
    },
});

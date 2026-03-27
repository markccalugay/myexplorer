import { describe, expect, it, vi } from 'vitest';
import { createNavigationSession } from './navigationSession';
import { createNavigationSessionStore, NAVIGATION_SESSION_STORAGE_KEY } from './navigationSessionStore';
import type { KeyValueStore } from '../platform/storage/keyValueStore';
import type { Trip } from '../types/trip';

const createTrip = (): Trip => ({
    id: 'trip-1',
    name: 'Road trip',
    stops: [],
});

const createMemoryStore = (seed?: Record<string, string>): KeyValueStore => {
    const values = new Map(Object.entries(seed ?? {}));

    return {
        getItem(key) {
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            values.set(key, value);
        },
        removeItem(key) {
            values.delete(key);
        },
    };
};

describe('navigationSessionStore', () => {
    it('saves and loads a persisted navigation session', () => {
        const storage = createMemoryStore();
        const store = createNavigationSessionStore(storage);
        const session = createNavigationSession(createTrip());

        store.save(session);

        expect(store.load()).toMatchObject({
            sessionId: session.sessionId,
            tripId: 'trip-1',
            tripSnapshot: createTrip(),
        });
    });

    it('returns null for malformed session payloads', () => {
        const store = createNavigationSessionStore(createMemoryStore({
            [NAVIGATION_SESSION_STORAGE_KEY]: '{bad json',
        }));
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(store.load()).toBeNull();

        consoleErrorSpy.mockRestore();
    });

    it('normalizes invalid status, reconnect, sync-source, and location values from storage', () => {
        const session = createNavigationSession(createTrip());
        const store = createNavigationSessionStore(createMemoryStore({
            [NAVIGATION_SESSION_STORAGE_KEY]: JSON.stringify({
                ...session,
                status: 'mystery',
                reconnectState: 'unknown',
                lastSyncSource: 'nowhere',
                currentStopIndex: -10,
                currentLegIndex: -5,
                currentLocation: {
                    lat: 'bad',
                    lng: 121,
                },
            }),
        }));

        expect(store.load()).toMatchObject({
            status: 'preparing',
            reconnectState: 'pending',
            lastSyncSource: 'phone-ui',
            currentStopIndex: 1,
            currentLegIndex: 0,
        });
        expect(store.load()?.currentLocation).toBeUndefined();
    });

    it('clears the stored session', () => {
        const storage = createMemoryStore();
        const store = createNavigationSessionStore(storage);
        store.save(createNavigationSession(createTrip()));

        store.clear();

        expect(storage.getItem(NAVIGATION_SESSION_STORAGE_KEY)).toBeNull();
    });
});

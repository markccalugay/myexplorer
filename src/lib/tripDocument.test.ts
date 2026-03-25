import { describe, expect, it, vi } from 'vitest';
import { cloneTrip, createEmptyTrip, createTripId, normalizeLoadedTrip, normalizeTrip, type LegacyTrip } from './tripDocument';

describe('tripDocument helpers', () => {
    it('creates stable trip ids with the expected prefix', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-25T00:00:00.000Z'));

        const tripId = createTripId();

        expect(tripId).toMatch(/^trip-\d+-[a-z0-9]{6}$/);

        vi.useRealTimers();
    });

    it('creates an empty trip shell for a new plan', () => {
        const trip = createEmptyTrip();

        expect(trip).toMatchObject({
            name: 'New Adventure',
            stops: [],
        });
        expect(trip.id).toMatch(/^trip-/);
    });

    it('normalizes legacy convoy data into the current trip shape', () => {
        const legacyTrip: LegacyTrip = {
            id: 'trip-1',
            name: 'Road trip',
            stops: [],
            convey: {
                id: 'convoy-1',
                tripId: 'trip-1',
                vehicles: [],
                participants: [],
                invites: [],
                assignments: [],
                createdAt: '2026-03-20T00:00:00.000Z',
                updatedAt: '2026-03-20T00:00:00.000Z',
            },
        };

        expect(normalizeLoadedTrip(legacyTrip)).toMatchObject({
            id: 'trip-1',
            convoy: legacyTrip.convey,
        });
    });

    it('clones trips deeply so callers can mutate safely', () => {
        const original: LegacyTrip = {
            id: 'trip-1',
            name: 'Road trip',
            stops: [{
                id: 'stop-1',
                name: 'Start',
                location: { lat: 14.5995, lng: 120.9842 },
                type: 'start',
            }],
        };

        const cloned = cloneTrip(original);
        cloned.stops[0].name = 'Changed';

        expect(original.stops[0].name).toBe('Start');
    });

    it('normalizes trips without treating save timestamps as dirty-state changes', () => {
        const savedTrip: LegacyTrip = {
            id: 'trip-1',
            name: 'Road trip',
            stops: [],
            savedAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-25T00:00:00.000Z',
        };

        expect(normalizeTrip(savedTrip)).toBe(JSON.stringify({
            id: 'trip-1',
            name: 'Road trip',
            stops: [],
            convoy: undefined,
            savedAt: undefined,
            updatedAt: undefined,
        }));
    });
});

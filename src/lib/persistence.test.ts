import { describe, expect, it } from 'vitest';
import { sanitizePersistedNavigationSession, sanitizePersistedPlace, sanitizePersistedStop, sanitizePersistedTrip } from './persistence';
import { createNavigationSession } from './navigationSession';
import type { AppPlace } from '../types/place';
import type { Stop, Trip } from '../types/trip';

const createPlace = (): AppPlace => ({
    id: 'https://maps.google.com/?cid=123',
    name: 'Seaside Stay',
    location: { lat: 14.5995, lng: 120.9842 },
    formattedAddress: 'Manila, Philippines',
    rating: 4.8,
    googleMapsUri: 'https://maps.google.com/?cid=123',
});

const createStop = (): Stop => ({
    id: 'stop-1',
    name: 'Fuel stop',
    formattedAddress: 'Quezon City',
    location: { lat: 14.676, lng: 121.0437 },
    type: 'stop',
    source: 'auto-pitstop',
    isAutoSuggested: true,
    category: 'Gas Station',
    description: 'A nearby gas station',
    rating: 4.2,
    googleMapsUri: 'https://maps.google.com/?cid=456',
});

const createTrip = (): Trip => ({
    id: 'trip-1',
    name: 'Northbound',
    stops: [
        {
            id: 'origin',
            name: 'Home',
            formattedAddress: 'Makati',
            location: { lat: 14.5547, lng: 121.0244 },
            type: 'start',
        },
        createStop(),
    ],
    totalDistance: 42,
    totalDuration: 90,
});

describe('persistence sanitizers', () => {
    it('reduces stored places to name and coordinates', () => {
        expect(sanitizePersistedPlace(createPlace())).toEqual({
            id: 'stored:seaside stay:14.59950:120.98420',
            name: 'Seaside Stay',
            location: { lat: 14.5995, lng: 120.9842 },
        });
    });

    it('strips third-party metadata from persisted stops and trips', () => {
        expect(sanitizePersistedStop(createStop())).toEqual({
            id: 'stop-1',
            name: 'Fuel stop',
            location: { lat: 14.676, lng: 121.0437 },
            type: 'stop',
            source: 'auto-pitstop',
            isAutoSuggested: true,
        });

        expect(sanitizePersistedTrip(createTrip())).toEqual({
            id: 'trip-1',
            name: 'Northbound',
            stops: [
                {
                    id: 'origin',
                    name: 'Home',
                    location: { lat: 14.5547, lng: 121.0244 },
                    type: 'start',
                    source: undefined,
                    isAutoSuggested: undefined,
                },
                {
                    id: 'stop-1',
                    name: 'Fuel stop',
                    location: { lat: 14.676, lng: 121.0437 },
                    type: 'stop',
                    source: 'auto-pitstop',
                    isAutoSuggested: true,
                },
            ],
            convoy: undefined,
            savedAt: undefined,
            updatedAt: undefined,
        });
    });

    it('sanitizes navigation sessions before storage', () => {
        const session = createNavigationSession(createTrip(), {
            approvedPitstops: [createStop()],
        });

        expect(sanitizePersistedNavigationSession(session)).toMatchObject({
            tripSnapshot: sanitizePersistedTrip(createTrip()),
            approvedPitstops: [sanitizePersistedStop(createStop())],
        });
    });
});

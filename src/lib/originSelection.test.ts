import { describe, expect, it, vi } from 'vitest';
import { resolveCurrentLocationOrigin } from './originSelection';
import type { Geocoder } from '../platform/geocoding/geocoder';
import type { LocationProvider } from '../platform/location/locationProvider';

describe('originSelection', () => {
    it('resolves the current location through the platform adapters', async () => {
        const locationProvider: LocationProvider = {
            getCurrentLocation: vi.fn().mockResolvedValue({ lat: 14.6, lng: 121.0 }),
        };
        const geocoder: Geocoder = {
            reverseGeocode: vi.fn().mockResolvedValue({
                name: 'Current location',
                formattedAddress: 'Manila',
                location: { lat: 14.6, lng: 121.0 },
            }),
        };

        await expect(resolveCurrentLocationOrigin(locationProvider, geocoder)).resolves.toEqual({
            name: 'Current location',
            formattedAddress: 'Manila',
            location: { lat: 14.6, lng: 121.0 },
        });
        expect(locationProvider.getCurrentLocation).toHaveBeenCalledOnce();
        expect(geocoder.reverseGeocode).toHaveBeenCalledWith({ lat: 14.6, lng: 121.0 });
    });
});

import type { LocationProvider } from './locationProvider';

export const browserLocationProvider: LocationProvider = {
    getCurrentLocation() {
        return new Promise<google.maps.LatLngLiteral>((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not available on this device.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    resolve({
                        lat: coords.latitude,
                        lng: coords.longitude,
                    });
                },
                (error) => reject(new Error(error.message || 'Unable to access your current location.')),
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 60_000,
                }
            );
        });
    },
};

import { useEffect, useState } from 'react';

type GoogleMapsApi = typeof google;
type GoogleMapsWindow = Window & typeof globalThis & {
    google?: GoogleMapsApi;
};

const getGoogleMapsApi = () => (window as GoogleMapsWindow).google;

const waitForGoogleMaps = (maxWaitMs = 5000, intervalMs = 100): Promise<void> => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (typeof getGoogleMapsApi()?.maps?.importLibrary === 'function') {
                resolve();
            } else if (Date.now() - start >= maxWaitMs) {
                reject(new Error('Google Maps bootloader did not initialize within timeout.'));
            } else {
                setTimeout(check, intervalMs);
            }
        };
        check();
    });
};

export const useGoogleMaps = () => {
    const [googleMapsApi, setGoogleMapsApi] = useState<GoogleMapsApi | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadLibraries = async () => {
            try {
                // Wait until the bootloader in index.html has set up importLibrary
                await waitForGoogleMaps();
                const mapsApi = getGoogleMapsApi();
                if (!mapsApi) {
                    throw new Error('Google Maps bootloader is unavailable.');
                }

                await mapsApi.maps.importLibrary('maps');
                await mapsApi.maps.importLibrary('places');
                await mapsApi.maps.importLibrary('marker');
                await mapsApi.maps.importLibrary('routes');

                setGoogleMapsApi(mapsApi);
                setIsLoading(false);
            } catch (e: unknown) {
                const nextError = e instanceof Error
                    ? e
                    : new Error('Failed to load Google Maps.');
                console.error('Failed to load Google Maps:', nextError);
                setError(nextError);
                setIsLoading(false);
            }
        };

        loadLibraries();
    }, []);

    return { google: googleMapsApi, isLoading, error };
};

import { useEffect, useState } from 'react';

type GoogleMapsApi = typeof google;
type GoogleMapsWindow = Window & typeof globalThis & {
    google?: GoogleMapsApi;
    __myExplorerGoogleMapsInit?: () => void;
};

const getGoogleMapsApi = () => (window as GoogleMapsWindow).google;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBVOgwku6wcaDzHkqY7cL4swqfDzgUfK1A';
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-js-api';

let googleMapsLoadPromise: Promise<GoogleMapsApi> | null = null;

const loadGoogleMapsApi = (): Promise<GoogleMapsApi> => {
    if (googleMapsLoadPromise) {
        return googleMapsLoadPromise;
    }

    const existingApi = getGoogleMapsApi();
    if (typeof existingApi?.maps?.importLibrary === 'function') {
        googleMapsLoadPromise = Promise.resolve(existingApi);
        return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
        const callbackName = '__myExplorerGoogleMapsInit';
        const cleanup = () => {
            delete (window as GoogleMapsWindow)[callbackName];
        };

        (window as GoogleMapsWindow)[callbackName] = () => {
            const mapsApi = getGoogleMapsApi();
            if (mapsApi?.maps) {
                cleanup();
                resolve(mapsApi);
                return;
            }

            cleanup();
            reject(new Error('Google Maps loaded without the Maps API object.'));
        };

        if (existingScript) {
            existingScript.addEventListener('error', () => {
                cleanup();
                reject(new Error('Google Maps could not load.'));
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        const params = new URLSearchParams({
            key: GOOGLE_MAPS_API_KEY,
            v: 'weekly',
            loading: 'async',
            libraries: 'maps,places,marker,routes',
            callback: callbackName,
        });

        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            cleanup();
            reject(new Error('Google Maps could not load.'));
        };

        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
};

export const useGoogleMaps = () => {
    const [googleMapsApi, setGoogleMapsApi] = useState<GoogleMapsApi | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadLibraries = async () => {
            try {
                const mapsApi = await loadGoogleMapsApi();

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

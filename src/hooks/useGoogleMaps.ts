import { useEffect, useState } from 'react';

type GoogleMapsApi = typeof google;
type GoogleMapsWindow = Window & typeof globalThis & {
    google?: GoogleMapsApi;
    __myExplorerGoogleMapsInit?: () => void;
};

const getGoogleMapsApi = () => (window as GoogleMapsWindow).google;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-js-api';
const GOOGLE_MAPS_MISSING_KEY_ERROR = new Error(
    'Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY to enable maps, places, and routing.'
);

export const isGoogleMapsConfigurationError = (error: Error | null | undefined) =>
    error?.message === GOOGLE_MAPS_MISSING_KEY_ERROR.message;

let googleMapsLoadPromise: Promise<GoogleMapsApi> | null = null;
let googleMapsScriptElement: HTMLScriptElement | null = null;
let googleMapsLoadRequestId = 0;
let googleMapsLoaderGeneration = 0;
let googleMapsLastLoggedErrorKey: string | null = null;
const googleMapsLoaderListeners = new Set<() => void>();

const clearGoogleMapsLoaderState = () => {
    if (googleMapsScriptElement?.parentNode) {
        googleMapsScriptElement.parentNode.removeChild(googleMapsScriptElement);
    }

    googleMapsScriptElement = null;
    delete (window as GoogleMapsWindow).__myExplorerGoogleMapsInit;
    googleMapsLoadPromise = null;
};

const notifyGoogleMapsLoaderReset = () => {
    googleMapsLoaderGeneration += 1;
    googleMapsLoaderListeners.forEach((listener) => listener());
};

const subscribeGoogleMapsLoader = (listener: () => void) => {
    googleMapsLoaderListeners.add(listener);
    return () => {
        googleMapsLoaderListeners.delete(listener);
    };
};

const reportGoogleMapsError = (error: Error) => {
    if (isGoogleMapsConfigurationError(error)) {
        return;
    }

    const errorKey = `${googleMapsLoadRequestId}:${error.message}`;
    if (googleMapsLastLoggedErrorKey === errorKey) {
        return;
    }

    googleMapsLastLoggedErrorKey = errorKey;
    console.error('Failed to load Google Maps:', error);
};

const loadGoogleMapsApi = (): Promise<GoogleMapsApi> => {
    if (googleMapsLoadPromise) {
        return googleMapsLoadPromise;
    }

    const existingApi = getGoogleMapsApi();
    if (typeof existingApi?.maps?.importLibrary === 'function') {
        googleMapsLoadPromise = Promise.resolve(existingApi);
        return googleMapsLoadPromise;
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return Promise.reject(GOOGLE_MAPS_MISSING_KEY_ERROR);
    }

    const requestId = ++googleMapsLoadRequestId;
    googleMapsLoadPromise = new Promise((resolve, reject) => {
        const callbackName = '__myExplorerGoogleMapsInit';
        const cleanupCallback = () => {
            delete (window as GoogleMapsWindow)[callbackName];
        };
        const rejectIfCurrent = (error: Error) => {
            if (requestId !== googleMapsLoadRequestId) {
                reject(new Error('Google Maps load was superseded by a newer request.'));
                return;
            }

            clearGoogleMapsLoaderState();
            reject(error);
        };

        (window as GoogleMapsWindow)[callbackName] = () => {
            if (requestId !== googleMapsLoadRequestId) {
                reject(new Error('Google Maps load was superseded by a newer request.'));
                return;
            }

            const mapsApi = getGoogleMapsApi();
            if (mapsApi?.maps) {
                cleanupCallback();
                googleMapsScriptElement = null;
                resolve(mapsApi);
                return;
            }

            rejectIfCurrent(new Error('Google Maps loaded without the Maps API object.'));
        };

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
        googleMapsScriptElement = script;
        script.onerror = () => {
            rejectIfCurrent(
                new Error('Google Maps could not load. Check your network connection or API key configuration.')
            );
        };

        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
};

export const retryGoogleMapsLoad = () => {
    clearGoogleMapsLoaderState();
    notifyGoogleMapsLoaderReset();
};

export const useGoogleMaps = () => {
    const [googleMapsApi, setGoogleMapsApi] = useState<GoogleMapsApi | null>(() => getGoogleMapsApi() ?? null);
    const [isLoading, setIsLoading] = useState(() => !getGoogleMapsApi() && Boolean(GOOGLE_MAPS_API_KEY));
    const [error, setError] = useState<Error | null>(null);
    const [loaderGeneration, setLoaderGeneration] = useState(googleMapsLoaderGeneration);

    useEffect(() => subscribeGoogleMapsLoader(() => setLoaderGeneration(googleMapsLoaderGeneration)), []);

    useEffect(() => {
        let cancelled = false;

        const loadLibraries = async () => {
            try {
                setIsLoading(true);
                const mapsApi = await loadGoogleMapsApi();

                await mapsApi.maps.importLibrary('maps');
                await mapsApi.maps.importLibrary('places');
                await mapsApi.maps.importLibrary('marker');
                await mapsApi.maps.importLibrary('routes');

                if (cancelled) return;
                setGoogleMapsApi(mapsApi);
                setError(null);
                setIsLoading(false);
            } catch (e: unknown) {
                const nextError = e instanceof Error
                    ? e
                    : new Error('Failed to load Google Maps.');
                if (cancelled) return;
                reportGoogleMapsError(nextError);
                setError(nextError);
                setGoogleMapsApi(null);
                setIsLoading(false);
            }
        };

        loadLibraries();
        return () => {
            cancelled = true;
        };
    }, [loaderGeneration]);

    return { google: googleMapsApi, isLoading, error, retry: retryGoogleMapsLoad };
};

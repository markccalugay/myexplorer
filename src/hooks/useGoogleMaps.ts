import { useEffect, useState } from 'react';

const waitForGoogleMaps = (maxWaitMs = 5000, intervalMs = 100): Promise<void> => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            // @ts-ignore
            if (window.google?.maps?.importLibrary) {
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
    const [google, setGoogle] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadLibraries = async () => {
            try {
                // Wait until the bootloader in index.html has set up importLibrary
                await waitForGoogleMaps();

                // @ts-ignore
                await window.google.maps.importLibrary("maps");
                // @ts-ignore
                await window.google.maps.importLibrary("places");
                // @ts-ignore
                await window.google.maps.importLibrary("marker");
                // @ts-ignore
                await window.google.maps.importLibrary("routes");

                // @ts-ignore
                setGoogle(window.google);
                setIsLoading(false);
            } catch (e: any) {
                console.error("Failed to load Google Maps:", e);
                setError(e);
                setIsLoading(false);
            }
        };

        loadLibraries();
    }, []);

    return { google, isLoading, error };
};

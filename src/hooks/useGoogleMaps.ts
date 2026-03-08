import { useEffect, useState } from 'react';

export const useGoogleMaps = () => {
    const [google, setGoogle] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // The bootloader in index.html initializes google.maps.importLibrary
        const loadLibraries = async () => {
            try {
                // @ts-ignore
                if (!window.google || !window.google.maps || !window.google.maps.importLibrary) {
                    // Poll for a short time if it's not ready yet
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // @ts-ignore
                await window.google.maps.importLibrary("maps");
                // @ts-ignore
                await window.google.maps.importLibrary("places");
                // @ts-ignore
                await window.google.maps.importLibrary("marker");
                // @ts-ignore
                await window.google.maps.importLibrary("routes");

                setGoogle(window.google);
                setIsLoading(false);
            } catch (e: any) {
                console.error("Failed to load Google Maps via bootloader:", e);
                setError(e);
                setIsLoading(false);
            }
        };

        loadLibraries();
    }, []);

    return { google, isLoading, error };
};

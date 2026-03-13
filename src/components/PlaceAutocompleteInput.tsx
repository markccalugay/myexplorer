import React, { useEffect, useRef } from 'react';

interface PlaceAutocompleteInputProps {
    onSelect: (place: google.maps.places.PlacePrediction) => void | Promise<void>;
    className?: string;
    country?: string;
    placeholder?: string;
    requestedLanguage?: string;
    requestedRegion?: string;
    types?: string[];
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
    onSelect,
    className,
    country = 'ph',
    placeholder,
    requestedLanguage = 'en',
    requestedRegion = 'ph',
    types,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
        let cancelled = false;

        const setup = async () => {
            if (!window.google?.maps?.places || !containerRef.current) return;

            autocomplete = new google.maps.places.PlaceAutocompleteElement({
                componentRestrictions: { country },
                requestedLanguage,
                requestedRegion,
                types: types ?? null,
            });
            if (className) {
                autocomplete.className = className;
            }

            if (placeholder) {
                autocomplete.setAttribute('placeholder', placeholder);
                autocomplete.setAttribute('aria-label', placeholder);
            }

            const handleSelect = async (event: Event) => {
                const prediction = (event as Event & {
                    placePrediction?: google.maps.places.PlacePrediction;
                }).placePrediction;

                if (!prediction || cancelled) return;
                await onSelect(prediction);
            };

            autocomplete.addEventListener('gmp-select', handleSelect);
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(autocomplete);

            return () => {
                autocomplete?.removeEventListener('gmp-select', handleSelect);
            };
        };

        let teardown: (() => void) | undefined;
        setup().then((cleanup) => {
            teardown = cleanup;
        });

        return () => {
            cancelled = true;
            teardown?.();
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [country, onSelect, placeholder, requestedLanguage, requestedRegion, types]);

    return <div ref={containerRef} />;
};

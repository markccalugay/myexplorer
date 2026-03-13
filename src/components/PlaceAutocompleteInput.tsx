import React, { useEffect, useRef } from 'react';

interface PlaceAutocompleteInputProps {
    onSelect: (place: google.maps.places.PlacePrediction) => void | Promise<void>;
    className?: string;
    country?: string;
    placeholder?: string;
    requestedLanguage?: string;
    requestedRegion?: string;
    includedPrimaryTypes?: string[];
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
    onSelect,
    className,
    country = 'ph',
    placeholder,
    requestedLanguage = 'en',
    requestedRegion = 'ph',
    includedPrimaryTypes,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
        let cancelled = false;

        const setup = async () => {
            if (!window.google?.maps?.places || !containerRef.current) return;

            autocomplete = new google.maps.places.PlaceAutocompleteElement({
                requestedLanguage,
                requestedRegion,
            });
            if (className) {
                autocomplete.className = className;
            }

            if (placeholder) {
                (autocomplete as HTMLElement & { placeholder?: string }).placeholder = placeholder;
                autocomplete.setAttribute('aria-label', placeholder);
            }

            // The new widget uses includedRegionCodes / includedPrimaryTypes.
            (autocomplete as google.maps.places.PlaceAutocompleteElement & {
                includedRegionCodes?: string[];
                includedPrimaryTypes?: string[];
            }).includedRegionCodes = country ? [country] : undefined;

            if (includedPrimaryTypes?.length) {
                (autocomplete as google.maps.places.PlaceAutocompleteElement & {
                    includedPrimaryTypes?: string[];
                }).includedPrimaryTypes = includedPrimaryTypes;
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
    }, [country, includedPrimaryTypes, onSelect, placeholder, requestedLanguage, requestedRegion]);

    return <div ref={containerRef} />;
};

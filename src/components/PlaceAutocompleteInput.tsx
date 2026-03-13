import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './PlaceAutocompleteInput.css';

interface PlaceAutocompleteInputProps {
    onSelect: (place: google.maps.places.PlacePrediction) => void | Promise<void>;
    className?: string;
    country?: string;
    placeholder?: string;
    requestedLanguage?: string;
    requestedRegion?: string;
    includedPrimaryTypes?: string[];
    defaultValue?: string;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
    onSelect,
    className,
    country = 'ph',
    placeholder,
    requestedLanguage = 'en',
    requestedRegion = 'ph',
    includedPrimaryTypes,
    defaultValue = '',
}) => {
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const [query, setQuery] = useState(defaultValue);
    const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setQuery(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!window.google?.maps?.places || query.trim().length < 2) {
            setPredictions([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        const trimmedQuery = query.trim();

        const loadSuggestions = async () => {
            setIsLoading(true);

            try {
                if (!sessionTokenRef.current) {
                    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
                }

                const { AutocompleteSuggestion } = google.maps.places;
                const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: trimmedQuery,
                    includedPrimaryTypes,
                    includedRegionCodes: country ? [country] : undefined,
                    language: requestedLanguage,
                    region: requestedRegion,
                    sessionToken: sessionTokenRef.current,
                });

                if (cancelled) return;

                const nextPredictions = response.suggestions
                    .map((suggestion) => suggestion.placePrediction)
                    .filter(
                        (prediction): prediction is google.maps.places.PlacePrediction => Boolean(prediction)
                    );

                setPredictions(nextPredictions);
                setIsOpen(nextPredictions.length > 0);
                setHighlightedIndex(nextPredictions.length > 0 ? 0 : -1);
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load autocomplete suggestions:', error);
                    setPredictions([]);
                    setIsOpen(false);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timeoutId = window.setTimeout(loadSuggestions, 180);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [country, includedPrimaryTypes, query, requestedLanguage, requestedRegion]);

    const suggestionItems = useMemo(
        () =>
            predictions.map((prediction) => ({
                id: prediction.placeId,
                title: prediction.mainText?.toString() || prediction.text?.toString() || 'Unknown place',
                subtitle: prediction.secondaryText?.toString() || '',
                prediction,
            })),
        [predictions]
    );

    const handleSelectPrediction = async (prediction: google.maps.places.PlacePrediction) => {
        setQuery(prediction.text?.toString() || prediction.mainText?.toString() || query);
        setPredictions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        await onSelect(prediction);
        sessionTokenRef.current = null;
    };

    return (
        <div ref={rootRef} className="places-autocomplete">
            <input
                type="text"
                value={query}
                placeholder={placeholder}
                className={className}
                role="combobox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-autocomplete="list"
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (suggestionItems.length > 0) {
                        setIsOpen(true);
                    }
                }}
                onKeyDown={async (event) => {
                    if (!suggestionItems.length) return;

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setIsOpen(true);
                        setHighlightedIndex((current) =>
                            current < suggestionItems.length - 1 ? current + 1 : 0
                        );
                    }

                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setHighlightedIndex((current) =>
                            current > 0 ? current - 1 : suggestionItems.length - 1
                        );
                    }

                    if (event.key === 'Enter' && highlightedIndex >= 0) {
                        event.preventDefault();
                        await handleSelectPrediction(suggestionItems[highlightedIndex].prediction);
                    }

                    if (event.key === 'Escape') {
                        setIsOpen(false);
                        setHighlightedIndex(-1);
                    }
                }}
            />

            {isOpen && suggestionItems.length > 0 && (
                <div id={listboxId} className="places-autocomplete__menu" role="listbox">
                    {suggestionItems.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`places-autocomplete__option${
                                index === highlightedIndex ? ' is-active' : ''
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void handleSelectPrediction(item.prediction)}
                        >
                            <span className="places-autocomplete__title">{item.title}</span>
                            {item.subtitle && (
                                <span className="places-autocomplete__subtitle">{item.subtitle}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {isLoading && query.trim().length >= 2 && (
                <div className="places-autocomplete__status">Searching places...</div>
            )}
        </div>
    );
};

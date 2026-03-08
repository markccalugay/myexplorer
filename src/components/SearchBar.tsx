import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './SearchBar.css';

interface SearchBarProps {
    onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onPlaceSelect }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const { google } = useGoogleMaps();

    useEffect(() => {
        if (google && inputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                componentRestrictions: { country: "ph" },
                fields: ["address_components", "geometry", "name", "formatted_address"],
                types: ["(regions)"]
            });

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (onPlaceSelect) onPlaceSelect(place);
            });
        }
    }, [google, onPlaceSelect]);

    return (
        <div className="search-bar">
            <div className="search-item">
                <label className="search-label">Destination</label>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Where are you going?"
                    className="search-input"
                />
            </div>
            <div className="divider"></div>
            <div className="search-item">
                <label className="search-label">Dates</label>
                <input type="text" placeholder="Add dates" className="search-input" />
            </div>
            <div className="divider"></div>
            <div className="search-item">
                <label className="search-label">Guests</label>
                <input type="number" placeholder="Add guests" className="search-input" />
            </div>
            <button className="search-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </button>
        </div>
    );
};

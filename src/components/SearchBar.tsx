import React from 'react';
import './SearchBar.css';
import { AppPlace } from '../types/place';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { fetchPlaceFromPrediction } from '../lib/googlePlaces';

interface SearchBarProps {
    onPlaceSelect?: (place: AppPlace) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onPlaceSelect }) => {
    return (
        <div className="search-bar">
            <div className="search-item">
                <label className="search-label">Destination</label>
                <PlaceAutocompleteInput
                    className="search-input"
                    placeholder="Where are you going?"
                    includedPrimaryTypes={['(regions)']}
                    onSelect={async (prediction) => {
                        const place = await fetchPlaceFromPrediction(prediction);
                        if (place && onPlaceSelect) {
                            onPlaceSelect(place);
                        }
                    }}
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

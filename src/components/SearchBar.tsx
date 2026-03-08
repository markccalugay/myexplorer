import React from 'react';
import './SearchBar.css';

export const SearchBar: React.FC = () => {
    return (
        <div className="search-bar">
            <div className="search-item">
                <label className="search-label">Location</label>
                <input type="text" placeholder="Where are you going?" className="search-input" />
            </div>
            <div className="divider"></div>
            <div className="search-item">
                <label className="search-label">Dates</label>
                <span className="search-placeholder">Add dates</span>
            </div>
            <div className="divider"></div>
            <div className="search-item">
                <label className="search-label">Travelers</label>
                <span className="search-placeholder">Add guests</span>
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

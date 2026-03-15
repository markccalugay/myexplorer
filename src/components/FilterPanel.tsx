import React from 'react';
import './FilterPanel.css';

interface FilterPanelProps {
    onFilterChange: (category: string, value: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
    const fuelBrands = ['Petron', 'Shell', 'Caltex', 'Total', 'Seaoil'];
    const foodTypes = ['Vegan', 'Local cuisine', 'Coffee shops', 'Fast food'];
    const amenities = ['Bathroom', 'WiFi', 'Parking', '24-hour service'];

    const renderSection = (title: string, category: string, items: string[]) => {
        const gridItems = items.length % 2 === 0 ? items : [...items, '__placeholder__'];

        return (
            <div className="filter-section">
                <div className="filter-section__header">
                    <h4>{title}</h4>
                </div>
                <div className="filter-options">
                    {gridItems.map((item) => (
                        item === '__placeholder__' ? (
                            <div
                                key={`${title}-placeholder`}
                                className="filter-chip filter-chip--placeholder"
                                aria-hidden="true"
                            />
                        ) : (
                            <label key={item} className="filter-chip">
                                <input type="checkbox" onChange={() => onFilterChange(category, item)} />
                                <span>{item}</span>
                            </label>
                        )
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="filter-panel">
            {renderSection('Fuel Brands', 'fuel', fuelBrands)}
            {renderSection('Food & Dining', 'food', foodTypes)}
            {renderSection('Amenities', 'amenity', amenities)}
        </div>
    );
};

import React from 'react';
import './FilterPanel.css';

interface FilterPanelProps {
    onFilterChange: (category: string, value: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
    const fuelBrands = ['Petron', 'Shell', 'Caltex', 'Total', 'Seaoil'];
    const foodTypes = ['Vegan', 'Local cuisine', 'Coffee shops', 'Fast food'];
    const amenities = ['Bathroom', 'WiFi', 'Parking', '24-hour service'];

    return (
        <div className="filter-panel">
            <div className="filter-section">
                <h4>Fuel Brands</h4>
                <div className="filter-options">
                    {fuelBrands.map(brand => (
                        <label key={brand} className="filter-chip">
                            <input type="checkbox" onChange={() => onFilterChange('fuel', brand)} />
                            <span>{brand}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="filter-section">
                <h4>Food & Dining</h4>
                <div className="filter-options">
                    {foodTypes.map(type => (
                        <label key={type} className="filter-chip">
                            <input type="checkbox" onChange={() => onFilterChange('food', type)} />
                            <span>{type}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="filter-section">
                <h4>Amenities</h4>
                <div className="filter-options">
                    {amenities.map(item => (
                        <label key={item} className="filter-chip">
                            <input type="checkbox" onChange={() => onFilterChange('amenity', item)} />
                            <span>{item}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

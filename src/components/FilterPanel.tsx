import React, { useState } from 'react';
import './FilterPanel.css';

interface FilterPanelProps {
    onFilterChange: (category: string, value: string) => void;
}

interface FilterOption {
    id: string;
    label: string;
}

interface FilterCategory {
    id: string;
    title: string;
    iconLabel: string;
    options: FilterOption[];
}

const FILTER_CATEGORIES: FilterCategory[] = [
    {
        id: 'fuel',
        title: 'Fuel (Gasolina)',
        iconLabel: 'G',
        options: [
            { id: 'petron', label: 'Petron' },
            { id: 'shell', label: 'Shell' },
            { id: 'caltex', label: 'Caltex' },
            { id: 'phoenix', label: 'Phoenix' },
            { id: 'unioil', label: 'Unioil' },
            { id: 'seaoil', label: 'Seaoil' },
            { id: 'cleanfuel', label: 'Cleanfuel' },
            { id: 'jetti', label: 'Jetti' },
            { id: 'ptt', label: 'PTT' },
            { id: 'flying-v', label: 'Flying V' },
        ],
    },
    {
        id: 'dining',
        title: 'Dining (Kainan)',
        iconLabel: 'K',
        options: [
            { id: 'fast-food', label: 'Fast Food' },
            { id: 'pasalubong', label: 'Pasalubong (Local Gifts)' },
            { id: 'coffee-shops', label: 'Coffee Shops' },
            { id: 'bulalohan', label: 'Bulalohan/Local Eats' },
            { id: 'drive-thru', label: 'Drive-Thru' },
            { id: 'resto-bars', label: 'Resto-Bars' },
            { id: 'vegan', label: 'Vegan' },
        ],
    },
    {
        id: 'essentials',
        title: 'Essentials (Amenities)',
        iconLabel: 'E',
        options: [
            { id: 'clean-toilets', label: 'Clean Toilets' },
            { id: 'atm-cash-point', label: 'ATM/Cash Point' },
            { id: 'seven-eleven-alfamart', label: '7-Eleven/Alfamart' },
            { id: 'tire-repair', label: 'Tire Repair' },
            { id: 'rfid-installation', label: 'RFID Installation' },
            { id: 'gcash-maya-ready', label: 'Gcash/Maya Ready' },
            { id: 'twenty-four-hour', label: '24-Hour' },
        ],
    },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

    const handleToggle = (categoryId: string, optionId: string, label: string) => {
        setSelectedFilters((previous) => (
            previous.includes(optionId)
                ? previous.filter((id) => id !== optionId)
                : [...previous, optionId]
        ));

        onFilterChange(categoryId, label);
    };

    const handleClearAll = () => {
        setSelectedFilters([]);
    };

    const renderSection = ({ id, title, iconLabel, options }: FilterCategory) => {
        const gridItems = options.length % 2 === 0
            ? options
            : [...options, { id: `${id}-placeholder`, label: '' }];

        return (
            <div className="filter-section" key={id}>
                <div className="filter-section__header">
                    <h4>{title}</h4>
                </div>
                <div className="filter-options">
                    {gridItems.map((option) => (
                        option.label ? (
                            <label
                                key={option.id}
                                className={`filter-chip${selectedFilters.includes(option.id) ? ' is-selected' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFilters.includes(option.id)}
                                    onChange={() => handleToggle(id, option.id, option.label)}
                                />
                                <span>
                                    <span className="filter-chip__icon" aria-hidden="true">{iconLabel}</span>
                                    <span className="filter-chip__label">{option.label}</span>
                                </span>
                            </label>
                        ) : (
                            <div
                                key={option.id}
                                className="filter-chip filter-chip--placeholder"
                                aria-hidden="true"
                            />
                        )
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="filter-panel">
            {FILTER_CATEGORIES.map(renderSection)}
            <button
                type="button"
                className="filter-panel__clear-btn"
                onClick={handleClearAll}
                disabled={selectedFilters.length === 0}
            >
                Clear All
            </button>
        </div>
    );
};

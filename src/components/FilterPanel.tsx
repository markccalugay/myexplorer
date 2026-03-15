import React, { useState } from 'react';

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

const FILTER_PANEL_STYLES = `
    .filter-panel {
        padding: 24px;
        background: #f3f4f6;
        border-top: 1px solid rgba(17, 24, 39, 0.06);
        border-radius: 24px;
        box-sizing: border-box;
        display: grid;
        gap: 20px;
    }

    .filter-section {
        display: grid;
        gap: 12px;
    }

    .filter-section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .filter-section h4 {
        margin: 0 0 3px 0;
        font-size: 10px;
        font-weight: 900;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }

    .filter-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
    }

    .filter-chip {
        display: block;
        width: 100%;
        cursor: pointer;
    }

    .filter-chip input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .filter-chip > span,
    .filter-chip--placeholder {
        width: 100%;
        min-width: 0;
        height: 56px;
        border-radius: 12px;
        box-sizing: border-box;
    }

    .filter-chip > span {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
        padding: 0 14px;
        text-align: left;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }

    .filter-chip__icon {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 800;
    }

    .filter-chip__label {
        min-width: 0;
    }

    .filter-chip input:checked + span,
    .filter-chip.is-selected > span {
        background: #111827;
        color: #ffffff;
        border-color: #111827;
        box-shadow: 0 10px 24px rgba(17, 24, 39, 0.16);
    }

    .filter-chip input:checked + span .filter-chip__icon,
    .filter-chip.is-selected > span .filter-chip__icon {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
    }

    .filter-chip:hover > span {
        border-color: #cbd5e1;
    }

    .filter-chip input:focus-visible + span {
        outline: 2px solid rgba(59, 130, 246, 0.7);
        outline-offset: 2px;
    }

    .filter-chip--placeholder {
        visibility: hidden;
    }

    .filter-panel__clear-btn {
        height: 44px;
        border: 1px solid #d1d5db;
        border-radius: 14px;
        background: #ffffff;
        color: #475569;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
    }

    .filter-panel__clear-btn:hover:not(:disabled) {
        border-color: #94a3b8;
        color: #0f172a;
    }

    .filter-panel__clear-btn:disabled {
        opacity: 0.45;
        cursor: default;
    }
`;

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
        <>
            <style>{FILTER_PANEL_STYLES}</style>
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
        </>
    );
};

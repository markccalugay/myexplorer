import React, { useState } from 'react';
import { getFilterIcon, RecommendationIcon } from './RecommendationIcon';

interface FilterPanelProps {
    onFilterChange: (category: 'fuel' | 'dining' | 'essentials', values: string[]) => void;
}

interface FilterOption {
    id: string;
    label: string;
}

interface FilterCategory {
    id: string;
    title: string;
    options: FilterOption[];
}

const FILTER_CATEGORIES: FilterCategory[] = [
    {
        id: 'fuel',
        title: 'Fuel (Gasolina)',
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
        background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
        border: 1px solid rgba(26, 115, 232, 0.12);
        border-top: none;
        border-radius: 0 0 24px 24px;
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
        color: #5e738d;
        text-transform: uppercase;
        letter-spacing: 0.08em;
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
        min-height: 56px;
        border-radius: 12px;
        box-sizing: border-box;
    }

    .filter-chip > span {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 10px;
        padding: 12px 14px;
        text-align: left;
        border: 1px solid rgba(26, 115, 232, 0.12);
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
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .filter-chip__icon svg {
        display: block;
    }

    .filter-chip__label {
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    .filter-chip input:checked + span {
        border-color: rgba(26, 115, 232, 0.45);
        box-shadow: inset 0 0 0 1px rgba(26, 115, 232, 0.45), 0 8px 18px rgba(26, 115, 232, 0.08);
        background: rgba(255, 255, 255, 0.96);
    }

    .filter-chip:hover > span {
        border-color: rgba(26, 115, 232, 0.24);
    }

    .filter-chip input:focus-visible + span {
        outline: 2px solid rgba(26, 115, 232, 0.4);
        outline-offset: 2px;
    }

    .filter-chip--placeholder {
        visibility: hidden;
    }

    .filter-panel__clear-btn {
        height: 44px;
        border: 1px solid rgba(26, 115, 232, 0.12);
        border-radius: 14px;
        background: #ffffff;
        color: var(--deep-ocean);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
    }

    .filter-panel__clear-btn:hover:not(:disabled) {
        border-color: rgba(26, 115, 232, 0.3);
        color: var(--deep-ocean);
    }

    .filter-panel__clear-btn:disabled {
        opacity: 0.45;
        cursor: default;
    }

    @media (max-width: 640px) {
        .filter-options {
            grid-template-columns: 1fr;
        }
    }
`;

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
        fuel: [],
        dining: [],
        essentials: [],
    });

    const handleToggle = (categoryId: 'fuel' | 'dining' | 'essentials', label: string) => {
        setSelectedFilters((previous) => {
            const currentValues = previous[categoryId] || [];
            const nextValues = currentValues.includes(label)
                ? currentValues.filter((value) => value !== label)
                : [...currentValues, label];

            onFilterChange(categoryId, nextValues);

            return {
                ...previous,
                [categoryId]: nextValues,
            };
        });
    };

    const handleClearAll = () => {
        setSelectedFilters({
            fuel: [],
            dining: [],
            essentials: [],
        });

        FILTER_CATEGORIES.forEach((category) => {
            onFilterChange(category.id as 'fuel' | 'dining' | 'essentials', []);
        });
    };

    const renderSection = ({ id, title, options }: FilterCategory) => {
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
                                className="filter-chip"
                            >
                                <input
                                    type="checkbox"
                                    checked={(selectedFilters[id] || []).includes(option.label)}
                                    onChange={() => handleToggle(id as 'fuel' | 'dining' | 'essentials', option.label)}
                                />
                                <span>
                                    <span className="filter-chip__icon" aria-hidden="true">
                                        <RecommendationIcon
                                            icon={getFilterIcon(id, option.id)}
                                            size={24}
                                        />
                                    </span>
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
                    disabled={Object.values(selectedFilters).every((values) => values.length === 0)}
                >
                    Clear All
                </button>
            </div>
        </>
    );
};

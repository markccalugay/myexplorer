/* eslint-disable react-refresh/only-export-components */
import React from 'react';

type RecommendationIconKey =
    | 'petron'
    | 'shell'
    | 'caltex'
    | 'phoenix'
    | 'unioil'
    | 'seaoil'
    | 'cleanfuel'
    | 'jetti'
    | 'ptt'
    | 'flying-v'
    | 'fuel'
    | 'fast-food'
    | 'pasalubong'
    | 'coffee-shops'
    | 'bulalohan'
    | 'drive-thru'
    | 'resto-bars'
    | 'vegan'
    | 'clean-toilets'
    | 'atm-cash-point'
    | 'seven-eleven-alfamart'
    | 'tire-repair'
    | 'rfid-installation'
    | 'gcash-maya-ready'
    | 'twenty-four-hour'
    | 'tourist_attraction'
    | 'park'
    | 'restaurant'
    | 'cafe'
    | 'meal_takeaway'
    | 'museum'
    | 'convenience_store'
    | 'rest_stop'
    | 'default';

interface RecommendationIconProps {
    icon: RecommendationIconKey;
    size?: number;
    title?: string;
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const BRAND_MATCHERS: Array<{ match: string; icon: RecommendationIconKey }> = [
    { match: 'petron', icon: 'petron' },
    { match: 'shell', icon: 'shell' },
    { match: 'caltex', icon: 'caltex' },
    { match: 'phoenix', icon: 'phoenix' },
    { match: 'unioil', icon: 'unioil' },
    { match: 'seaoil', icon: 'seaoil' },
    { match: 'cleanfuel', icon: 'cleanfuel' },
    { match: 'jetti', icon: 'jetti' },
    { match: 'ptt', icon: 'ptt' },
    { match: 'flying v', icon: 'flying-v' },
];

const PRIMARY_TYPE_ICON_MAP: Record<string, RecommendationIconKey> = {
    tourist_attraction: 'tourist_attraction',
    park: 'park',
    restaurant: 'restaurant',
    cafe: 'cafe',
    meal_takeaway: 'meal_takeaway',
    museum: 'museum',
    convenience_store: 'convenience_store',
    rest_stop: 'rest_stop',
    gas_station: 'fuel',
};

export const getFilterIcon = (categoryId: string, optionId: string): RecommendationIconKey => {
    if (categoryId === 'fuel') {
        return (BRAND_MATCHERS.find(({ icon }) => icon === optionId)?.icon ?? 'petron');
    }

    const categoryMap: Record<string, RecommendationIconKey> = {
        'fast-food': 'fast-food',
        pasalubong: 'pasalubong',
        'coffee-shops': 'coffee-shops',
        bulalohan: 'bulalohan',
        'drive-thru': 'drive-thru',
        'resto-bars': 'resto-bars',
        vegan: 'vegan',
        'clean-toilets': 'clean-toilets',
        'atm-cash-point': 'atm-cash-point',
        'seven-eleven-alfamart': 'seven-eleven-alfamart',
        'tire-repair': 'tire-repair',
        'rfid-installation': 'rfid-installation',
        'gcash-maya-ready': 'gcash-maya-ready',
        'twenty-four-hour': 'twenty-four-hour',
    };

    return categoryMap[optionId] ?? 'default';
};

export const resolveRecommendationIcon = (
    placeName?: string,
    primaryType?: string
): RecommendationIconKey => {
    const normalizedName = normalize(placeName);
    const brandMatch = BRAND_MATCHERS.find(({ match }) => normalizedName.includes(match));
    if (brandMatch) return brandMatch.icon;

    return PRIMARY_TYPE_ICON_MAP[normalize(primaryType)] ?? 'default';
};

const Svg = ({
    size = 24,
    title,
    children,
}: React.PropsWithChildren<{ size?: number; title?: string }>) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        role={title ? 'img' : 'presentation'}
        aria-hidden={title ? undefined : true}
        aria-label={title}
    >
        {children}
    </svg>
);

export const RecommendationIcon: React.FC<RecommendationIconProps> = ({ icon, size = 24, title }) => {
    switch (icon) {
        case 'petron':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#0F4C81" />
                    <rect x="5" y="6" width="14" height="2.4" rx="1.2" fill="#fff" />
                    <rect x="5" y="10.8" width="14" height="2.4" rx="1.2" fill="#E11D48" />
                    <rect x="5" y="15.6" width="14" height="2.4" rx="1.2" fill="#fff" />
                </Svg>
            );
        case 'shell':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#fff7ed" />
                    <path d="M6.5 17.5h11c-.4-4.1-2.9-7.6-5.5-10-2.6 2.4-5.1 5.9-5.5 10Z" fill="#FACC15" stroke="#DC2626" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M8 15.2h8M9.8 12.6h4.4M12 9.8v7.7" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'caltex':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#1D4ED8" />
                    <path d="m12 4.9 1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.7 1.9.7-4.1-3-2.9 4.1-.6L12 4.9Z" fill="#fff" />
                    <path d="M12 7.3 13 9.4l2.3.3-1.6 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.6-1.6 2.3-.3L12 7.3Z" fill="#EF4444" />
                </Svg>
            );
        case 'phoenix':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#7C2D12" />
                    <path d="M12 5c1.5 2.2 4.7 3.4 4.7 7.1A4.7 4.7 0 1 1 7.3 12c0-2.6 1.7-4.3 3.4-5.7-.1 1.8.5 3 1.8 3.8.3-1.7 1.1-3.3-.5-5.1Z" fill="#FB923C" />
                    <path d="M12.1 10.3c1 1.2 1.9 2 1.9 3.5a2.3 2.3 0 1 1-4.6 0c0-1.2.8-2 1.5-2.8.1.8.4 1.3 1.2 1.8Z" fill="#FDE68A" />
                </Svg>
            );
        case 'unioil':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#0F766E" />
                    <path d="M7 7v5.3a5 5 0 0 0 10 0V7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'seaoil':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#0EA5E9" />
                    <path d="M12 4.8c2 2.5 4.2 5 4.2 8a4.2 4.2 0 1 1-8.4 0c0-3 2.2-5.5 4.2-8Z" fill="#fff" />
                    <path d="M7 15.4c1.4.7 2.7 1.1 5 1.1 2.2 0 3.6-.4 5-1.1" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'cleanfuel':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#166534" />
                    <path d="M16.7 7.3c-4 .2-7.6 2.5-9.4 6.2 1.2 2.2 3.1 3.2 5.5 3.2 3.7 0 5.9-2.6 5.9-6.4 0-1.1-.4-2.2-2-3Z" fill="#86EFAC" />
                    <path d="M8.5 14.6c2.8-1.8 5.1-4 7.1-6.5" stroke="#166534" strokeWidth="1.3" strokeLinecap="round" />
                </Svg>
            );
        case 'jetti':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#111827" />
                    <path d="M5.2 13.1 19 8.1l-3.7 3 1.8 2-2.9-.6-2.4 4-1.4-2.8-5.2-.6Z" fill="#F97316" />
                </Svg>
            );
        case 'ptt':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#1D4ED8" />
                    <path d="M12 5.1c1.6 1.8 2.5 3 2.5 4.5a2.5 2.5 0 1 1-5 0c0-1.5.9-2.7 2.5-4.5Z" fill="#EF4444" />
                    <path d="M8 9.2c.9 1 1.4 1.8 1.4 2.6a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.6 1.4-2.6Zm8 0c.9 1 1.4 1.8 1.4 2.6a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.6 1.4-2.6Z" fill="#F8FAFC" />
                </Svg>
            );
        case 'flying-v':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#7F1D1D" />
                    <path d="M6 7.2 12 17l6-9.8h-3.4L12 11.6 9.4 7.2H6Z" fill="#FACC15" />
                </Svg>
            );
        case 'fuel':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#DBEAFE" />
                    <path d="M9 6.8h4.7v10.4H9V6.8Zm4.7 2.3h1.2c.7 0 1.3.6 1.3 1.3v4.7c0 .6.2 1 .8 1h.3" stroke="#1D4ED8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.2 9.2h2.3" stroke="#DBEAFE" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'fast-food':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FEF3C7" />
                    <path d="M7 10.1h10a2.3 2.3 0 0 0-2.2-1.8H9.2A2.3 2.3 0 0 0 7 10.1Zm0 1.6h10v4.3H7v-4.3Z" fill="#F59E0B" />
                    <path d="M8.2 13.8h7.6" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'pasalubong':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FCE7F3" />
                    <path d="M7.5 10h9v7h-9v-7Zm1.2 0c0-1.4 1-2.4 2.2-2.4.8 0 1.4.5 1.1 1.3-.4 1-1.5.8-1.5 1.1h3c0-.3-1.1-.1-1.5-1.1-.3-.8.3-1.3 1.1-1.3 1.2 0 2.2 1 2.2 2.4" stroke="#BE185D" strokeWidth="1.3" strokeLinejoin="round" />
                </Svg>
            );
        case 'coffee-shops':
        case 'cafe':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#EDE9FE" />
                    <path d="M7.5 10h7.5v4.2a2.8 2.8 0 0 1-2.8 2.8h-1.9a2.8 2.8 0 0 1-2.8-2.8V10Z" fill="#7C3AED" />
                    <path d="M15 11h1a1.7 1.7 0 1 1 0 3.4h-1" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M9 7.8c0 .8-.6 1-.6 1.8m2.4-1.8c0 .8-.6 1-.6 1.8m2.4-1.8c0 .8-.6 1-.6 1.8" stroke="#A78BFA" strokeWidth="1.1" strokeLinecap="round" />
                </Svg>
            );
        case 'bulalohan':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FFEDD5" />
                    <path d="M7 12.2h10a4.2 4.2 0 0 1-4.2 4.2h-1.6A4.2 4.2 0 0 1 7 12.2Z" fill="#EA580C" />
                    <path d="M9.2 9.2c0 .9-.7 1.2-.7 2.1m2.6-2.1c0 .9-.7 1.2-.7 2.1m2.6-2.1c0 .9-.7 1.2-.7 2.1" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'drive-thru':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#DBEAFE" />
                    <path d="M7.5 14.5h9l-1-3.2a1.5 1.5 0 0 0-1.4-1H9.9a1.5 1.5 0 0 0-1.4 1l-1 3.2Z" fill="#2563EB" />
                    <circle cx="9.6" cy="15.5" r="1.2" fill="#fff" />
                    <circle cx="14.4" cy="15.5" r="1.2" fill="#fff" />
                </Svg>
            );
        case 'resto-bars':
        case 'restaurant':
        case 'meal_takeaway':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#DCFCE7" />
                    <path d="M8.5 6.8v4.8M7.3 6.8v2.6m2.4-2.6v2.6M8.5 11.6V17m5-10.2v5.6m0 0c0 1.7-.8 2.7-2 3.6" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'vegan':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#DCFCE7" />
                    <path d="M17 7.5c-4.5.2-7.8 2.7-9.4 7.2 1.2 1.3 2.8 1.8 4.5 1.8 3.4 0 5.6-2.4 5.6-6.1 0-1-.3-2-.7-2.9Z" fill="#22C55E" />
                    <path d="M8.6 14.4c2.3-1.6 4.6-3.6 6.6-5.9" stroke="#166534" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'clean-toilets':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#E0F2FE" />
                    <path d="M9.2 7.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm5.6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM9.2 10.2v6.6m5.6-6.6v6.6M7.4 13.1h3.6m2 0h3.6" stroke="#0284C7" strokeWidth="1.4" strokeLinecap="round" />
                </Svg>
            );
        case 'atm-cash-point':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#ECFCCB" />
                    <rect x="5.8" y="7.2" width="12.4" height="9.6" rx="2" fill="#65A30D" />
                    <path d="M8.4 10.3h7.2M8.4 13.7h4.3" stroke="#F7FEE7" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'seven-eleven-alfamart':
        case 'convenience_store':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#F1F5F9" />
                    <path d="M7.2 7.1h9.6V17H7.2V7.1Z" fill="#F97316" />
                    <path d="M7.2 10.2h9.6" stroke="#22C55E" strokeWidth="2" />
                    <path d="M10 7.1v9.9m4-9.9v9.9" stroke="#FFF7ED" strokeWidth="1" />
                </Svg>
            );
        case 'tire-repair':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#E5E7EB" />
                    <circle cx="12" cy="12" r="5.4" fill="#374151" />
                    <circle cx="12" cy="12" r="2.2" fill="#D1D5DB" />
                    <path d="M12 6.6v2m0 6.8v2m5.4-5.4h-2m-6.8 0h-2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'rfid-installation':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FEF2F2" />
                    <path d="M7.2 14.8h9.6V9.2H7.2v5.6Z" fill="#DC2626" />
                    <path d="M10.1 7.5c1 .4 1.8 1.2 2.2 2.2m1.3-3.3c1.8.7 3.2 2.2 4 4" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'gcash-maya-ready':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#EFF6FF" />
                    <rect x="7.2" y="5.8" width="9.6" height="12.4" rx="2" fill="#2563EB" />
                    <circle cx="12" cy="14.7" r="1.1" fill="#DBEAFE" />
                    <path d="M9.4 8.9h5.2m-5.2 2.4h5.2" stroke="#DBEAFE" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'twenty-four-hour':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FFF7ED" />
                    <path d="M12 6.3a5.7 5.7 0 1 1-5.2 3.5" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 8.5v3.7l2.5 1.6" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M6.1 7.2h2.8v2.8" stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'tourist_attraction':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#FDF2F8" />
                    <path d="M12 5.8a4.4 4.4 0 0 1 4.4 4.4c0 3.1-4.4 8-4.4 8s-4.4-4.9-4.4-8A4.4 4.4 0 0 1 12 5.8Z" fill="#DB2777" />
                    <path d="m12 8.5.8 1.7 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3.8-1.7Z" fill="#FCE7F3" />
                </Svg>
            );
        case 'park':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#ECFCCB" />
                    <path d="M12 6.4 8.2 11h1.9l-1.8 2.2h2.2L9 15.8h6L13.6 13h2.2L14 11h1.8L12 6.4Z" fill="#16A34A" />
                    <path d="M12 15.8v2.3" stroke="#854D0E" strokeWidth="1.2" strokeLinecap="round" />
                </Svg>
            );
        case 'museum':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#F3F4F6" />
                    <path d="M6.8 9.1 12 6.5l5.2 2.6M8 10.2v5.4m2.7-5.4v5.4m2.6-5.4v5.4M6.5 16.6h11" stroke="#4B5563" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'rest_stop':
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#E0F2FE" />
                    <path d="M8 7.8h8v8.4H8V7.8Z" stroke="#0369A1" strokeWidth="1.4" />
                    <path d="M10 10.2h4m-4 2.4h4" stroke="#0369A1" strokeWidth="1.4" strokeLinecap="round" />
                </Svg>
            );
        default:
            return (
                <Svg size={size} title={title}>
                    <circle cx="12" cy="12" r="12" fill="#E2E8F0" />
                    <path d="M12 6.6a4.2 4.2 0 0 1 4.2 4.2c0 2.9-4.2 7.2-4.2 7.2s-4.2-4.3-4.2-7.2A4.2 4.2 0 0 1 12 6.6Z" fill="#64748B" />
                    <circle cx="12" cy="10.8" r="1.5" fill="#E2E8F0" />
                </Svg>
            );
    }
};

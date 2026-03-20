import { Stop } from '../types/trip';

const STOP_COLORS = {
    start: '#1e88e5',
    destination: '#34a853',
    suggested: '#f29900',
    stop: '#5f6368',
} as const;

export const getStopColor = (stop: Stop): string => {
    if (stop.type === 'start') return STOP_COLORS.start;
    if (stop.type === 'destination') return STOP_COLORS.destination;
    if (stop.isAutoSuggested) return STOP_COLORS.suggested;
    return STOP_COLORS.stop;
};

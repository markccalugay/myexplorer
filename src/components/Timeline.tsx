import React from 'react';
import { Trip } from '../types/trip';
import { StopCard } from './StopCard';
import './Timeline.css';

interface TimelineProps {
    trip: Trip;
    onRemoveStop: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ trip, onRemoveStop }) => {
    return (
        <div className="trip-timeline">
            {trip.stops.length === 0 ? (
                <div className="timeline-empty">
                    <p>Start by adding your home or a starting location.</p>
                </div>
            ) : (
                trip.stops.map((stop, index) => (
                    <StopCard
                        key={stop.id}
                        stop={stop}
                        index={index}
                        onRemove={onRemoveStop}
                    />
                ))
            )}
        </div>
    );
};

import React from 'react';
import { Stop } from '../types/trip';
import './StopCard.css';

interface StopCardProps {
    stop: Stop;
    index: number;
    onRemove?: (id: string) => void;
}

export const StopCard: React.FC<StopCardProps> = ({ stop, index, onRemove }) => {
    return (
        <div className={`stop-card ${stop.type}`}>
            <div className="stop-marker-line">
                <div className="dot"></div>
                <div className="line"></div>
            </div>

            <div className="stop-content">
                <div className="stop-header">
                    <span className="stop-label">
                        {stop.type === 'start' ? 'START' : stop.type === 'destination' ? 'DESTINATION' : `STOP ${index}`}
                    </span>
                    {onRemove && stop.type === 'stop' && (
                        <button className="remove-stop" onClick={() => onRemove(stop.id)}>×</button>
                    )}
                </div>

                <h4 className="stop-name">{stop.name}</h4>
                {stop.category && <span className="stop-category">{stop.category}</span>}

                <div className="stop-details">
                    {stop.distanceFromPrevious && (
                        <span className="detail-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {stop.distanceFromPrevious} km
                        </span>
                    )}
                    {stop.arrivalTime && (
                        <span className="detail-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            {stop.arrivalTime}
                        </span>
                    )}
                </div>

                {stop.rating && (
                    <div className="stop-rating">
                        {stop.rating} ★
                    </div>
                )}
            </div>
        </div>
    );
};

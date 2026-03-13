import React, { useState } from 'react';
import { Stop } from '../types/trip';
import './StopCard.css';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { BASIC_PLACE_FIELDS, fetchPlaceFromPrediction } from '../lib/googlePlaces';

interface StopCardProps {
    stop: Stop;
    index: number;
    onRemove?: (id: string) => void;
    onEdit?: (id: string) => void;
    onStopEdited?: (id: string, updated: Stop) => void;
    isEditing?: boolean;
    isDragOver?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

export const StopCard: React.FC<StopCardProps> = ({
    stop,
    index,
    onRemove,
    onEdit,
    onStopEdited,
    isEditing = false,
    isDragOver = false,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) => {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCardClick = () => {
        if (!isEditing && onEdit) {
            setShowConfirm(true);
        }
    };

    const handleConfirm = () => {
        setShowConfirm(false);
        if (onEdit) onEdit(stop.id);
    };

    const handleCancel = () => {
        setShowConfirm(false);
    };

    const stopLabel =
        stop.type === 'start'
            ? 'ORIGIN'
            : stop.type === 'destination'
            ? 'DESTINATION'
            : stop.isAutoSuggested
            ? `PITSTOP ${index}`
            : `STOP ${index}`;

    return (
        <div
            className={`stop-card ${stop.type}${isDragOver ? ' drag-over' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            {/* Confirmation overlay */}
            {showConfirm && (
                <div className="edit-confirm-overlay" onClick={(e) => e.stopPropagation()}>
                    <p>Change this stop?</p>
                    <div className="edit-confirm-actions">
                        <button className="confirm-yes" onClick={handleConfirm}>Yes, edit</button>
                        <button className="confirm-no" onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="stop-marker-line">
                <div className="dot" />
                <div className="line" />
            </div>

            <div className="stop-content" onClick={handleCardClick}>
                {/* Drag handle */}
                <span
                    className="drag-handle"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                >
                    ⠿
                </span>

                <div className="stop-header">
                    <span className="stop-label">{stopLabel}</span>
                    <div className="stop-header-right">
                        {stop.isAutoSuggested && (
                            <span className="suggested-badge">✦ Suggested</span>
                        )}
                        {onRemove && stop.type !== 'start' && (
                            <button
                                className="remove-stop"
                                onClick={(e) => { e.stopPropagation(); onRemove(stop.id); }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="edit-input-wrap">
                        <div onClick={(e) => e.stopPropagation()}>
                            <PlaceAutocompleteInput
                                className="stop-edit-input"
                                placeholder="Search for a new location..."
                                defaultValue={stop.name}
                                onSelect={async (prediction) => {
                                    const place = await fetchPlaceFromPrediction(prediction, BASIC_PLACE_FIELDS);
                                    if (place && onStopEdited) {
                                        const updated: Stop = {
                                            ...stop,
                                            name: place.name,
                                            formattedAddress: place.formattedAddress,
                                            location: place.location,
                                        };
                                        onStopEdited(stop.id, updated);
                                    }
                                }}
                            />
                        </div>
                        <button
                            className="cancel-edit"
                            onClick={(e) => { e.stopPropagation(); onStopEdited && onStopEdited(stop.id, stop); }}
                        >
                            Keep current
                        </button>
                    </div>
                ) : (
                    <>
                        <h4 className="stop-name">{stop.name}</h4>
                        {stop.formattedAddress && (
                            <p className="stop-address">{stop.formattedAddress}</p>
                        )}
                        {stop.category && (
                            <span className="stop-category">{stop.category}</span>
                        )}
                    </>
                )}

                <div className="stop-details">
                    {stop.distanceFromPrevious != null && (
                        <span className="detail-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {stop.distanceFromPrevious} km
                        </span>
                    )}
                    {stop.arrivalTime && (
                        <span className="detail-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {stop.arrivalTime}
                        </span>
                    )}
                </div>

                {stop.rating != null && (
                    <div className="stop-rating">{stop.rating} ★</div>
                )}
            </div>
        </div>
    );
};

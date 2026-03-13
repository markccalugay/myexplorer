import React, { useRef, useState } from 'react';
import { Trip, Stop } from '../types/trip';
import { StopCard } from './StopCard';
import './Timeline.css';

interface TimelineProps {
    trip: Trip;
    onRemoveStop: (id: string) => void;
    onEditStop: (id: string) => void;
    onStopEdited: (id: string, updated: Stop) => void;
    onReorder: (newStops: Stop[]) => void;
    editingStopId: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({
    trip,
    onRemoveStop,
    onEditStop,
    onStopEdited,
    onReorder,
    editingStopId,
}) => {
    const dragIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        dragIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragIndexRef.current;
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const newStops = [...trip.stops];
        const [dragged] = newStops.splice(dragIndex, 1);
        newStops.splice(dropIndex, 0, dragged);

        // Re-type: first is always start, last is destination if it was before
        const retyped = newStops.map((s, i) => {
            if (i === 0) return { ...s, type: 'start' as const };
            if (i === newStops.length - 1 && (s.type === 'destination' || newStops.length > 1))
                return { ...s, type: 'destination' as const };
            return { ...s, type: 'stop' as const };
        });

        onReorder(retyped);
        dragIndexRef.current = null;
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        dragIndexRef.current = null;
        setDragOverIndex(null);
    };

    if (trip.stops.length === 0) {
        return (
            <div className="timeline-empty">
                <p>Add your origin to start building the route.</p>
            </div>
        );
    }

    return (
        <div className="trip-timeline">
            {trip.stops.map((stop, index) => (
                <StopCard
                    key={stop.id}
                    stop={stop}
                    index={index}
                    onRemove={onRemoveStop}
                    onEdit={onEditStop}
                    onStopEdited={onStopEdited}
                    isEditing={editingStopId === stop.id}
                    isDragOver={dragOverIndex === index}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                />
            ))}
        </div>
    );
};

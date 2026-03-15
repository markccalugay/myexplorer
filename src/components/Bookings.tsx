import React from 'react';
import { Trip } from '../types/trip';
import './Bookings.css';

interface BookingsProps {
    trips: Trip[];
    onOpenTrip: (trip: Trip) => void;
    onCreateTrip: () => void;
}

const formatTripTitle = (trip: Trip) => {
    const start = trip.stops[0]?.name;
    const destination = trip.stops[trip.stops.length - 1]?.name;

    if (start && destination && start !== destination) {
        return `${start} to ${destination}`;
    }

    if (start) return start;
    return trip.name || 'Untitled trip';
};

const formatUpdatedAt = (value?: string) => {
    if (!value) return 'Not saved yet';

    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export const Bookings: React.FC<BookingsProps> = ({ trips, onOpenTrip, onCreateTrip }) => {
    return (
        <div className="bookings-page">
            <section className="bookings-hero">
                <div>
                    <p className="bookings-eyebrow">Bookings</p>
                    <h1>Saved trips, ready when you are.</h1>
                    <p>
                        Keep every stop, destination, and route detail in one place so you can reopen a trip later and head out with one tap.
                    </p>
                </div>
                <button type="button" className="bookings-primary-btn" onClick={onCreateTrip}>
                    Plan a New Trip
                </button>
            </section>

            {trips.length > 0 ? (
                <section className="bookings-grid">
                    {trips.map((trip) => (
                        <article key={trip.id} className="booking-card">
                            <div className="booking-card__top">
                                <div>
                                    <p className="booking-card__eyebrow">Trip</p>
                                    <h2>{formatTripTitle(trip)}</h2>
                                </div>
                                <span className="booking-card__badge">
                                    {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
                                </span>
                            </div>

                            <div className="booking-card__route">
                                <div>
                                    <span className="booking-card__label">Origin</span>
                                    <strong>{trip.stops[0]?.name || 'Add an origin'}</strong>
                                </div>
                                <div>
                                    <span className="booking-card__label">Destination</span>
                                    <strong>{trip.stops[trip.stops.length - 1]?.name || 'Add a destination'}</strong>
                                </div>
                            </div>

                            <div className="booking-card__meta">
                                <span>Updated {formatUpdatedAt(trip.updatedAt || trip.savedAt)}</span>
                            </div>

                            <button
                                type="button"
                                className="bookings-secondary-btn"
                                onClick={() => onOpenTrip(trip)}
                            >
                                Open Trip
                            </button>
                        </article>
                    ))}
                </section>
            ) : (
                <section className="bookings-empty">
                    <h2>No saved trips yet</h2>
                    <p>Save a route from the trip planner and it will appear here for quick access later.</p>
                    <button type="button" className="bookings-primary-btn" onClick={onCreateTrip}>
                        Create Your First Trip
                    </button>
                </section>
            )}
        </div>
    );
};

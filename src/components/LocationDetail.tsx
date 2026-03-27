import React from 'react';
import { Button } from './Button';
import './LocationDetail.css';
import { AppPlace } from '../types/place';

interface LocationDetailProps {
    place: AppPlace;
    onClose: () => void;
    onPlanTrip: (place: AppPlace) => void;
}

export const LocationDetail: React.FC<LocationDetailProps> = ({ place, onClose, onPlanTrip }) => {
    const summary = typeof place.summary === 'string' ? place.summary : place.summary?.text;

    return (
        <div className="location-detail-overlay">
            <div className="location-detail-panel">
                <button className="close-button" onClick={onClose}>×</button>

                <div className="detail-hero">
                    <img
                        src={place.photoUrl || ''}
                        alt={place.name}
                        className="detail-main-image"
                    />
                </div>

                <div className="detail-info">
                    <h1 className="detail-title">{place.name}</h1>
                    <div className="detail-meta">
                        <span className="detail-rating">★ {place.rating}</span>
                        <span className="detail-address">{place.formattedAddress}</span>
                    </div>

                    <div className="detail-section">
                        <h3>About</h3>
                        <p>{summary || 'Experience comfort and local charm at this beautiful location in the heart of the Philippines.'}</p>
                    </div>

                    <div className="detail-section">
                        <h3>Contact Information</h3>
                        {place.nationalPhoneNumber && <p><strong>Phone:</strong> {place.nationalPhoneNumber}</p>}
                        {place.websiteUri && <p><strong>Website:</strong> <a href={place.websiteUri} target="_blank" rel="noreferrer">Visit website</a></p>}
                    </div>

                    <div className="detail-attribution" role="note">
                        Place details, ratings, photos, and map-linked metadata in this panel may come from Google Maps Platform.
                    </div>

                    <div className="detail-actions">
                        <Button variant="cta" onClick={() => onPlanTrip(place)}>Plan Trip</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

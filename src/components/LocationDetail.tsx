import React from 'react';
import { Button } from './Button';
import './LocationDetail.css';

interface LocationDetailProps {
    place: google.maps.places.PlaceResult;
    onClose: () => void;
    onPlanTrip: (place: google.maps.places.PlaceResult) => void;
}

export const LocationDetail: React.FC<LocationDetailProps> = ({ place, onClose, onPlanTrip }) => {
    return (
        <div className="location-detail-overlay">
            <div className="location-detail-panel">
                <button className="close-button" onClick={onClose}>×</button>

                <div className="detail-hero">
                    <img
                        src={place.photos?.[0]?.getUrl({ maxWidth: 800 }) || ''}
                        alt={place.name}
                        className="detail-main-image"
                    />
                </div>

                <div className="detail-info">
                    <h1 className="detail-title">{place.name}</h1>
                    <div className="detail-meta">
                        <span className="detail-rating">★ {place.rating}</span>
                        <span className="detail-address">{place.formatted_address || place.vicinity}</span>
                    </div>

                    <div className="detail-section">
                        <h3>About</h3>
                        <p>{(place as any).editorial_summary?.overview || "Experience comfort and local charm at this beautiful location in the heart of the Philippines."}</p>
                    </div>

                    <div className="detail-section">
                        <h3>Contact Information</h3>
                        {place.formatted_phone_number && <p><strong>Phone:</strong> {place.formatted_phone_number}</p>}
                        {place.website && <p><strong>Website:</strong> <a href={place.website} target="_blank" rel="noreferrer">Visit website</a></p>}
                    </div>

                    <div className="detail-actions">
                        <Button variant="cta" onClick={() => onPlanTrip(place)}>Plan Trip</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

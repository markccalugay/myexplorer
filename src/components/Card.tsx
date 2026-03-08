import React from 'react';
import './Card.css';

interface DestinationCardProps {
    image: string;
    location: string;
    rating: number;
    price: string;
    title: string;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
    image,
    location,
    rating,
    price,
    title,
}) => {
    return (
        <div className="card destination-card">
            <div className="card-image-container">
                <img src={image} alt={title} className="card-image" />
                <div className="card-badge">Top Rated</div>
            </div>
            <div className="card-content">
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                    <div className="card-rating">
                        <span className="star-icon">★</span>
                        {rating}
                    </div>
                </div>
                <p className="card-location">{location}</p>
                <div className="card-footer">
                    <span className="card-price"><strong>{price}</strong> / night</span>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';
import './Navbar.css';

interface NavbarProps {
    onStartPlanning?: () => void;
    onExplore?: () => void;
    onOpenBookings?: () => void;
    activeView?: 'explore' | 'discovery' | 'planner' | 'bookings';
}

export const Navbar: React.FC<NavbarProps> = ({ onStartPlanning, onExplore, onOpenBookings, activeView }) => {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo" onClick={onExplore} style={{ cursor: 'pointer' }}>
                    <BrandLogo className="navbar-brand-logo" />
                </div>

                <div className="navbar-links">
                    <a href="#" className={`nav-link ${(activeView === 'explore' || activeView === 'discovery') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onExplore?.(); }}>Explore</a>
                    <a href="#" className={`nav-link ${activeView === 'planner' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onStartPlanning?.(); }}>Trips</a>
                    <a href="#" className={`nav-link ${activeView === 'bookings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onOpenBookings?.(); }}>Bookings</a>
                </div>

                <div className="navbar-actions">
                    <Button variant="primary" className="nav-btn" onClick={onStartPlanning}>Start Planning</Button>
                    <div className="user-profile">
                        <div className="profile-placeholder"></div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

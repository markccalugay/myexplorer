import React from 'react';
import { Button } from './Button';
import './Navbar.css';

interface NavbarProps {
    onStartPlanning?: () => void;
    onExplore?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartPlanning, onExplore }) => {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo" onClick={onExplore} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>
                    <span className="logo-text">MyExplorer</span>
                </div>

                <div className="navbar-links">
                    <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onExplore?.(); }}>Explore</a>
                    <a href="#" className="nav-link">Trips</a>
                    <a href="#" className="nav-link">Bookings</a>
                </div>

                <div className="navbar-actions">
                    <Button variant="secondary" className="nav-btn">Sign In</Button>
                    <Button variant="primary" className="nav-btn" onClick={onStartPlanning}>Start Planning</Button>
                    <div className="user-profile">
                        <div className="profile-placeholder"></div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

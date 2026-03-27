import React from 'react';
import { BrandLogo } from './BrandLogo';
import './SiteFooter.css';

interface SiteFooterProps {
    onNavigate: (view: 'privacy' | 'terms' | 'attribution' | 'permissions' | 'support') => void;
}

const legalLinks: Array<{ label: string; view: 'privacy' | 'terms' | 'attribution' | 'permissions' | 'support' }> = [
    { label: 'Privacy Policy', view: 'privacy' },
    { label: 'Terms of Service', view: 'terms' },
    { label: 'Maps & Attribution', view: 'attribution' },
    { label: 'Permissions & Device Access', view: 'permissions' },
    { label: 'Support', view: 'support' },
];

export const SiteFooter: React.FC<SiteFooterProps> = ({ onNavigate }) => (
    <footer className="site-footer">
        <div className="site-footer__content">
            <div className="site-footer__brand">
                <BrandLogo className="site-footer__logo" />
                <p>
                    MyExplorer helps travelers plan, save, and reopen trips with Google Maps Platform-powered discovery and optional location-aware navigation flows.
                </p>
            </div>

            <nav className="site-footer__nav" aria-label="Footer">
                {legalLinks.map((link) => (
                    <button
                        key={link.view}
                        type="button"
                        className="site-footer__link"
                        onClick={() => onNavigate(link.view)}
                    >
                        {link.label}
                    </button>
                ))}
            </nav>
        </div>

        <div className="site-footer__meta">
            <span>© 2026 MyExplorer. All rights reserved.</span>
            <span>Google Maps Platform attribution appears throughout map-powered surfaces where applicable.</span>
        </div>
    </footer>
);

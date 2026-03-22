import React from 'react';
import logoUrl from '../assets/logo_myexplorer.svg';
import './BrandLogo.css';

interface BrandLogoProps {
    className?: string;
    label?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', label = 'MyExplorer' }) => {
    const classes = ['brand-logo', className].filter(Boolean).join(' ');
    const logoStyle = { '--brand-logo-image': `url(${logoUrl})` } as React.CSSProperties;

    return (
        <span className={classes} role="img" aria-label={label}>
            <span
                className="brand-logo__mark"
                style={logoStyle}
                aria-hidden="true"
            />
        </span>
    );
};

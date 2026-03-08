import React from 'react';
import './Button.css';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'cta';
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    children,
    onClick,
    className = '',
    disabled = false,
}) => {
    return (
        <button
            className={`btn btn-${variant} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

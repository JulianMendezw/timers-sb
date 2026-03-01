import React from 'react';
import './Footer.scss';

const Footer: React.FC = () => {
    return (
        <footer className="footer-minimal footer-minimal--fixed">
            <small>© {new Date().getFullYear()} Julian Mendez · v{import.meta.env.VITE_APP_VERSION}</small>
        </footer>

    );
};

export default Footer;

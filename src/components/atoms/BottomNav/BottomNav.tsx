import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { GrDocumentTime, GrDocumentPerformance, GrDocumentText } from 'react-icons/gr';
import './BottomNav.scss';

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/timers', label: 'Timers', icon: <GrDocumentTime /> },
    { path: '/files', label: 'Files', icon: <GrDocumentPerformance /> },
    { path: '/documentation', label: 'Docs', icon: <GrDocumentText /> },
  ];

  return (<>
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`bottom-nav__item ${location.pathname === item.path ? 'active' : ''}`}
          title={item.label}
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  </>
  );
};

export default BottomNav;
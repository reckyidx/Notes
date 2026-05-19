import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      <ScrollToTop />
      <header className="app-header">
        <nav>
          <Link to="/" className={`header-brand ${isActive('/') ? 'active' : ''}`}>
            Interview Prep Notes
          </Link>
          <Link to="/interview-prep" className={isActive('/interview-prep') ? 'active' : ''}>
            Interview Prep
          </Link>
          <Link to="/system-design" className={isActive('/system-design') ? 'active' : ''}>
            System Design
          </Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pill, LayoutDashboard, Calendar, BarChart3, LogOut } from 'lucide-react';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Pill size={28} />
        <span>MedTrack</span>
      </div>

      <div className="nav-links">
        <Link to="/dashboard" className={isActive('/dashboard')}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link to="/medications" className={isActive('/medications')}>
          <Calendar size={20} />
          Medications
        </Link>
        <Link to="/analytics" className={isActive('/analytics')}>
          <BarChart3 size={20} />
          Analytics
        </Link>
      </div>

      <div className="nav-user">
        <span className="user-name">{user?.username}</span>
        <button onClick={onLogout} className="btn-logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

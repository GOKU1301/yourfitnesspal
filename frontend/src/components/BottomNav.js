import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUpload, FaChartBar, FaAppleAlt, FaHome } from 'react-icons/fa';

const BottomNav = ({ onShowTimetable }) => {
  const location = useLocation();
  return (
    <nav className="bottom-nav">
      <Link to="/login" className={`bottom-nav-item${location.pathname === '/login' ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><FaUpload /></span>Upload
      </Link>
      <button
        className="bottom-nav-item"
        style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none', color: 'inherit' }}
        onClick={onShowTimetable}
      >
        <span className="bottom-nav-icon"><FaChartBar /></span>Mess Timetable
      </button>
      <Link to="/getnutrition" className={`bottom-nav-item${location.pathname === '/getnutrition' ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><FaAppleAlt /></span>Nutrition
      </Link>
      <Link to="/" className={`bottom-nav-item${location.pathname === '/' ? ' active' : ''}`}>
        <span className="bottom-nav-icon"><FaHome /></span>Dashboard
      </Link>
    </nav>
  );
};

export default BottomNav;

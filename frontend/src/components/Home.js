import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUpload, FaChartBar, FaAppleAlt, FaUserCircle } from 'react-icons/fa';

import { useState } from 'react';

const Home = () => {
  const location = useLocation();
  const [showTimetable, setShowTimetable] = useState(false);

  return (
    <>
      {/* Modal for Mess Timetable */}
      {showTimetable && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#222', padding: 24, borderRadius: 12, position: 'relative', boxShadow: '0 2px 18px rgba(0,0,0,0.7)' }}>
            <button onClick={() => setShowTimetable(false)} style={{ position: 'absolute', top: 10, right: 10, background: '#6366f1', color: 'white', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            <img 
              src={
                process.env.NODE_ENV === 'production'
                  ? 'https://yourfitnesspal-production.up.railway.app/timetable-image'
                  : 'http://localhost:5000/timetable-image'
              } 
              alt="Mess Timetable" 
              style={{ 
                maxWidth: '80vw', 
                maxHeight: '75vh', 
                borderRadius: 8, 
                boxShadow: '0 2px 18px rgba(0,0,0,0.3)' 
              }} 
              onError={(e) => {
                console.error('Error loading timetable image');
                e.target.onerror = null;
                e.target.src = process.env.PUBLIC_URL + '/images/timetable-placeholder.png';
              }}
            />
          </div>
        </div>
      )}

      <main style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'82vh',background:'none',boxShadow:'none',padding:'0'}}>
        <img 
          src={process.env.PUBLIC_URL + '/images/jiitnoida.webp'} 
          alt="JIIT Noida" 
          style={{
            width:'100%',
            maxWidth:'1100px',
            height:'auto',
            maxHeight:'85vh',
            borderRadius:'8px',
            boxShadow:'0 2px 18px rgba(0,0,0,0.20)',
            border:'none',
            background:'none',
            objectFit:'cover',
            display:'block',
          }}
        />
      </main>
      <nav className="bottom-nav">
        <Link to="/login" className={`bottom-nav-item${location.pathname==='/login'?' active':''}`}><span className="bottom-nav-icon"><FaUpload /></span>Upload</Link>
        <button 
          className="bottom-nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none', color: 'inherit' }}
          onClick={() => setShowTimetable(true)}
        >
          <span className="bottom-nav-icon"><FaChartBar /></span>Mess Timetable
        </button>
        <Link to="/getnutrition" className={`bottom-nav-item${location.pathname==='/getnutrition'?' active':''}`}><span className="bottom-nav-icon"><FaAppleAlt /></span>Nutrition</Link>
        <Link to="/profile" className={`bottom-nav-item${location.pathname==='/profile'?' active':''}`}><span className="bottom-nav-icon"><FaUserCircle /></span>Profile</Link>
      </nav>
    </>
  );
};

export default Home;

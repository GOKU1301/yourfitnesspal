import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUpload, FaChartBar, FaAppleAlt, FaUserCircle } from 'react-icons/fa';

import { useState, useEffect } from 'react';
import axios from 'axios';

// Separate component to handle timetable image loading with proper error states
const TimetableImage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  useEffect(() => {
    // Reset states when component mounts
    setLoading(true);
    setError(false);
    
    // Use environment variable with fallback for API URL
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    // Standardize the API_URL format to ensure correct path
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      
    // Add cache-busting parameter to prevent browser caching
    const url = `${apiUrl}/timetable/current?t=${new Date().getTime()}`;
    setImageUrl(url);
    
    // Check if image exists using a HEAD request first to avoid infinite loop
    axios.head(url)
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [retryCount]);
  
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
    }
  };
  
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid #f3f3f3', 
          borderTop: '5px solid #6366f1', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '1rem', color: '#fff' }}>Loading timetable...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: '400px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Unable to load timetable image</h3>
          <p>The timetable image could not be loaded. This might happen if no timetable has been uploaded yet.</p>
          {retryCount < maxRetries && (
            <button 
              onClick={handleRetry}
              style={{ 
                background: '#6366f1', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '8px 16px', 
                marginTop: '1rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={imageUrl} 
      alt="Mess Timetable" 
      style={{ 
        maxWidth: '80vw', 
        maxHeight: '75vh', 
        borderRadius: 8, 
        boxShadow: '0 2px 18px rgba(0,0,0,0.3)' 
      }}
      onError={() => setError(true)}
    />
  );
};

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
            <TimetableImage />
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

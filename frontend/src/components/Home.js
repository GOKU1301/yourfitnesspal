import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import TimetableModal from './TimetableModal';

const Home = () => {
  const location = useLocation();
  const [showTimetable, setShowTimetable] = useState(false);
  
  // Add responsive styles for the main image
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .main-image-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        margin: 0;
        padding: 0;
        background: none;
        box-shadow: none;
        z-index: 0;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .main-dashboard-image {
        width: 70vw;
        height: 70vh;
        object-fit: contain;
        border: none;
        background: none;
        margin: 0;
        padding: 0;
        display: block;
        border-radius: 0;
        box-shadow: none;
      }
      
      /* Responsive adjustments for mobile */
      @media (max-width: 768px) {
        .main-dashboard-image {
          width: 90vw;
          height: 60vh;
        }
      }
      
      @media (max-width: 480px) {
        .main-dashboard-image {
          width: 95vw;
          height: 50vh;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {/* Timetable Modal */}
      <TimetableModal isOpen={showTimetable} onClose={() => setShowTimetable(false)} />

      <main className="main-image-container">
        <img
          src={process.env.PUBLIC_URL + '/images/jiitnoida.webp'}
          alt="JIIT Noida"
          className="main-dashboard-image"
        />
      </main>
      <BottomNav onShowTimetable={() => setShowTimetable(true)} />
    </>
  );
};

export default Home;

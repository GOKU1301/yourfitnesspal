import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import TimetableModal from './TimetableModal';

const Home = () => {
  const location = useLocation();
  const [showTimetable, setShowTimetable] = useState(false);

  return (
    <>
      {/* Timetable Modal */}
      <TimetableModal isOpen={showTimetable} onClose={() => setShowTimetable(false)} />

      <main style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        background: 'none',
        boxShadow: 'none',
        zIndex: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <img
          src={process.env.PUBLIC_URL + '/images/jiitnoida.webp'}
          alt="JIIT Noida"
          style={{
            width: '70vw',
            height: '70vh',
            objectFit: 'cover',
            border: 'none',
            background: 'none',
            margin: 0,
            padding: 0,
            display: 'block',
            borderRadius: 0,
            boxShadow: 'none'
          }}
        />
      </main>
      <BottomNav onShowTimetable={() => setShowTimetable(true)} />
    </>
  );
};

export default Home;

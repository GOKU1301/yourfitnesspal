import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero">
        <h1>Welcome to YourFitnessPal</h1>
        <p className="lead">Your personal college meal planner and nutrition tracker</p>
        
        <div className="cta-buttons">
          <Link 
            to="/login" 
            className="btn btn-primary btn-upload"
            state={{ fromUpload: true }}
          >
            Upload Timetable (Admin Login Required)
          </Link>
          <Link 
            to="/getnutrition" 
            className="btn btn-secondary btn-nutrition"
          >
            Get Nutrition
          </Link>
        </div>
      </div>
      
      <div className="features">
        <div className="feature-card">
          <h3>Meal Planning</h3>
          <p>Upload your college meal timetable and plan your meals in advance.</p>
        </div>
        <div className="feature-card">
          <h3>Nutrition Tracking</h3>
          <p>Get detailed nutritional information for your meals and track your daily intake.</p>
        </div>
        <div className="feature-card">
          <h3>Smart Analysis</h3>
          <p>Our AI analyzes your meal choices and provides personalized recommendations.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;

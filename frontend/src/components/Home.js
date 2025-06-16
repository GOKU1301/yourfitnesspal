import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <div className="hero">
        <h1>Welcome to YourFitnessPal</h1>
        <p className="lead">Your personal college meal planner and nutrition tracker</p>
        
        {isAuthenticated ? (
          <div className="auth-buttons">
            <Link to="/admin/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">
              Admin Login
            </Link>
          </div>
        )}
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

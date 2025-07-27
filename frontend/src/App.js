import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

// Components
import Home from './components/Home';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import NutritionPage from './components/NutritionPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>jiitNutrition</h1>
        
      </header>
      
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/admin/dashboard" /> : <Login />} 
          />
          <Route path="/getnutrition" element={<NutritionPage />} />
          <Route element={<PrivateRoute adminOnly={true} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <footer className="app-footer">
        <p>Created By: Devansh Sharma</p>
      </footer>
      <Analytics />
    </div>
  );
}

export default App;

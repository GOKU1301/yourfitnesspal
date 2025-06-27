import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUpload } from 'react-icons/fa';
import BottomNav from './BottomNav';
import TimetableModal from './TimetableModal';

const Login = () => {
  const [showTimetable, setShowTimetable] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromUpload = location.state?.fromUpload || false;

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted with:', { email });
    setError('');
    setLoading(true);

    try {
      console.log('Calling login function...');
      const result = await login(email, password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful');
        // Check if user is admin and redirect accordingly
        if (result.user?.isAdmin) {
          const redirectPath = fromUpload ? '/admin/dashboard' : '/admin/dashboard';
          console.log('Redirecting to:', redirectPath);
          navigate(redirectPath);
        } else {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
        }
      } else {
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box dashboard-card" style={{background:'#191c23',color:'#fff',borderRadius:'18px',boxShadow:'0 2px 16px rgba(0,0,0,0.18)',border:'1px solid #21253a',maxWidth:'420px'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'1.1rem'}}>
          <FaUpload size={48} color="#4a90e2" style={{marginBottom:'0.5rem'}} />
          <h2 style={{marginBottom:'0.3rem',color:'#fff'}}>Upload Timetable</h2>
          <p className="login-subtitle" style={{color:'#bfc5d2',fontSize:'1.08rem'}}>Admin login required to upload</p>
        </div>
        {error && <div className="alert alert-danger" style={{background:'#2c1a1a',color:'#f87171',borderRadius:'8px',padding:'0.7em',marginBottom:'1em'}}>{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group" style={{marginBottom:'1.3rem'}}>
            <label style={{color:'#bfc5d2',fontWeight:500}}>Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              required
              className="form-control"
              style={{background:'#23263a',color:'#fff',border:'1px solid #23263a',borderRadius:'8px',fontSize:'1.08rem',padding:'0.8em',marginTop:'0.4em'}} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              required
              className="form-control"
              minLength="6"
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
      {/* Timetable Modal */}
      <TimetableModal isOpen={showTimetable} onClose={() => setShowTimetable(false)} />
      <BottomNav onShowTimetable={() => setShowTimetable(true)} />
    </div>
  );
};

export default Login;

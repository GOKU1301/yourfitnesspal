import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ErrorBoundary from './ErrorBoundary';
import './AdminDashboard.css';

// Small spinner component for buttons
const ButtonSpinner = ({ size = '1rem', color = '#fff' }) => (
  <span 
    className="button-spinner"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 1s ease-in-out infinite',
      marginRight: '0.5rem',
      verticalAlign: 'middle'
    }}
  />
);

ButtonSpinner.propTypes = {
  size: PropTypes.string,
  color: PropTypes.string
};

const AdminDashboard = () => {
  console.log('AdminDashboard component rendered');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { 
    logout, 
    token, 
    isAuthenticated, 
    loading: authLoading 
  } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    // Store the current preview URL in a variable to use in the cleanup
    const currentPreviewUrl = previewUrl;
    
    return () => {
      if (currentPreviewUrl) {
        console.log('Cleaning up preview URL:', currentPreviewUrl);
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [previewUrl]);
  
  // Clean up all object URLs on component unmount
  useEffect(() => {
    return () => {
      // Clean up any active preview URL
      if (previewUrl) {
        console.log('Final cleanup of preview URL on unmount');
        URL.revokeObjectURL(previewUrl);
      }
      
      // Clean up any file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Reset previous state
    setMessage({ text: '', type: '' });
    
    if (!file) {
      setMessage({ text: 'No file selected', type: 'error' });
      return;
    }

    // Check if the file is an image
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isValidImageType = validImageTypes.includes(file.type) || 
                          ['jpeg', 'jpg', 'png', 'gif', 'bmp'].includes(fileExtension);
    
    if (!isValidImageType) {
      setMessage({ 
        text: 'Please select a valid image file (JPEG, JPG, PNG, GIF, or BMP)', 
        type: 'error' 
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'File size should be less than 5MB', type: 'error' });
      return;
    }
    
    // Additional check for very small files (potential corrupt files)
    const minSizeBytes = 1024; // 1KB minimum
    if (file.size < minSizeBytes) {
      setMessage({
        text: 'File is too small and may be corrupted. Please select a valid image file.',
        type: 'error'
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Clean up previous preview URL if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    try {
      // Create preview URL
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      setSelectedFile(file);
      setMessage({ 
        text: `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error creating file preview:', error);
      setMessage({ 
        text: 'Error creating file preview. Please try another file.', 
        type: 'error' 
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setMessage({ text: 'Please select a file first', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ 
      text: 'Uploading and processing timetable. This may take a moment...', 
      type: 'info' 
    });

    try {
      const formData = new FormData();
      formData.append('timetable', selectedFile);

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token
        },
        timeout: 300000 // 5 minutes timeout for large files
      });

      console.log('Upload successful:', response.data);
      
      setMessage({ 
        text: response.data.message || 'Timetable processed successfully!', 
        type: 'success'
      });
      
      // Clear the file input and preview after a short delay
      setTimeout(() => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl('');
        setMessage({ text: '', type: '' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error uploading file:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to process timetable. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server is taking too long to respond.';
      } else if (error.response) {
        // Server responded with a status code outside 2xx
        errorMessage = error.response.data?.message || 
                     error.response.statusText || 
                     `Server error (${error.response.status})`;
        
        // Handle specific error statuses
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          logout();
        } else if (error.response.status === 413) {
          errorMessage = 'File is too large. Please upload a file smaller than 5MB.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // No response received
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message) {
        // Error occurred during request setup
        errorMessage = error.message;
      }
      
      setMessage({
        text: errorMessage,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, token, fileInputRef, previewUrl, logout]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      // Clear any file previews
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // Reset component state
      setSelectedFile(null);
      setPreviewUrl('');
      setMessage({ text: '', type: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      setMessage({
        text: 'Error during logout. Please try again.',
        type: 'error'
      });
    }
  }, [logout, navigate, previewUrl, fileInputRef]);

  return (
    <ErrorBoundary 
      errorMessage="An error occurred while loading the dashboard. Please try again."
      buttonText="Reload Dashboard"
      redirectTo="/admin/dashboard"
    >
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <button 
            className="logout-btn"
            onClick={handleLogout}
            style={{background:'#dc3545',color:'#fff',borderRadius:'8px',padding:'0.5em 1.3em',fontWeight:600,border:'none',fontSize:'1rem',marginLeft:'1rem'}}>
            Logout
          </button>
        </div>
        <div style={{background:'#191c23',color:'#fff',borderRadius:'14px',boxShadow:'0 2px 12px rgba(0,0,0,0.14)',border:'1px solid #23263a',maxWidth:'480px',margin:'0 auto',padding:'2.2rem 1.5rem',display:'flex',flexDirection:'column',gap:'2rem'}}>
          <label htmlFor="timetable-upload" style={{background:'#22223b',border:'2px dashed #4a90e2',color:'#bfc5d2',borderRadius:'10px',padding:'1.1rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontWeight:500}}>
            <span style={{marginRight:'0.7rem',fontSize:'1.3rem'}}>📁</span>
            {selectedFile ? selectedFile.name : 'Choose a file...'}
            <input
              id="timetable-upload"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="file-input"
              onChange={handleFileChange}
              style={{display:'none'}}
            />
            <span style={{background:'#23263a',color:'#4a90e2',padding:'0.5em 1.1em',borderRadius:'8px',marginLeft:'1.5rem',fontWeight:600}}>Browse</span>
          </label>
          {previewUrl && (
            <div style={{margin:'1.1rem 0',textAlign:'center'}}>
              <img src={previewUrl} alt="Preview" style={{maxWidth:'100%',maxHeight:'220px',borderRadius:'10px',border:'1px solid #23263a'}} />
            </div>
          )}
          <button 
            className="upload-button"
            onClick={handleUpload}
            disabled={isLoading || !selectedFile}
            style={{background:'#4a90e2',color:'#fff',border:'none',borderRadius:'8px',padding:'0.9em 1.7em',fontWeight:600,fontSize:'1.08rem',width:'100%',boxShadow:'0 1.5px 6px rgba(76,110,245,0.07)'}}
          >
            Upload Timetable
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

AdminDashboard.propTypes = {
  // Add any props if needed in the future
};

export default AdminDashboard;

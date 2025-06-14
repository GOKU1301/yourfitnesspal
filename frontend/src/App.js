import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage({ text: '', isError: false });
    
    // Create preview URL for the selected image
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: 'Please select a file first', isError: true });
      return;
    }

    const formData = new FormData();
    formData.append('timetable', file);

    setIsUploading(true);
    setMessage({ text: 'Uploading timetable...', isError: false });

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage({ text: 'Timetable uploaded and processed successfully!', isError: false });
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to upload timetable');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ text: error.message, isError: true });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Upload Timetable</h1>
      </header>
      <main className="app-main">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-container">
            <input
              ref={fileInputRef}
              type="file"
              id="timetable-upload"
              onChange={handleFileChange}
              accept="image/*"
              disabled={isUploading}
              className="file-input"
              style={{ display: 'none' }}
            />
            <div className="file-info">
              {file ? file.name : 'No file selected'}
            </div>
          </div>
          {previewUrl && (
            <div className="preview-container">
              <h3>Preview:</h3>
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="preview-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22100%22%20font-family%3D"Arial"%20font-size%3D"14"%20text-anchor%3D"middle"%20alignment-baseline%3D"middle"%20fill%3D"%23666%22%3EImage%20preview%3C%2Ftext%3E%3C%2Fsvg%3E';
                }}
              />
            </div>
          )}
          <div className="button-container">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="file-button"
            >
              {file ? 'Change File' : 'Choose File'}
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="upload-button"
            >
              {isUploading ? 'Uploading...' : 'Upload Timetable'}
            </button>
          </div>
          {message.text && (
            <div className={`message ${message.isError ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

export default App;

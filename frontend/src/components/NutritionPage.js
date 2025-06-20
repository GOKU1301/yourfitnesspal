import React, { useState, useEffect } from 'react';
import { FaUtensils, FaUtensilSpoon, FaUser, FaPlus, FaMinus, FaSpinner, FaCalculator } from 'react-icons/fa';

const NutritionPage = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [currentMeal, setCurrentMeal] = useState({
    type: null,
    items: [],
    nextMeal: { name: 'Loading...', time: '' },
    day: '',
    currentTime: ''
  });
  const [quantities, setQuantities] = useState({});
  const [nutritionData, setNutritionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false); // Toggle between mock and real API
  const [totalNutrition, setTotalNutrition] = useState(null);
  const [showTotalNutrition, setShowTotalNutrition] = useState(false);
  
  // Fetch nutrition data for food items
  const fetchNutritionData = async (items) => {
    if (!items || items.length === 0) return;
    
    setLoadingNutrition(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const queryString = items.join(',');
      const response = await fetch(`${apiUrl}/api/nutrition?items=${encodeURIComponent(queryString)}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setNutritionData(result.data);
      } else {
        console.error('Failed to fetch nutrition data:', result.message);
      }
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoadingNutrition(false);
    }
  };
  
  // Fetch current meal data from API
  const fetchCurrentMeal = async () => {
    console.log('=== Starting fetchCurrentMeal ===');
    
    // TEMPORARY: Use mock data
    if (useMockData) {
      console.log('Using mock data');
      const now = new Date();
      
      // Simple static mock data
      const mockResponse = {
        status: 'success',
        data: {
          currentMeal: {
            type: 'lunch',
            items: [
              'Paneer Tikka', 
              'Butter Naan', 
              'Dal Makhani', 
              'Raita', 
              'Gulab Jamun'
            ]
          },
          nextMeal: {
            name: 'Dinner',
            time: '19:30'
          },
          day: now.toLocaleDateString('en-US', { weekday: 'long' }),
          currentTime: now.toLocaleTimeString()
        }
      };
      
      setCurrentMeal({
        type: mockResponse.data.currentMeal?.type || null,
        items: mockResponse.data.currentMeal?.items || [],
        nextMeal: mockResponse.data.nextMeal,
        day: mockResponse.data.day,
        currentTime: mockResponse.data.currentTime
      });
      setLoading(false);
      return;
    }
    
    // Original API call (kept for reference)
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const apiEndpoint = `${apiUrl}/api/meals/current`;
      
      console.log('[1/5] Preparing to fetch from:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        setCurrentMeal({
          type: data.data.currentMeal?.type || null,
          items: data.data.currentMeal?.items || [],
          nextMeal: data.data.nextMeal,
          day: data.data.day,
          currentTime: data.data.currentTime
        });
      } else {
        setError(data.message || 'Failed to load meal data');
      }
    } catch (err) {
      console.error('Error fetching meal data:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchCurrentMeal();
  }, []);
  
  // Fetch nutrition data when meal items are loaded
  useEffect(() => {
    if (currentMeal && currentMeal.items && currentMeal.items.length > 0) {
      fetchNutritionData(currentMeal.items);
    }
  }, [currentMeal.items]);
  
  // Manual refresh function
  const handleRefresh = () => {
    setLoading(true);
    fetchCurrentMeal();
  };
  
  const handleQuantityChange = (item, change) => {
    setQuantities(prev => ({
      ...prev,
      [item]: Math.max(0, (prev[item] || 0) + change)
    }));
    
    // Hide total nutrition when quantities change
    if (showTotalNutrition) {
      setShowTotalNutrition(false);
    }
  };
  
  // Calculate total nutrition based on selected quantities
  const calculateTotalNutrition = () => {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0
    };
    
    Object.entries(quantities).forEach(([item, quantity]) => {
      if (quantity > 0 && nutritionData[item]) {
        const itemNutrition = nutritionData[item];
        
        // Get the medium serving size (or small if medium doesn't exist)
        const serving = itemNutrition.servings.find(s => s.size === 'medium') || 
                       itemNutrition.servings.find(s => s.size === 'small');
        
        if (serving) {
          totals.calories += (serving.calories || 0) * quantity;
          totals.protein += (serving.protein || 0) * quantity;
          totals.carbs += (serving.carbs || 0) * quantity;
          totals.fat += (serving.fat || 0) * quantity;
          totals.fiber += (serving.fiber || 0) * quantity;
          totals.sugar += (serving.sugar || 0) * quantity;
        }
      }
    });
    
    // Round values to 1 decimal place
    Object.entries(totals).forEach(([key, value]) => {
      totals[key] = Math.round(value * 10) / 10;
    });
    
    return totals;
  };
  
  // Handle the submit button click
  const handleSubmit = () => {
    const totals = calculateTotalNutrition();
    setTotalNutrition(totals);
    setShowTotalNutrition(true);
  };

  // Format time with AM/PM (handles both 12-hour and 24-hour formats)
  const formatTimeWithAmPm = (timeString) => {
    if (!timeString) return '';
    
    try {
      // If it's already in 12-hour format with AM/PM, return as is
      if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString;
      }
      
      // If it's in 24-hour format, convert to 12-hour with AM/PM
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`;
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString; // Return original if there's an error
    }
  };

  // Format day name (e.g., 'monday' -> 'Monday')
  const formatDayName = (day) => {
    if (!day) return '';
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Add CSS for spinning refresh icon
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinning {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Toggle between mock and real data (temporarily disabled)
  // const toggleDataMode = () => {
  //   setUseMockData(prev => !prev);
  //   fetchCurrentMeal(); // Refetch data with the new mode
  // };

  return (
    <div className="nutrition-page">
      <div className="nutrition-header">
        <h1><FaUtensils /> Nutrition Tracker</h1>
        <div className="nutrition-tabs">
          <button 
            className={`tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            <FaUtensils /> Current
          </button>
          <button 
            className={`tab ${activeTab === 'next' ? 'active' : ''}`}
            onClick={() => setActiveTab('next')}
          >
            <FaUtensilSpoon /> Next
          </button>
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser /> Profile
          </button>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleRefresh} 
            className="refresh-btn"
            disabled={loading}
            style={{
              padding: '5px 10px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? 'none' : 'auto'
            }}
          >
            <FaSpinner className={loading ? 'spinning' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {useMockData && (
            <span style={{ color: '#666', fontSize: '0.9em' }}>
              Using Mock Data (for testing)
            </span>
          )}
        </div>
      </div>
      
      <div className="meal-container">
        {loading ? (
          <div className="loading">
            <FaSpinner className="spinner" /> Loading meal data...
          </div>
        ) : error ? (
          <div className="error">
            Error: {error}
          </div>
        ) : (() => {
          // --- Time window logic ---
          const now = new Date();
          const [h, m] = (currentMeal.currentTime || '').split(':').map(Number);
          const currentMinutes = h * 60 + m;
          const windows = [
            { type: 'breakfast', start: 7 * 60, end: 10 * 60 },
            { type: 'lunch', start: 12 * 60, end: 15 * 60 },
            { type: 'dinner', start: 19 * 60, end: 22 * 60 }
          ];
          const currentWindow = windows.find(w => currentMinutes >= w.start && currentMinutes < w.end);
          const isMealTime = !!currentWindow && currentMeal.type === currentWindow.type;

          if (activeTab === 'current') {
            if (isMealTime) {
              // Show current meal
              return (
                <>
                  <div className="meal-header">
                    <h2>{formatDayName(currentMeal.day)} - {currentMeal.type.charAt(0).toUpperCase() + currentMeal.type.slice(1)}</h2>
                    <div className="current-time">{formatTimeWithAmPm(currentMeal.currentTime)}</div>
                  </div>
                  <div className="meal-cards">
                    {currentMeal.items && currentMeal.items.length > 0 ? (
                      currentMeal.items.map((item, index) => {
                        // Get nutrition data for this item
                        const itemNutrition = nutritionData[item];
                        const quantity = quantities[item] || 0;
                        
                        // Get the medium serving (or small if medium doesn't exist)
                        const serving = itemNutrition?.servings?.find(s => s.size === 'medium') || 
                                       itemNutrition?.servings?.find(s => s.size === 'small');
                        
                        // Calculate nutrition based on quantity
                        const calculatedNutrition = {
                          calories: serving ? Math.round((serving.calories || 0) * quantity * 10) / 10 : 0,
                          protein: serving ? Math.round((serving.protein || 0) * quantity * 10) / 10 : 0,
                          carbs: serving ? Math.round((serving.carbs || 0) * quantity * 10) / 10 : 0,
                          fat: serving ? Math.round((serving.fat || 0) * quantity * 10) / 10 : 0
                        };
                        
                        return (
                          <div key={index} className="meal-card">
                            <div className="meal-item">{item.trim() || 'Not specified'}</div>
                            
                            {/* Nutrition info section */}
                            <div className="nutrition-info" style={{ fontSize: '0.9em', color: '#666', margin: '8px 0' }}>
                              {loadingNutrition ? (
                                <div>Loading nutrition data...</div>
                              ) : itemNutrition ? (
                                <div>
                                  <div><strong>Calories:</strong> {calculatedNutrition.calories}</div>
                                  <div><strong>Protein:</strong> {calculatedNutrition.protein}g</div>
                                  <div><strong>Carbs:</strong> {calculatedNutrition.carbs}g</div>
                                  <div><strong>Fat:</strong> {calculatedNutrition.fat}g</div>
                                  {serving && <div style={{fontSize: '0.8em', marginTop: '4px', color: '#888'}}>
                                    ({serving.portion_label || serving.size})
                                  </div>}
                                </div>
                              ) : (
                                <div>No nutrition data available</div>
                              )}
                            </div>
                            
                            {/* Quantity controls */}
                            <div className="quantity-controls">
                              <button 
                                onClick={() => handleQuantityChange(item, -1)}
                                className="quantity-btn"
                                aria-label={`Decrease quantity of ${item}`}
                              >
                                <FaMinus />
                              </button>
                              <span className="quantity">{quantity}</span>
                              <button 
                                onClick={() => handleQuantityChange(item, 1)}
                                className="quantity-btn"
                                aria-label={`Increase quantity of ${item}`}
                              >
                                <FaPlus />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-items">No items available for this meal</div>
                    )}
                  </div>
                  
                  {/* Submit button and total nutrition */}
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button 
                      onClick={handleSubmit}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4a56e2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      <FaCalculator /> Calculate Total Nutrition
                    </button>
                    
                    {/* Display total nutrition if available */}
                    {showTotalNutrition && totalNutrition && (
                      <div 
                        style={{
                          marginTop: '20px',
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          maxWidth: '400px',
                          width: '100%'
                        }}
                      >
                        <h3 style={{ marginTop: 0, color: '#333', textAlign: 'center' }}>Total Nutrition</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div><strong>Calories:</strong> {totalNutrition.calories} kcal</div>
                          <div><strong>Protein:</strong> {totalNutrition.protein}g</div>
                          <div><strong>Carbs:</strong> {totalNutrition.carbs}g</div>
                          <div><strong>Fat:</strong> {totalNutrition.fat}g</div>
                          {totalNutrition.fiber > 0 && <div><strong>Fiber:</strong> {totalNutrition.fiber}g</div>}
                          {totalNutrition.sugar > 0 && <div><strong>Sugar:</strong> {totalNutrition.sugar}g</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            } else {
              // Not a meal time
              return (
                <div className="not-meal-time">
                  <h3>Sorry, no meal time right now</h3>
                  <p>Current time: {formatTimeWithAmPm(currentMeal.currentTime)}</p>
                  {currentMeal.type && (
                    <div className="next-meal-info" style={{marginTop: '1rem', padding: '1rem', background: '#f5f7fa', borderRadius: '8px', display: 'inline-block'}}>
                      <strong>Next meal:</strong> {currentMeal.type.charAt(0).toUpperCase() + currentMeal.type.slice(1)} at {
                        currentMeal.type === 'breakfast' ? '7:00 AM' :
                        currentMeal.type === 'lunch' ? '12:00 PM' :
                        currentMeal.type === 'dinner' ? '7:30 PM' : ''
                      }
                    </div>
                  )}
                </div>
              );
            }
          } else if (activeTab === 'next') {
            if (isMealTime) {
              // Show next meal info (type & time only)
              return (
                <div className="next-meal-tab">
                  <h2>Next Meal: {currentMeal.nextMeal?.type?.charAt(0).toUpperCase() + currentMeal.nextMeal?.type?.slice(1) || 'Loading...'}</h2>
                  {currentMeal.nextMeal?.time && (
                    <p className="next-meal-time">
                      At: {formatTimeWithAmPm(currentMeal.nextMeal.time)}
                    </p>
                  )}
                </div>
              );
            } else {
              // Show currentMeal as the next meal (with items)
              return (
                <div className="meal-container">
                  <div className="meal-header">
                    <h2>{formatDayName(currentMeal.day)} - {currentMeal.type.charAt(0).toUpperCase() + currentMeal.type.slice(1)}</h2>
                  </div>
                  <div className="meal-cards">
                    {currentMeal.items && currentMeal.items.length > 0 ? (
                      currentMeal.items.map((item, index) => (
                        <div key={index} className="meal-card">
                          <div className="meal-item">{item.trim() || 'Not specified'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-items">No items available for this meal</div>
                    )}
                  </div>
                </div>
              );
            }
          }
          return null;
        })()}
      </div>
    </div>
  );
};

export default NutritionPage;

import React, { useState, useEffect } from 'react';
import { FaUtensils, FaUtensilSpoon, FaUser, FaPlus, FaMinus, FaSpinner, FaCalculator, FaHome } from 'react-icons/fa';
import { MdRestaurant } from 'react-icons/md';
import { Link } from 'react-router-dom';

const PLATE_SECTIONS = [
  // Top side sections
  { label: "Side", value: "~105ml / ~100g", style: { top: "15%", left: "15%" } },
  { label: "Side", value: "~105ml / ~100g", style: { top: "15%", right: "15%" } },
  
  // Middle narrow sections - moved down slightly
  { label: "Narrow", value: "~115ml / ~110g", style: { top: "57%", left: "10%" } },
  { label: "Narrow", value: "~115ml / ~110g", style: { top: "57%", right: "10%" } },
  
  // Center section - moved up more (from 50% to 45%)
  { label: "Center", value: "~135ml / ~130g", style: { top: "30%", left: "50%", transform: 'translate(-50%, -50%)' } },
  
  // Main section - moved up slightly (from 5% to 7% from bottom)
  { label: "Main", value: "~300ml / ~290g", style: { bottom: "20%", left: "50%", transform: 'translateX(-50%)' } },
];

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
  const [selectedServingSizes, setSelectedServingSizes] = useState({});
  
  // Fetch nutrition data for food items
  const fetchNutritionData = async (items) => {
    if (!items || items.length === 0) return;
    
    setLoadingNutrition(true);
    try {
      // Use environment variable with fallback
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Standardize the API_URL format
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const queryString = items.join(',');
      const response = await fetch(`${apiUrl}/nutrition?items=${encodeURIComponent(queryString)}`, {
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
      // Use environment variable with fallback
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Standardize the API_URL format
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const apiEndpoint = `${apiUrl}/meals/current`;
      
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
      [item]: Math.max(0, parseFloat(((prev[item] || 0) + change).toFixed(1)))
    }));
    
    // Hide total nutrition when quantities change
    if (showTotalNutrition) {
      setShowTotalNutrition(false);
    }
  };
  
  // Handle serving size selection
  const handleServingSizeChange = (item, size) => {
    setSelectedServingSizes(prev => ({
      ...prev,
      [item]: size
    }));
    
    // Hide total nutrition when serving sizes change
    if (showTotalNutrition) {
      setShowTotalNutrition(false);
    }
  };
  
  // Calculate total nutrition based on selected quantities and serving sizes
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
        
        // Get the selected serving size (or default to medium/small if not selected)
        const selectedSize = selectedServingSizes[item] || 'medium';
        const serving = itemNutrition.servings.find(s => s.size === selectedSize) || 
                       itemNutrition.servings.find(s => s.size === 'medium') || 
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
    <div className="nutrition-page modern-nutrition">
      {/* No custom header here; rely on global app-header */}

      {/* Add the plate reference button at the top */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <PlateSectionReference />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className={`tab modern-tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
            aria-label="Current Meal"
            style={{ marginRight: 16 }}
          >
            <FaUtensils /> Current Meal
          </button>
          <button 
            className={`tab modern-tab ${activeTab === 'next' ? 'active' : ''}`}
            onClick={() => setActiveTab('next')}
            aria-label="Next Meal"
          >
            <FaUtensilSpoon /> Next Meal
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            onClick={handleRefresh} 
            className="refresh-btn modern-btn"
            disabled={loading}
            aria-label="Refresh Meal Data"
            style={{background: 'var(--success-color)', minWidth: 120}}
          >
            <FaSpinner className={loading ? 'spinning' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {useMockData && (
            <span className="mock-data-indicator">
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
          // const isMealTime = !!currentWindow && currentMeal.type === currentWindow.type;
          const isMealTime=true;
          if (activeTab === 'current') {
            if (isMealTime) {
              // Show current meal
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h2 style={{ margin: 0 }}>{formatDayName(currentMeal.day)} - {currentMeal.type.charAt(0).toUpperCase() + currentMeal.type.slice(1)}</h2>
                    <div className="current-time">{formatTimeWithAmPm(currentMeal.currentTime)}</div>
                  </div>
                  <div className="meal-cards">
                    {currentMeal.items && currentMeal.items.length > 0 ? (
                      currentMeal.items.map((item, index) => {
                        // Get nutrition data for this item
                        const itemNutrition = nutritionData[item];
                        const quantity = quantities[item] || 0;
                        
                        // Get the selected serving size (or default to medium/small if not selected)
                        const selectedSize = selectedServingSizes[item] || 'medium';
                        const serving = itemNutrition?.servings?.find(s => s.size === selectedSize) || 
                                       itemNutrition?.servings?.find(s => s.size === 'medium') || 
                                       itemNutrition?.servings?.find(s => s.size === 'small');
                        
                        // Calculate nutrition based on quantity and selected serving size
                        const calculatedNutrition = {
                          calories: serving ? Math.round((serving.calories || 0) * quantity * 10) / 10 : 0,
                          protein: serving ? Math.round((serving.protein || 0) * quantity * 10) / 10 : 0,
                          carbs: serving ? Math.round((serving.carbs || 0) * quantity * 10) / 10 : 0,
                          fat: serving ? Math.round((serving.fat || 0) * quantity * 10) / 10 : 0
                        };
                        
                        return (
                          <div key={index} className="meal-card">
                            <div className="meal-item dish-name">{item.trim() || 'Not specified'}</div>
                            
                            {/* Nutrition info section */}
                            <div className="nutrition-info">
                              {loadingNutrition ? (
                                <div>Loading nutrition data...</div>
                              ) : itemNutrition ? (
                                <div>
                                  <div><span className="macro-label">Calories:</span> <span className="macro-value">{calculatedNutrition.calories}</span></div>
                                  <div><span className="macro-label">Protein:</span> <span className="macro-value">{calculatedNutrition.protein}g</span></div>
                                  <div><span className="macro-label">Carbs:</span> <span className="macro-value">{calculatedNutrition.carbs}g</span></div>
                                  <div><span className="macro-label">Fat:</span> <span className="macro-value">{calculatedNutrition.fat}g</span></div>
                                  
                                  {/* Serving size selection */}
                                  {/* Always show serving size info */}
                                <div className="serving-info" style={{marginTop: '4px', fontSize: '0.85em', color: '#666'}}>
                                  <span style={{fontWeight: 'bold'}}>Serving:</span> {serving ? (serving.portion_label || (serving.size.charAt(0).toUpperCase() + serving.size.slice(1))) : 'Standard'}
                                </div>

                                {/* Serving size selector */}
                                {itemNutrition?.servings && itemNutrition.servings.length > 0 && (
                                    <div className="serving-size-selector" style={{marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                      <div style={{fontSize: '0.9em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <MdRestaurant /> Serving Size:
                                      </div>
                                      <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                        {itemNutrition.servings.map(serv => {
                                          return (
                                            <button 
                                              key={serv.size}
                                              onClick={() => handleServingSizeChange(item, serv.size)}
                                              className={`serving-size-btn${selectedServingSizes[item] === serv.size ? ' active' : ''}`}
                                              title={serv.portion_label || ''}
                                            >
                                              {serv.size.charAt(0).toUpperCase() + serv.size.slice(1)}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>No nutrition data available</div>
                              )}
                            </div>
                            
                            {/* Quantity controls */}
                            <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button 
                                onClick={() => handleQuantityChange(item, -1)}
                                className="quantity-btn"
                                aria-label={`Decrease quantity of ${item} by 1`}
                              >
                                <FaMinus /> 1
                              </button>
                              <button 
                                onClick={() => handleQuantityChange(item, -0.5)}
                                className="quantity-btn"
                                aria-label={`Decrease quantity of ${item} by 0.5`}
                                style={{ fontSize: '0.85em' }}
                              >
                                <FaMinus /> 0.5
                              </button>
                              <span className="quantity" style={{ minWidth: '30px', textAlign: 'center' }}>{parseFloat(quantity).toFixed(1)}</span>
                              <button 
                                onClick={() => handleQuantityChange(item, 0.5)}
                                className="quantity-btn"
                                aria-label={`Increase quantity of ${item} by 0.5`}
                                style={{ fontSize: '0.85em' }}
                              >
                                <FaPlus /> 0.5
                              </button>
                              <button 
                                onClick={() => handleQuantityChange(item, 1)}
                                className="quantity-btn"
                                aria-label={`Increase quantity of ${item} by 1`}
                              >
                                <FaPlus /> 1
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
                        fontWeight: 'bold',
                        marginBottom: '24px'
                      }}
                    >
                      <FaCalculator /> Calculate Total Nutrition
                    </button>
                    
                    {/* Display total nutrition if available */}
                    {showTotalNutrition && totalNutrition && (
                      <div 
                        style={{
                          marginTop: '30px',
                          padding: '20px',
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                          maxWidth: '450px',
                          width: '100%',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#222222', textAlign: 'center', fontSize: '24px', fontWeight: '700' }}>Total Nutrition</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '18px' }}>
                          <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                            <span style={{ color: '#333', fontWeight: 'bold' }}>Calories:</span> 
                            <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.calories}</span>
                            <span style={{ color: '#555' }}> kcal</span>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                            <span style={{ color: '#333', fontWeight: 'bold' }}>Protein:</span> 
                            <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.protein}</span>
                            <span style={{ color: '#555' }}>g</span>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                            <span style={{ color: '#333', fontWeight: 'bold' }}>Carbs:</span> 
                            <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.carbs}</span>
                            <span style={{ color: '#555' }}>g</span>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                            <span style={{ color: '#333', fontWeight: 'bold' }}>Fat:</span> 
                            <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.fat}</span>
                            <span style={{ color: '#555' }}>g</span>
                          </div>
                          {totalNutrition.fiber > 0 && (
                            <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                              <span style={{ color: '#333', fontWeight: 'bold' }}>Fiber:</span> 
                              <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.fiber}</span>
                              <span style={{ color: '#555' }}>g</span>
                            </div>
                          )}
                          {totalNutrition.sugar > 0 && (
                            <div style={{ padding: '8px', backgroundColor: '#f5f9ff', borderRadius: '8px' }}>
                              <span style={{ color: '#333', fontWeight: 'bold' }}>Sugar:</span> 
                              <span style={{ color: '#1976d2', fontWeight: '600', marginLeft: '5px' }}>{totalNutrition.sugar}</span>
                              <span style={{ color: '#555' }}>g</span>
                            </div>
                          )}
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

// Plate Section Reference Button + Modal
function PlateSectionReference() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ textAlign: 'center', margin: '16px 0' }}>
      <button
        style={{
          background: "#7C6AED",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "10px 20px",
          fontWeight: "bold",
          fontSize: "0.9rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          margin: "0 auto"
        }}
        onClick={() => setOpen(true)}
      >
        <span style={{ marginRight: 6 }}>ℹ️</span>
        View Plate Section Reference
      </button>
      {open && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#232323",
            padding: 32,
            borderRadius: 16,
            boxShadow: "0 0 24px #000",
            minWidth: 350,
            maxWidth: 700,
            textAlign: "center",
            position: "relative"
          }}>
            <h2 style={{ color: "white", marginBottom: 20 }}>College Plate Section Reference</h2>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={process.env.PUBLIC_URL + "/images/plateimage.png"}
                alt="College Plate"
                style={{ width: 500, maxWidth: "90vw", borderRadius: 10 }}
              />
              {PLATE_SECTIONS.map((section, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    color: "white",
                    background: "rgba(0,0,0,0.7)",
                    border: "2px solid #fff",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontWeight: "bold",
                    fontSize: "0.85rem", // Reduced from 1.1rem
                    pointerEvents: "none",
                    textAlign: "center",
                    maxWidth: "90px", // Control width for smaller spaces
                    ...section.style
                  }}
                >
                  {section.label}<br />
                  <span style={{ fontWeight: "normal", fontSize: "0.75rem" }}>{section.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 24,
                background: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 32px",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NutritionPage;
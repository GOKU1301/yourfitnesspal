import React, { useState, useEffect } from 'react';
import { FaUtensils, FaUtensilSpoon, FaUser, FaPlus, FaMinus, FaSpinner, FaCalculator, FaHome } from 'react-icons/fa';
import BottomNav from './BottomNav';
import TimetableModal from './TimetableModal';
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
  const [showTimetable, setShowTimetable] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [currentMeal, setCurrentMeal] = useState({
    type: null,
    items: [],
    nextMeal: null,
    day: '',
    currentTime: ''
  });
  
  const [nextMeal, setNextMeal] = useState({
    type: null,
    items: [],
    day: '',
    mealTime: '',
    mealDate: '',
    isFallbackData: false
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
  
  // Fetch next meal data from API or use fallback from currentMeal response
  const fetchNextMeal = async () => {
    console.log('=== Starting fetchNextMeal ===');
    
    // TEMPORARY: Use mock data for next meal
    if (useMockData) {
      console.log('Using mock data for next meal');
      const now = new Date();
      
      // Add one day for next meal date
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Simple static mock data
      const mockResponse = {
        status: 'success',
        data: {
          mealType: 'breakfast',
          mealTime: '7:00 AM',
          mealDay: nextDate.toLocaleDateString('en-US', { weekday: 'long' }),
          mealDate: nextDate.toISOString().split('T')[0],
          items: [
            'Bread', 
            'Butter', 
            'Jam', 
            'Eggs', 
            'Tea'
          ],
          isFallbackData: false
        }
      };
      
      setNextMeal({
        type: mockResponse.data.mealType,
        items: mockResponse.data.items,
        day: mockResponse.data.mealDay,
        mealTime: mockResponse.data.mealTime,
        mealDate: mockResponse.data.mealDate,
        isFallbackData: mockResponse.data.isFallbackData
      });
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Use environment variable with fallback
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Standardize the API_URL format
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const apiEndpoint = `${apiUrl}/meals/next`;
      
      console.log('Preparing to fetch next meal from:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Always try to parse the response, even if status is 404
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Next meal response data:', data);
      } catch (parseError) {
        console.error('Error parsing response:', responseText);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
      
      // Check if the response has success status AND actually contains items
      if (data.status === 'success' && data.data.items && data.data.items.length > 0) {
        setNextMeal({
          type: data.data.mealType,
          items: data.data.items || [],
          day: data.data.mealDay,
          mealTime: data.data.mealTime,
          mealDate: data.data.mealDate,
          isFallbackData: data.data.isFallbackData || false
        });
        setError(null); // Clear any previous errors
      } else {
        // If we can't get next meal data with items from direct API call,
        // use the nextMeal data from the currentMeal response as a fallback
        console.log('Next meal API returned no items, using data from currentMeal response as fallback');
        
        // Check if we have nextMeal info in the currentMeal response
        if (currentMeal.nextMeal && currentMeal.nextMeal.type) {
          console.log('Current meal items:', currentMeal.items);
          // Use current meal's items as a fallback for next meal items
          setNextMeal({
            type: currentMeal.nextMeal.type,
            items: currentMeal.items || [], // Use the current meal items as next meal items
            day: currentMeal.day,
            mealTime: getMealTimeByType(currentMeal.type), // Use appropriate meal start time based on meal type
            isFallbackData: true
          });
          console.log('Set next meal using fallback data:', currentMeal.nextMeal);
        } else {
          setError(data.message || 'Failed to load next meal data');
        }
      }
    } catch (err) {
      console.error('Error fetching next meal data:', err);
      
      // Even on error, try to use nextMeal from currentMeal as fallback
      if (currentMeal.nextMeal && currentMeal.nextMeal.type) {
        console.log('Next meal API error, using data from currentMeal as fallback');
        setNextMeal({
          type: currentMeal.nextMeal.type,
          items: currentMeal.items || [], // Use the current meal items as next meal items
          day: currentMeal.day,
          mealTime: getMealTimeByType(currentMeal.type), // Use appropriate meal start time based on meal type
          isFallbackData: true
        });
      } else {
        setError('Failed to connect to the server');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchCurrentMeal();
    fetchNextMeal();
  }, []);
  
  // Fetch nutrition data when meal items are loaded
  useEffect(() => {
    if (currentMeal && currentMeal.items && currentMeal.items.length > 0) {
      fetchNutritionData(currentMeal.items);
    }
  }, [currentMeal.items]);
  
  // Manual refresh function
  const handleRefresh = () => {
    setShowTotalNutrition(false);
    fetchCurrentMeal();
    fetchNextMeal();
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

  // Add CSS for spinning refresh icon and gradient animation
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
      @keyframes gradient-animation {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
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

  // Determine if it's currently a meal time
  const now = new Date();
  const clientHours = now.getHours();
  const clientMinutes = now.getMinutes();
  const currentMinutes = clientHours * 60 + clientMinutes;
  const windows = [
    { type: 'breakfast', start: 7 * 60, end: 10 * 60 },
    { type: 'lunch', start: 12 * 60, end: 15 * 60 },
    { type: 'dinner', start: 19 * 60, end: 22 * 60 }
  ];
  const currentWindow = windows.find(w => currentMinutes >= w.start && currentMinutes < w.end);
  const isMealTime = !!currentWindow && currentMeal.type === currentWindow.type;
  
  // Helper function to get the appropriate meal time based on meal type
  const getMealTimeByType = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return "7:00";
      case 'lunch':
        return "12:00";
      case 'dinner':
        return "19:30";
      default:
        return "7:00"; // Default to breakfast time
    }
  };


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
            style={{ 
              marginRight: 16,
              background: activeTab === 'current' && !isMealTime ? '#1a202c' : '',
              color: activeTab === 'current' && !isMealTime ? '#e2e8f0' : '',
              borderColor: activeTab === 'current' && !isMealTime ? '#4a5568' : '',
              boxShadow: activeTab === 'current' && !isMealTime ? '0 2px 8px rgba(0, 0, 0, 0.2)' : ''
            }}
          >
            <FaUtensils /> Current Meal
          </button>
          <button 
            className={`tab modern-tab ${activeTab === 'next' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('next');
              // Apply fallback logic when switching to next meal tab
              if (nextMeal.items.length === 0 && currentMeal.items.length > 0 && currentMeal.nextMeal) {
                console.log('Applying fallback data when switching to next meal tab');
                setNextMeal({
                  type: currentMeal.nextMeal.type,
                  items: currentMeal.items || [],
                  day: currentMeal.day,
                  mealTime: getMealTimeByType(currentMeal.type),
                  isFallbackData: true
                });
              }
            }}
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
        ) : (() => {
          // Use the isMealTime variable defined at the component level
          // const isMealTime=true;
          if (activeTab === 'next') {
            // Show next meal (simplified version with only food names)
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {formatDayName(nextMeal.day)} - {nextMeal.isFallbackData ? "Breakfast" : nextMeal.type?.charAt(0).toUpperCase() + nextMeal.type?.slice(1)}
                      <span style={{ 
                        fontSize: '0.85rem',
                        marginLeft: '10px',
                        color: '#666',
                        fontWeight: 'normal'
                      }}>at {nextMeal.mealTime}</span>
                    </h2>
                    {nextMeal.isFallbackData && (
                      <div style={{ 
                        color: '#e67e22', 
                        fontSize: '0.85rem',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        Using fallback data from previous week
                      </div>
                    )}
                  </div>
                  <div className="current-time">{formatTimeWithAmPm(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`)}</div>
                </div>
                
                {/* Simplified next meal display - only item names */}
                <div className="next-meal-items" style={{
                  backgroundColor: '#1a202c',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '10px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  {nextMeal.items && nextMeal.items.length > 0 ? (
                    <>
                      <h3 style={{ color: '#e2e8f0', marginTop: 0, marginBottom: '15px', fontSize: '1.25rem' }}>
                        Menu Items:
                      </h3>
                      <ul style={{
                        listStyleType: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {nextMeal.items.map((item, index) => (
                          <li key={index} style={{
                            backgroundColor: '#2d3748',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <span style={{ color: '#38bdf8', marginRight: '10px' }}>•</span>
                            {typeof item === 'string' ? item.trim() : (item || 'Not specified')}
                          </li>
                        ))}
                      </ul>
                      {nextMeal.isFallbackData && (
                        <div style={{
                          marginTop: '15px',
                          padding: '10px',
                          backgroundColor: 'rgba(237, 137, 54, 0.2)',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          color: '#ed8936',
                          textAlign: 'center'
                        }}>
                          Note: This menu is using fallback data and may change when the actual menu becomes available.
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
                      <MdRestaurant size={40} style={{ marginBottom: '10px', color: '#718096' }} />
                      <p style={{ fontSize: '1.1rem', margin: 0 }}>No items found for the next meal.</p>
                    </div>
                  )}
                </div>
              </>
            );
          } else if (activeTab === 'current') {
            if (isMealTime) {
              // Show current meal
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h2 style={{ margin: 0 }}>{formatDayName(currentMeal.day)} - {currentMeal.type.charAt(0).toUpperCase() + currentMeal.type.slice(1)}</h2>
                    <div className="current-time">{formatTimeWithAmPm(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`)}</div>
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
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #42b883 0%, #347474 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '24px',
                        boxShadow: '0 4px 10px rgba(66, 184, 131, 0.3)',
                        transition: 'all 0.3s ease',
                        width: '280px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <FaCalculator style={{ fontSize: '18px' }} /> Calculate Total Nutrition
                    </button>
                    
                    {/* Display total nutrition if available */}
                    {showTotalNutrition && totalNutrition && (
                      <div 
                        style={{
                          marginTop: '30px',
                          padding: '25px',
                          backgroundColor: '#ffffff',
                          borderRadius: '20px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
                          maxWidth: '500px',
                          width: '100%',
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '6px',
                          background: 'linear-gradient(90deg, #42b883, #347474, #42b883)',
                          backgroundSize: '200% 100%',
                          animation: 'gradient-animation 2s ease infinite'
                        }} />
                        
                        <h3 style={{ 
                          marginTop: '5px', 
                          marginBottom: '25px', 
                          color: '#1a202c', 
                          textAlign: 'center', 
                          fontSize: '28px', 
                          fontWeight: '700',
                          borderBottom: '1px solid #e2e8f0',
                          paddingBottom: '15px',
                          letterSpacing: '0.5px'
                        }}>Total Nutrition</h3>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '20px', 
                          fontSize: '17px' 
                        }}>
                          <div style={{ 
                            padding: '16px 18px', 
                            backgroundColor: 'rgba(66, 184, 131, 0.08)', 
                            borderRadius: '12px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(66, 184, 131, 0.12)'
                          }}>
                            <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CALORIES</span>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ color: '#42b883', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.calories}</span>
                              <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}> kcal</span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '16px 18px', 
                            backgroundColor: 'rgba(49, 130, 206, 0.08)', 
                            borderRadius: '12px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(49, 130, 206, 0.12)'
                          }}>
                            <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>PROTEIN</span>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ color: '#3182ce', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.protein}</span>
                              <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '16px 18px', 
                            backgroundColor: 'rgba(237, 137, 54, 0.08)', 
                            borderRadius: '12px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(237, 137, 54, 0.12)'
                          }}>
                            <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CARBS</span>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ color: '#ed8936', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.carbs}</span>
                              <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '16px 18px', 
                            backgroundColor: 'rgba(159, 122, 234, 0.08)', 
                            borderRadius: '12px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(159, 122, 234, 0.12)'
                          }}>
                            <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>FAT</span>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ color: '#9f7aea', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.fat}</span>
                              <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                            </div>
                          </div>
                          
                          {totalNutrition.fiber > 0 && (
                            <div style={{ 
                              padding: '16px 18px', 
                              backgroundColor: 'rgba(56, 178, 172, 0.08)', 
                              borderRadius: '12px',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                              border: '1px solid rgba(56, 178, 172, 0.12)'
                            }}>
                              <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>FIBER</span>
                              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span style={{ color: '#38b2ac', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.fiber}</span>
                                <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                              </div>
                            </div>
                          )}
                          
                          {totalNutrition.sugar > 0 && (
                            <div style={{ 
                              padding: '16px 18px', 
                              backgroundColor: 'rgba(245, 101, 101, 0.08)', 
                              borderRadius: '12px',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                              border: '1px solid rgba(245, 101, 101, 0.12)'
                            }}>
                              <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>SUGAR</span>
                              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span style={{ color: '#f56565', fontWeight: '700', fontSize: '24px' }}>{totalNutrition.sugar}</span>
                                <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                              </div>
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
              console.log('Rendering no meal time UI with next meal data:', nextMeal);
              return (
                <div className="not-meal-time" style={{textAlign: 'center', padding: '2rem'}}>
                  <div style={{marginBottom: '2rem'}}>
                    <img 
                      src="/images/goku.png" 
                      alt="Goku" 
                      style={{
                        maxWidth: '650px', // Increased max width
                        width: '90vw',     // Responsive to viewport
                        height: 'auto',    // Maintain aspect ratio
                        minHeight: '200px',
                        maxHeight: '60vh', // Prevent overflow on small screens
                        display: 'block',
                        margin: '0 auto',
                        borderRadius: '18px',
                        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.18)',
                        objectFit: 'contain',
                        background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
                        padding: '12px'
                      }} 
                    />
                  </div>
                  <h3 style={{fontSize: '1.8rem', marginBottom: '1rem', color: '#e2e8f0'}}>No meal time currently</h3>
                  <p style={{color: '#a0aec0', marginBottom: '1.5rem', fontSize: '1.1rem'}}>
                    Current time: {formatTimeWithAmPm(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`)}
                  </p>
                </div>
              );
            }
          } else if (activeTab === 'next') {
            // Next Meal tab is always showing the nextMeal data, regardless of whether it's meal time or not
            if (!nextMeal || !nextMeal.type) {
              return (
                <div className="next-meal-loading" style={{padding: '2rem', textAlign: 'center'}}>
                  <div style={{fontSize: '2rem', marginBottom: '1rem', color: '#718096'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                  </div>
                  <h3 style={{color: '#2d3748', marginBottom: '1rem'}}>Loading next meal data...</h3>
                  <p style={{color: '#718096'}}>Please wait while we retrieve your next meal information.</p>
                </div>
              );
            }
            
            return (
              <div className="meal-container">
                <div className="meal-header" style={{marginBottom: '1.5rem'}}>
                  <h2 style={{fontSize: '1.8rem', color: '#2d3748'}}>
                    {nextMeal.day || 'Tomorrow'} - {nextMeal.type.charAt(0).toUpperCase() + nextMeal.type.slice(1)}
                  </h2>
                  <p style={{color: '#4a5568', fontSize: '1.1rem', marginTop: '0.5rem'}}>
                    Meal time: {nextMeal.mealTime}
                  </p>
                  
                  {nextMeal.isFallbackData && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fffbeb',
                      borderLeft: '4px solid #f59e0b',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span style={{color: '#92400e', fontSize: '0.9rem'}}>
                        {nextMeal.isFallbackData === true ? 'Using current meal items as preview' : 'Using fallback data from previous week\'s schedule'}
                      </span>
                    </div>
                  )}
                </div>
                {/* Simple item list for next meal - only names, no nutrition details */}
                <div className="next-meal-items" style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {nextMeal.items && nextMeal.items.length > 0 ? (
                    <ul style={{
                      listStyle: 'none',
                      padding: '0',
                      margin: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {nextMeal.items.map((item, index) => (
                        <li key={index} style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '1.125rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ color: '#38bdf8', marginRight: '0.5rem' }}>•</span>
                          {typeof item === 'string' ? item.trim() : (item || 'Not specified')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-items" style={{
                      textAlign: 'center',
                      padding: '2rem 0',
                      color: '#64748b'
                    }}>
                      No items available for this meal
                    </div>
                  )}
                  
                  {/* Add note about using current meal items if it's a fallback */}
                  {nextMeal.isFallbackData && (
                    <div className="note" style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      color: '#64748b',
                      fontSize: '0.875rem',
                      textAlign: 'center'
                    }}>
                      <p>These items may be updated when the official menu is available</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
      
      {/* Timetable Modal */}
      <TimetableModal isOpen={showTimetable} onClose={() => setShowTimetable(false)} />
      <BottomNav onShowTimetable={() => setShowTimetable(true)} />
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
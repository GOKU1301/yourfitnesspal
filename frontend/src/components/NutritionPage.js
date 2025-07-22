import React, { useState, useEffect, useRef } from 'react';
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

const PlateSectionReference = () => {
  const [open, setOpen] = useState(false);
  const plateSections = [
    { label: "VEGETABLES", value: "50% of plate", color: "#2ecc71", style: { top: "10%", left: "50%", transform: "translateX(-50%)" } },
    { label: "PROTEIN", value: "25% of plate", color: "#e74c3c", style: { bottom: "10%", left: "25%", transform: "translateX(-50%)" } },
    { label: "CARBS", value: "25% of plate", color: "#3498db", style: { bottom: "10%", right: "25%", transform: "translateX(50%)" } },
  ];

  return (
    <div>
      <button 
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}
      >
        ℹ️
      </button>
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            position: 'relative'
          }}>
            <h2>Plate Section Reference</h2>
            <div style={{
              width: '300px',
              height: '300px',
              margin: '20px auto',
              position: 'relative',
              background: '#f5f5f5',
              borderRadius: '50%',
              border: '2px solid #333'
            }}>
              {plateSections.map((section, index) => (
                <div 
                  key={index} 
                  style={{
                    position: 'absolute',
                    backgroundColor: section.color,
                    color: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    textAlign: 'center',
                    fontWeight: 'bold',
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
                marginTop: '24px',
                background: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 32px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NutritionPage = () => {
  // Reference for styles
  const styleRef = useRef(null);

  // Add responsive styles
  useEffect(() => {
    // Create and inject styles for mobile responsiveness
    const style = document.createElement('style');
    style.textContent = `
      /* Goku image responsive styling */
      .goku-image {
        max-width: 900px;
        width: 98vw;
        height: auto;
        min-height: 300px;
        max-height: 80vh;
        display: block;
        margin: 0 auto;
        border-radius: 18px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.18);
        object-fit: contain;
        background: #181a20;
        padding: 12px;
      }
      
      @media (max-width: 768px) {
        .tab-buttons, .meal-container {
          width: 95% !important;
        }
        .meal-item {
          padding: 12px !important;
          flex-direction: column !important;
        }
        .quantity-btn {
          padding: 8px 12px !important;
          font-size: 14px !important;
          min-width: 40px !important;
          min-height: 40px !important;
        }
        .quantity-controls {
          margin-top: 15px !important;
          justify-content: center !important;
        }
        .serving-size-selector {
          padding: 10px !important;
          font-size: 16px !important;
        }
        h2 {
          font-size: 1.5rem !important;
        }
        /* Goku image mobile adjustments */
        .goku-image {
          max-width: 100%;
          width: 95vw;
          min-height: 200px;
          max-height: 60vh;
          padding: 8px;
        }
      }
      
      @media (max-width: 480px) {
        .tab-buttons {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .tab {
          width: 100% !important;
          margin-bottom: 8px !important;
          padding: 12px !important;
        }
        .refresh-btn {
          min-width: 100% !important;
          margin-top: 8px !important;
        }
        .nutrition-cards {
          grid-template-columns: 1fr !important;
        }
        /* Goku image small mobile adjustments */
        .goku-image {
          min-height: 150px;
          max-height: 50vh;
          padding: 6px;
        }
      }
      
      /* Better touch targets */
      .tab, .quantity-btn, button {
        min-height: 44px;
        min-width: 44px;
      }
    `;
    
    document.head.appendChild(style);
    styleRef.current = style;
    
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);
  const [showTimetable, setShowTimetable] = useState(false);
  const [showNutritionGrid, setShowNutritionGrid] = useState(false);
  const [showNextMealTotalNutrition, setShowNextMealTotalNutrition] = useState(false);
  const [nextMealTotalNutrition, setNextMealTotalNutrition] = useState(null);
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
  const [nextMealQuantities, setNextMealQuantities] = useState({}); // For next meal tab
  const [currentMealNutritionData, setCurrentMealNutritionData] = useState({});
  const [nextMealNutritionData, setNextMealNutritionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [error, setError] = useState(null);

  const [totalNutrition, setTotalNutrition] = useState(null);
  const [showTotalNutrition, setShowTotalNutrition] = useState(false);
  const [selectedServingSizes, setSelectedServingSizes] = useState({});
  const [nextMealServingSizes, setNextMealServingSizes] = useState({}); // For next meal tab
  const [showNextMealNutrition, setShowNextMealNutrition] = useState(true); // Always show nutrition info
  
  // Fetch nutrition data for food items, storing in the correct state
const fetchNutritionData = async (items, setNutritionDataFn) => {
  if (!items || items.length === 0) return;
  setLoadingNutrition(true);
  try {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
      setNutritionDataFn(result.data);
    } else {
      console.error('Failed to fetch nutrition data:', result.message);
    }
  } catch (error) {
    console.error('Error fetching nutrition data:', error);
  } finally {
    setLoadingNutrition(false);
  }
};
  
  // Fetch current and next meal data from API
  const fetchCurrentMeal = async () => {
    console.log('=== Starting fetchCurrentMeal ===');
    
    // Reset nutrition grid when fetching a new meal
    setShowNutritionGrid(false);
    
    // Fetch meal data from the API
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
        // Set currentMeal and nextMeal from single API response
        setCurrentMeal({
          type: data.data.currentMeal?.type || null,
          items: data.data.currentMeal?.items || [],
          day: data.data.day,
          currentTime: data.data.currentTime
        });
        setNextMeal({
          type: data.data.nextMeal?.type || null,
          items: data.data.nextMeal?.items || [],
          day: data.data.nextMeal?.day || '',
          mealTime: data.data.nextMeal?.time || '',
          mealDate: data.data.nextMeal?.date || '',
          isFallbackData: false
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
  
  // Remove fetchNextMeal. All meal data comes from fetchCurrentMeal now.
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchCurrentMeal();
  }, []);
  
  // Reset nutrition grid when component mounts
  useEffect(() => {
    setShowNutritionGrid(false);
  }, []);

  // Fetch nutrition data for current meal when items change
useEffect(() => {
  if (currentMeal && currentMeal.items && currentMeal.items.length > 0) {
    fetchNutritionData(currentMeal.items, setCurrentMealNutritionData);
  }
  setShowNutritionGrid(false);
}, [currentMeal.items]);

// Fetch nutrition data for next meal when items change and next tab is active
useEffect(() => {
  if (activeTab === 'next' && nextMeal.items && nextMeal.items.length > 0) {
    fetchNutritionData(nextMeal.items, setNextMealNutritionData);
  }
}, [activeTab, nextMeal.items]);
  
  // Manual refresh function
  const handleRefresh = () => {
    setShowTotalNutrition(false);
    setShowNutritionGrid(false);
    fetchCurrentMeal();
  };
  
  const handleQuantityChange = (item, change) => {
    setQuantities(prev => ({
      ...prev,
      [item]: Math.max(0, parseFloat(((prev[item] || 0) + change).toFixed(1)))
    }));
    
    // Hide total nutrition and grid when quantities change
    if (showTotalNutrition) {
      setShowTotalNutrition(false);
    }
    setShowNutritionGrid(false);
  };
  
  // Handle serving size selection
  const handleServingSizeChange = (item, size) => {
    setSelectedServingSizes(prev => ({
      ...prev,
      [item]: size
    }));
    
    // Hide total nutrition and grid when serving sizes change
    if (showTotalNutrition) {
      setShowTotalNutrition(false);
    }
    setShowNutritionGrid(false);
  };

  const handleNextMealQuantityChange = (item, change) => {
    setNextMealQuantities(prev => ({
      ...prev,
      [item]: Math.max(0, parseFloat(((prev[item] || 0) + change).toFixed(1)))
    }));
    setShowNextMealTotalNutrition(false);
    setNextMealTotalNutrition(null);
  };

  const handleNextMealServingSizeChange = (item, size) => {
    setNextMealServingSizes(prev => ({
      ...prev,
      [item]: size
    }));
    setShowNextMealTotalNutrition(false);
    setNextMealTotalNutrition(null);
  };
  
  const calculateNextMealTotalNutrition = () => {
    let totalCals = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    nextMeal.items.forEach(item => {
      const quantity = nextMealQuantities[item] || 0;
      if (quantity > 0) {
        const itemNutrition = activeTab === 'next' ? nextMealNutritionData[item] : currentMealNutritionData[item];
        if (itemNutrition) {
          const selectedSize = nextMealServingSizes[item] || 'medium';
          const serving = itemNutrition.servings?.find(s => s.size === selectedSize) ||
                          itemNutrition.servings?.find(s => s.size === 'medium') ||
                          itemNutrition.servings?.find(s => s.size === 'small');

          if (serving) {
            totalCals += (serving.calories || 0) * quantity;
            totalProtein += (serving.protein || 0) * quantity;
            totalCarbs += (serving.carbs || 0) * quantity;
            totalFat += (serving.fat || 0) * quantity;
          }
        }
      }
    });

    return {
      calories: Math.round(totalCals * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10
    };
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
      if (quantity > 0 && currentMealNutritionData[item]) {
        const itemNutrition = currentMealNutritionData[item];
        
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
    setShowNutritionGrid(true);
  };

  const handleNextMealSubmit = () => {
    const total = calculateNextMealTotalNutrition();
    setNextMealTotalNutrition(total);
    setShowNextMealTotalNutrition(true);
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
      @keyframes pulse-subtle {
        0% { transform: scale(1); }
        50% { transform: scale(1.03); box-shadow: 0 10px 36px rgba(31, 38, 135, 0.25), 0 0 12px rgba(255,255,255,0.15) inset; }
        100% { transform: scale(1); }
      }
      @keyframes pulse-strong {
        0% { transform: scale(1); filter: brightness(1); }
        30% { transform: scale(1.04); filter: brightness(1.17); }
        60% { transform: scale(1.01); filter: brightness(1.08); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      @keyframes shine {
        0% { background-position: -100px; }
        20% { background-position: 200px; }
        100% { background-position: 200px; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);



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
  // const isMealTime=true;
  const isMealTime = !!currentWindow &&
    typeof currentMeal.type === 'string' &&
    currentMeal.type.trim().toLowerCase() === currentWindow.type.toLowerCase();
  // Debug output for meal window logic
  if (currentWindow) {
    console.debug('[Meal Window Debug]', {
      now: `${clientHours}:${clientMinutes}`,
      currentMealType: currentMeal.type,
      windowType: currentWindow.type,
      isMealTime,
      reason: !isMealTime ? `Meal type mismatch: currentMeal.type='${currentMeal.type}' vs window='${currentWindow.type}'` : 'Meal card should display'
    });
  } else {
    console.debug('[Meal Window Debug] Not in any meal window', {
      now: `${clientHours}:${clientMinutes}`,
      currentMealType: currentMeal.type
    });
  }

  // Helper function to get the appropriate meal time based on meal type
  // Returns meal time range for the given meal type and day
  const getMealTimeByType = (mealType, day) => {
    // day: 0=Sunday, 1=Monday, ..., 6=Saturday
    const isSunday = day === 0 || day === 'Sunday' || day === 'sunday';
    switch (mealType) {
      case 'breakfast':
        return isSunday ? '7:00 AM - 9:30 AM' : '7:00 AM - 9:00 AM';
      case 'lunch':
        return isSunday ? '12:00 PM - 2:30 PM' : '12:00 PM - 2:00 PM';
      case 'dinner':
        return '7:30 PM - 9:30 PM';
      default:
        return isSunday ? '7:00 AM - 9:30 AM' : '7:00 AM - 9:00 AM';
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
        <div style={{ 
          display: 'flex', 
          gap: 12,
          padding: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <button 
            className={`tab modern-tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('current');
              setShowNutritionGrid(false);
            }}
            aria-label="Current Meal"
            style={{
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'current' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
              color: activeTab === 'current' ? 'white' : 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'current' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              transform: activeTab === 'current' ? 'translateY(-1px)' : 'none'
            }}
            onMouseOver={(e) => {
              if (activeTab !== 'current') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'current') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
          >
            <FaUtensils style={{ fontSize: '1.1em' }} />
            <span>Current Meal</span>
          </button>
          <button 
            className={`tab modern-tab ${activeTab === 'next' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('next');
              setShowNutritionGrid(false);
            }}
            aria-label="Next Meal"
            style={{
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'next' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
              color: activeTab === 'next' ? 'white' : 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'next' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              transform: activeTab === 'next' ? 'translateY(-1px)' : 'none'
            }}
            onMouseOver={(e) => {
              if (activeTab !== 'next') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'next') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
          >
            <FaUtensilSpoon style={{ fontSize: '1.1em' }} />
            <span>Next Meal</span>
          </button>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          marginLeft: 'auto'
        }}>
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            aria-label="Refresh Meal Data"
            style={{
              padding: '10px 20px',
              background: loading ? '#6b7280' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              opacity: loading ? 0.8 : 1,
              minWidth: 120,
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.35)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              }
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
              }
            }}
          >
            <FaSpinner className={loading ? 'spinning' : ''} style={{ 
              fontSize: '1.1em',
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

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
                        color: '#e2e8f0',
                        marginTop: '4px',
                        fontSize: '0.85rem',
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
                <div className="meal-cards">
                  {nextMeal.items && nextMeal.items.length > 0 ? (
                    nextMeal.items.map((item, index) => {
                      const itemNutrition = activeTab === 'next' ? nextMealNutritionData[item] : currentMealNutritionData[item];
                      const quantity = nextMealQuantities[item] || 0;
                      const selectedSize = nextMealServingSizes[item] || 'medium';
                      const serving = itemNutrition?.servings?.find(s => s.size === selectedSize) || 
                                     itemNutrition?.servings?.find(s => s.size === 'medium') || 
                                     itemNutrition?.servings?.find(s => s.size === 'small');
                      const calculatedNutrition = {
                        calories: serving ? Math.round((serving.calories || 0) * quantity * 10) / 10 : 0,
                        protein: serving ? Math.round((serving.protein || 0) * quantity * 10) / 10 : 0,
                        carbs: serving ? Math.round((serving.carbs || 0) * quantity * 10) / 10 : 0,
                        fat: serving ? Math.round((serving.fat || 0) * quantity * 10) / 10 : 0
                      };

                      return (
                        <div key={index} className="meal-card">
                          <div className="meal-item dish-name">{item.trim() || 'Not specified'}</div>
                          <div className="nutrition-info">
                            {loadingNutrition ? (
                              <div>Loading nutrition data...</div>
                            ) : itemNutrition ? (
                              <div>
                                <div><span className="macro-label">Calories:</span> <span className="macro-value">{calculatedNutrition.calories}</span></div>
                                <div><span className="macro-label">Protein:</span> <span className="macro-value">{calculatedNutrition.protein}g</span></div>
                                <div><span className="macro-label">Carbs:</span> <span className="macro-value">{calculatedNutrition.carbs}g</span></div>
                                <div><span className="macro-label">Fat:</span> <span className="macro-value">{calculatedNutrition.fat}g</span></div>
                                <div className="serving-info" style={{marginTop: '4px', fontSize: '0.85em', color: '#666'}}>
                                  <span style={{fontWeight: 'bold'}}>Serving:</span> {serving ? (serving.portion_label || (serving.size.charAt(0).toUpperCase() + serving.size.slice(1))) : 'Standard'}
                                </div>
                                {itemNutrition?.servings && itemNutrition.servings.length > 0 && (
                                  <div className="serving-size-selector" style={{marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <div style={{fontSize: '0.9em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                      <MdRestaurant /> Serving Size:
                                    </div>
                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                      {itemNutrition.servings.map(serv => (
                                        <button 
                                          key={serv.size}
                                          onClick={() => handleNextMealServingSizeChange(item, serv.size)}
                                          className={`serving-size-btn${nextMealServingSizes[item] === serv.size ? ' active' : ''}`}
                                          title={serv.portion_label || ''}
                                        >
                                          {serv.size.charAt(0).toUpperCase() + serv.size.slice(1)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>No nutrition data available</div>
                            )}
                          </div>
                          <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button onClick={() => handleNextMealQuantityChange(item, -1)} className="quantity-btn"><FaMinus /> 1</button>
                            <button onClick={() => handleNextMealQuantityChange(item, -0.5)} className="quantity-btn" style={{ fontSize: '0.85em' }}><FaMinus /> 0.5</button>
                            <span className="quantity" style={{ minWidth: '30px', textAlign: 'center' }}>{parseFloat(quantity).toFixed(1)}</span>
                            <button onClick={() => handleNextMealQuantityChange(item, 0.5)} className="quantity-btn" style={{ fontSize: '0.85em' }}><FaPlus /> 0.5</button>
                            <button onClick={() => handleNextMealQuantityChange(item, 1)} className="quantity-btn"><FaPlus /> 1</button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-items">No items available for this meal</div>
                  )}
                </div>

                {/* Submit button for Next Meal */}
                <div style={{ marginTop: '20px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                  <button
                    onClick={() => {
                      setNextMealTotalNutrition(calculateNextMealTotalNutrition());
                      setShowNextMealTotalNutrition(true);
                    }}
                    style={{
                      padding: '12px 32px',
                      background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
                      borderRadius: '24px',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(56, 249, 215, 0.25), 0 2px 4px rgba(67, 233, 123, 0.18)',
                      width: 'fit-content',
                      minWidth: '130px',
                      margin: '0 auto 20px auto',
                      display: 'block',
                      fontSize: '18px',
                      letterSpacing: '0.7px',
                      transition: 'all 0.25s cubic-bezier(.4,2,.6,1)',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: 1,
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #38f9d7 0%, #43e97b 100%)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 249, 215, 0.32), 0 4px 12px rgba(67, 233, 123, 0.28)';
                      e.currentTarget.style.transform = 'scale(1.045)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(56, 249, 215, 0.25), 0 2px 4px rgba(67, 233, 123, 0.18)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <span style={{
                      background: 'linear-gradient(90deg, #fff 30%, #b2ffe5 70%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 800,
                      textShadow: '0 2px 8px rgba(56, 249, 215, 0.18)',
                      letterSpacing: '1px',
                    }}>
                    </span>
                    Submit
                  </button>
                </div>

                {/* Total Nutrition Grid for Next Meal (styled like Current Meal) */}
                {showNextMealTotalNutrition && nextMealTotalNutrition && (
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    width: '100%',
                    marginTop: '24px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ 
                      padding: '16px 18px', 
                      backgroundColor: 'rgba(49, 130, 206, 0.08)', 
                      borderRadius: '12px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(49, 130, 206, 0.12)',
                      textAlign: 'center',
                      transition: 'transform 0.2s ease',
                    }}>
                      <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CALORIES</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                        <span style={{ color: '#3182ce', fontWeight: '700', fontSize: '28px' }}>{nextMealTotalNutrition.calories || 0}</span>
                        <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}> kcal</span>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '16px 18px', 
                      backgroundColor: 'rgba(49, 130, 206, 0.08)', 
                      borderRadius: '12px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(49, 130, 206, 0.12)',
                      textAlign: 'center',
                      transition: 'transform 0.2s ease',
                    }}>
                      <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>PROTEIN</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                        <span style={{ color: '#3182ce', fontWeight: '700', fontSize: '28px' }}>{nextMealTotalNutrition.protein || 0}</span>
                        <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '16px 18px', 
                      backgroundColor: 'rgba(237, 137, 54, 0.08)', 
                      borderRadius: '12px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(237, 137, 54, 0.12)',
                      textAlign: 'center',
                      transition: 'transform 0.2s ease',
                    }}>
                      <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CARBS</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                        <span style={{ color: '#ed8936', fontWeight: '700', fontSize: '28px' }}>{nextMealTotalNutrition.carbs || 0}</span>
                        <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '16px 18px', 
                      backgroundColor: 'rgba(159, 122, 234, 0.08)', 
                      borderRadius: '12px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(159, 122, 234, 0.12)',
                      textAlign: 'center',
                      transition: 'transform 0.2s ease',
                    }}>
                      <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>FATS</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                        <span style={{ color: '#9f7aea', fontWeight: '700', fontSize: '28px' }}>{nextMealTotalNutrition.fat || 0}</span>
                        <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          } else if (activeTab === 'current') {
            if (currentMeal && currentMeal.items && currentMeal.items.length > 0 && isMealTime) {
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
                        const itemNutrition = activeTab === 'next' ? nextMealNutritionData[item] : currentMealNutritionData[item];
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
                  <div style={{ marginTop: '20px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                    <button 
  onClick={handleSubmit}
  style={{
    padding: '12px 32px',
    background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
    borderRadius: '24px',
    color: '#fff',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(56, 249, 215, 0.25), 0 2px 4px rgba(67, 233, 123, 0.18)',
    width: 'fit-content',
    minWidth: '130px',
    margin: '0 auto 20px auto',
    display: 'block',
    fontSize: '18px',
    letterSpacing: '0.7px',
    transition: 'all 0.25s cubic-bezier(.4,2,.6,1)',
    position: 'relative',
    overflow: 'hidden',
  }}
  onMouseOver={e => {
    e.currentTarget.style.background = 'linear-gradient(90deg, #38f9d7 0%, #43e97b 100%)';
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 249, 215, 0.32), 0 4px 12px rgba(67, 233, 123, 0.28)';
    e.currentTarget.style.transform = 'scale(1.045)';
  }}
  onMouseOut={e => {
    e.currentTarget.style.background = 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)';
    e.currentTarget.style.boxShadow = '0 6px 18px rgba(56, 249, 215, 0.25), 0 2px 4px rgba(67, 233, 123, 0.18)';
    e.currentTarget.style.transform = 'scale(1)';
  }}
>
  <span style={{
    background: 'linear-gradient(90deg, #fff 30%, #b2ffe5 70%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(56, 249, 215, 0.18)',
    letterSpacing: '1px',
  }}>
  </span>
  Submit
</button>
                    {showNutritionGrid && (
                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '16px',
                        width: '100%'
                      }}>
                      <div style={{ 
                        padding: '16px 18px', 
                        backgroundColor: 'rgba(49, 130, 206, 0.08)', 
                        borderRadius: '12px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(49, 130, 206, 0.12)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CALORIES</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                          <span style={{ color: '#3182ce', fontWeight: '700', fontSize: '28px' }}>{totalNutrition ? totalNutrition.calories : 0}</span>
                          <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}> kcal</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '16px 18px', 
                        backgroundColor: 'rgba(49, 130, 206, 0.08)', 
                        borderRadius: '12px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(49, 130, 206, 0.12)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>PROTEIN</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                          <span style={{ color: '#3182ce', fontWeight: '700', fontSize: '28px' }}>{totalNutrition ? totalNutrition.protein : 0}</span>
                          <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '16px 18px', 
                        backgroundColor: 'rgba(237, 137, 54, 0.08)', 
                        borderRadius: '12px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(237, 137, 54, 0.12)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>CARBS</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                          <span style={{ color: '#ed8936', fontWeight: '700', fontSize: '28px' }}>{totalNutrition ? totalNutrition.carbs : 0}</span>
                          <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '16px 18px', 
                        backgroundColor: 'rgba(159, 122, 234, 0.08)', 
                        borderRadius: '12px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(159, 122, 234, 0.12)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <span style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '4px', fontWeight: '600' }}>FATS</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                          <span style={{ color: '#9f7aea', fontWeight: '700', fontSize: '28px' }}>{totalNutrition ? totalNutrition.fat : 0}</span>
                          <span style={{ color: '#718096', fontSize: '14px', marginLeft: '5px' }}>g</span>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </>
            );
            } else {
              // Not in a meal window or no current meal
              return (
                <div className="not-meal-time" style={{textAlign: 'center', padding: '2rem'}}>
                  <div style={{marginBottom: '1.5rem'}}>
                    <div style={{
  margin: '0 auto 2.5rem',
  maxWidth: '520px',
  padding: '2.2rem 1.5rem 1.5rem 1.5rem',
  background: 'rgba(255,255,255,0.13)',
  borderRadius: '18px',
  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.25), 0 0 24px rgba(255,255,255,0.09) inset',
  border: '1.5px solid rgba(255,255,255,0.16)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  animation: 'pulse-strong 1.8s infinite'
}}>
  <h3 style={{
    fontSize: '2.5rem',
    fontWeight: 100,
    marginBottom: '0.8rem',
    fontFamily: `'Poppins', 'Montserrat', 'Quicksand', sans-serif`,
    color: 'white',
    textShadow: '0 2px 16px rgba(255,255,255,0.85), 0 0 30px rgba(120,148,255,0.18)',
    letterSpacing: '2px',
    lineHeight: 1.2,
    textAlign: 'center',
    animation: 'pulse-strong 1.8s infinite',
    background: 'none',
    border: 'none',
    padding: 0
  }}>No meals here...</h3>
  <div style={{
    fontSize: '1.35rem',
    fontWeight: 400,
    color: 'white',
    textShadow: '0 0 8px rgba(255,255,255,0.5)',
    fontFamily: `'Poppins', 'Montserrat', sans-serif`,
    letterSpacing: '0.8px',
    textAlign: 'center',
    marginTop: '0.2rem',
    marginBottom: 0,
    background: 'none',
    border: 'none',
    padding: 0,
    width: '100%'
  }}>
    {nextMeal && nextMeal.type && nextMeal.mealTime ? (
      <>
        <span style={{ fontWeight: 500, marginRight: '0.5rem', color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.8)' }}>Next meal:</span>
        <span style={{ fontWeight: 600, color: 'white', textShadow: '0 0 8px rgba(255,255,255,0.4)' }}>
          {nextMeal.type.charAt(0).toUpperCase() + nextMeal.type.slice(1)} at {nextMeal.mealTime}
        </span>
      </>
    ) : (
      'Next meal information unavailable'
    )}
  </div>
</div>
                     <img 
                      src="/images/goku.png" 
                      alt="Goku" 
                      className="goku-image"
                    />
                    {/* {nextMeal && nextMeal.type && nextMeal.mealTime && (
                      <div style={{
                        color: '#e2e8f0',
                        marginTop: '2rem',
                        fontSize: '1.25rem',
                        fontWeight: 300,
                        letterSpacing: '0.5px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.10)'
                      }}>
                        Next meal: <span style={{color:'#ff7675',fontWeight:400}}>{nextMeal.type.charAt(0).toUpperCase() + nextMeal.type.slice(1)}</span> at <span style={{color:'#ffb347',fontWeight:400}}>{nextMeal.mealTime}</span>
                      </div>
                    )} */}

            
                  </div>
                </div>
              );
            }
          } else if (activeTab === 'next') {
            // Always show the Next Meal nutrition toggle button
            return (
              <div>

                {/* Next Meal Tab content: toggle between simple and nutrition card view */}
                {showNextMealNutrition ? (
                  <div className="meal-cards">
                    {nextMeal.items && nextMeal.items.length > 0 ? (
                      nextMeal.items.map((item, index) => {
                        const itemNutrition = activeTab === 'next' ? nextMealNutritionData[item] : currentMealNutritionData[item];
                        const quantity = nextMealQuantities[item] || 1;
                        const servingOptions = itemNutrition?.servings || [];
                        const selectedSize = nextMealServingSizes[item] || servingOptions[0]?.size || 'medium';
                        const serving = servingOptions.find(s => s.size === selectedSize) || servingOptions[0];
                        const calculatedNutrition = {
                          calories: serving ? Math.round((serving.calories || 0) * quantity * 10) / 10 : 0,
                          protein: serving ? Math.round((serving.protein || 0) * quantity * 10) / 10 : 0,
                          carbs: serving ? Math.round((serving.carbs || 0) * quantity * 10) / 10 : 0,
                          fat: serving ? Math.round((serving.fat || 0) * quantity * 10) / 10 : 0
                        };
                        return (
                          <div key={index} className="meal-card">
                            <div className="meal-item dish-name">{item.trim() || 'Not specified'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                              {/* Quantity controls */}
                              <button
                                onClick={() => setNextMealQuantities(prev => ({ ...prev, [item]: Math.max(0, (prev[item] || 1) - 1) }))}
                                style={{ padding: '2px 8px', borderRadius: '6px', border: 'none', background: '#e2e8f0', color: '#222', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
                                aria-label={`Decrease quantity of ${item}`}
                              >
                                −
                              </button>
                              <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                              <button
                                onClick={() => setNextMealQuantities(prev => ({ ...prev, [item]: (prev[item] || 1) + 1 }))}
                                style={{ padding: '2px 8px', borderRadius: '6px', border: 'none', background: '#e2e8f0', color: '#222', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
                                aria-label={`Increase quantity of ${item}`}
                              >
                                +
                              </button>
                              {/* Serving size dropdown */}
                              {servingOptions.length > 1 && (
                                <select
                                  value={selectedSize}
                                  onChange={e => setNextMealServingSizes(prev => ({ ...prev, [item]: e.target.value }))}
                                  style={{ marginLeft: 8, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}
                                >
                                  {servingOptions.map((s, i) => (
                                    <option key={i} value={s.size}>{s.size}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="nutrition-info">
                              {itemNutrition ? (
                                <div>
                                  <div><span className="macro-label">Calories:</span> <span className="macro-value">{calculatedNutrition.calories}</span></div>
                                  <div><span className="macro-label">Protein:</span> <span className="macro-value">{calculatedNutrition.protein}g</span></div>
                                  <div><span className="macro-label">Carbs:</span> <span className="macro-value">{calculatedNutrition.carbs}g</span></div>
                                  <div><span className="macro-label">Fat:</span> <span className="macro-value">{calculatedNutrition.fat}g</span></div>
                                </div>
                              ) : (
                                <div>No nutrition data available</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-items">No items available for this meal</div>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            );
            // Next Meal tab is always showing the nextMeal data, regardless of whether it's meal time or not
            if (!nextMeal || !nextMeal.type) {
              return (
                <div className="next-meal-loading" style={{padding: '2rem', textAlign: 'center'}}>
                  <>
                    <div style={{fontSize: '2rem', marginBottom: '1rem', color: '#718096'}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                      </svg>
                    </div>
                    <h3 style={{color: '#2d3748', marginBottom: '1rem'}}>Loading next meal data...</h3>
                    <p style={{color: '#718096'}}>Please wait while we retrieve your next meal information.</p>
                  </>
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span style={{color:'#92400e',fontSize:'0.9rem'}}>
                        {nextMeal.isFallbackData === true ? 'Using current meal items as preview' : 'Using fallback data from previous week\'s schedule'}
                      </span>
                    </div>
                  )}
                </div>
                {/* Next Meal Tab content: toggle between simple and nutrition card view */}
                {showNextMealNutrition ? (
                  <div className="meal-cards">
                    {nextMeal.items && nextMeal.items.length > 0 ? (
                      nextMeal.items.map((item, index) => {
                        const itemNutrition = activeTab === 'next' ? nextMealNutritionData[item] : currentMealNutritionData[item];
                        const quantity = nextMealQuantities[item] || 1;
                        const servingOptions = itemNutrition?.servings || [];
                        const selectedSize = nextMealServingSizes[item] || servingOptions[0]?.size || 'medium';
                        const serving = servingOptions.find(s => s.size === selectedSize) || servingOptions[0];
                        const calculatedNutrition = {
                          calories: serving ? Math.round((serving.calories || 0) * quantity * 10) / 10 : 0,
                          protein: serving ? Math.round((serving.protein || 0) * quantity * 10) / 10 : 0,
                          carbs: serving ? Math.round((serving.carbs || 0) * quantity * 10) / 10 : 0,
                          fat: serving ? Math.round((serving.fat || 0) * quantity * 10) / 10 : 0
                        };
                        return (
                          <div key={index} className="meal-card">
                            <div className="meal-item dish-name">{item.trim() || 'Not specified'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                              {/* Quantity controls */}
                              <button
                                onClick={() => setNextMealQuantities(prev => ({ ...prev, [item]: Math.max(0, (prev[item] || 1) - 1) }))}
                                style={{ padding: '2px 8px', borderRadius: '6px', border: 'none', background: '#e2e8f0', color: '#222', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
                                aria-label={`Decrease quantity of ${item}`}
                              >
                                −
                              </button>
                              <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                              <button
                                onClick={() => setNextMealQuantities(prev => ({ ...prev, [item]: (prev[item] || 1) + 1 }))}
                                style={{ padding: '2px 8px', borderRadius: '6px', border: 'none', background: '#e2e8f0', color: '#222', fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
                                aria-label={`Increase quantity of ${item}`}
                              >
                                +
                              </button>
                              {/* Serving size dropdown */}
                              {servingOptions.length > 1 && (
                                <select
                                  value={selectedSize}
                                  onChange={e => setNextMealServingSizes(prev => ({ ...prev, [item]: e.target.value }))}
                                  style={{ marginLeft: 8, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}
                                >
                                  {servingOptions.map((s, i) => (
                                    <option key={i} value={s.size}>{s.size}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="nutrition-info">
                              {itemNutrition ? (
                                <div>
                                  <div><span className="macro-label">Calories:</span> <span className="macro-value">{calculatedNutrition.calories}</span></div>
                                  <div><span className="macro-label">Protein:</span> <span className="macro-value">{calculatedNutrition.protein}g</span></div>
                                  <div><span className="macro-label">Carbs:</span> <span className="macro-value">{calculatedNutrition.carbs}g</span></div>
                                  <div><span className="macro-label">Fats:</span> <span className="macro-value">{calculatedNutrition.fat}g</span></div>
                                </div>
                              ) : (
                                <div>No nutrition data available</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-items">No items available for this meal</div>
                    )}
                  </div>
                ) : (
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
                )}
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

export default NutritionPage;
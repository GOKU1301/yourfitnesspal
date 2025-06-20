
// Mock data for different scenarios
export const mockMealData = {
  // Normal meal with items
  currentMeal: {
    type: 'dinner',
    items: ['Paneer Tikka', 'Butter Naan', 'Dal Makhani', 'Raita', 'Gulab Jamun']
  },
  // No current meal (between meal times)
  noMeal: null,
  // Error case
  error: {
    status: 'error',
    message: 'Failed to fetch meal data'
  }
};

// Simulate API call with delay
const simulateApiCall = (data, success = true, delay = 500) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({
          status: 'success',
          data: {
            currentMeal: data,
            nextMeal: {
              name: 'Breakfast',
              time: '09:00'
            },
            day: 'Monday',
            currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        });
      } else {
        reject(new Error('Failed to fetch data'));
      }
    }, delay);
  });
};

// Export mock service functions
export const mockMealService = {
  // Get current meal (success case)
  getCurrentMeal: () => simulateApiCall(mockMealData.currentMeal),
  
  // Get no meal (for between meal times)
  getNoMeal: () => simulateApiCall(mockMealData.noMeal),
  
  // Get error response
  getError: () => simulateApiCall(null, false)
};

// Helper function to determine which mock to use based on time
export const getMockMealByTime = () => {
  const hours = new Date().getHours();
  
  if (hours >= 23 || hours < 6) {
    return mockMealService.getNoMeal(); // Night time - no meal
  } else if (hours >= 6 && hours < 10) {
    return mockMealService.getCurrentMeal(); // Breakfast time
  } else if (hours >= 10 && hours < 14) {
    return mockMealService.getCurrentMeal(); // Lunch time
  } else if (hours >= 14 && hours < 22) {
    return mockMealService.getCurrentMeal(); // Dinner time
  } else {
    return mockMealService.getNoMeal(); // Between meals
  }
};

export default {
  mockMealService,
  getMockMealByTime
};

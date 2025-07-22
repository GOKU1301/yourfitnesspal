import fs from 'fs';
import path from 'path';

/**
 * TimetableParser class for parsing college meal timetables
 */
class TimetableParser {
  constructor() {
    this.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    this.mealTypes = ['breakfast', 'lunch', 'dinner'];
  }

  /**
   * Parse text extracted from a timetable image
   * @param {string} text - Text extracted from timetable image
   * @returns {Object} - Parsed timetable data
   */
  async parseText(text) {
    try {
      console.log('🔍 [TIMETABLE_PARSER] Starting timetable text parsing...');
      console.log('🔍 [TIMETABLE_PARSER] Raw text length:', text.length, 'characters');
      console.log('🔍 [TIMETABLE_PARSER] First 200 characters:', text.substring(0, 200));
      
      // Split text into lines
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log('🔍 [TIMETABLE_PARSER] Found', lines.length, 'non-empty lines');
      
      // Extract day-wise data
      const parsedData = {};
      
      for (const line of lines) {
        // Skip header lines
        if (line.includes('Menu') || line.startsWith('Day,')) {
          continue;
        }
        
        // Check if line contains day information
        const dayMatch = this.daysOfWeek.find(day => line.startsWith(day));
        
        if (dayMatch) {
          const day = dayMatch;
          const parts = line.split(',').map(part => part.trim());
          
          // First part is the day, so remove it
          parts.shift();
          
          // Find the indices where each meal section ends
          let breakfastEnd = -1;
          let lunchEnd = -1;
          
          // Find where breakfast ends (usually before a dessert item in lunch)
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase().includes('fruit')) {
              breakfastEnd = i;
              break;
            }
          }
          
          // Find where lunch ends (usually ends with a dessert)
          if (breakfastEnd !== -1) {
            for (let i = breakfastEnd + 1; i < parts.length; i++) {
              const item = parts[i].toLowerCase();
              if (item.includes('ladoo') || 
                  item.includes('halwa') || 
                  item.includes('jalebi') || 
                  item.includes('burfi') || 
                  item.includes('kheer')) {
                lunchEnd = i;
                break;
              }
            }
          }
          
          if (breakfastEnd !== -1 && lunchEnd !== -1) {
            // Get all items for each meal
            const breakfast = parts.slice(0, breakfastEnd + 1);
            const lunch = parts.slice(breakfastEnd + 1, lunchEnd + 1);
            const dinner = parts.slice(lunchEnd + 1);
            
            parsedData[day] = {
              breakfast: breakfast.filter(item => item && item !== 'and'),
              lunch: lunch.filter(item => item && item !== 'and'),
              dinner: dinner.filter(item => item && item !== 'and')
            };
            
            console.log(`🔍 [TIMETABLE_PARSER] Processed day: ${day}`);
            console.log(`🔍 [TIMETABLE_PARSER] ${day} meals:`, {
              breakfast: breakfast.length + ' items',
              lunch: lunch.length + ' items',
              dinner: dinner.length + ' items'
            });
          }
        }
      }
      
      console.log('🔍 [TIMETABLE_PARSER] Parsing complete. Days found:', Object.keys(parsedData).join(', '));
      console.log('🔍 [TIMETABLE_PARSER] Parsed data structure:', JSON.stringify(parsedData, null, 2));
      return parsedData;
    } catch (error) {
      console.error('❌ [TIMETABLE_PARSER] Error parsing timetable text:', error);
      throw error;
    }
  }
  /**
   * Extract food items from text
   * @param {string} text - Text containing food items
   * @returns {Array} - Array of food items
   */
  extractFoodItems(text) {
    if (!text) return [];
    
    // Split by commas and clean up
    return text.split(',')
      .map(item => item.trim())
      .filter(item => item !== '' && !item.match(/^\d+\.\d+\.\d+$/)); // Filter out dates
  }

  /**
   * Validate parsed timetable data
   * @param {Object} parsedData - Parsed timetable data
   * @returns {Object} - Validation results
   */
  validateParsedData(parsedData) {
    const errors = [];
    
    // Check if all days are present
    const parsedDays = Object.keys(parsedData);
    const missingDays = this.daysOfWeek.filter(day => !parsedDays.includes(day));
    
    if (missingDays.length > 0) {
      errors.push(`Missing days: ${missingDays.join(', ')}`);
    }
    
    // Check if all meal types are present for each day
    for (const day of parsedDays) {
      const dayData = parsedData[day];
      const parsedMealTypes = Object.keys(dayData);
      const missingMealTypes = this.mealTypes.filter(type => !parsedMealTypes.includes(type));
      
      if (missingMealTypes.length > 0) {
        errors.push(`Missing meal types for ${day}: ${missingMealTypes.join(', ')}`);
      }
      
      // Check if food items are present for each meal
      for (const mealType of parsedMealTypes) {
        const foodItems = dayData[mealType];
        
        if (!foodItems || foodItems.length === 0) {
          errors.push(`No food items for ${day} ${mealType}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default TimetableParser;

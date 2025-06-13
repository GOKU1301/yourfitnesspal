import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { findStandardFoodName } from './foodMapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Nutritionix API credentials
const APP_ID = process.env.NUTRITIONIX_APP_ID || 'YOUR_APP_ID';
const APP_KEY = process.env.NUTRITIONIX_APP_KEY || 'YOUR_APP_KEY';

// Nutritionix API configuration
const NUTRITIONIX_BASE_URL = 'https://trackapi.nutritionix.com/v2';
const NUTRITIONIX_HEADERS = {
  'Content-Type': 'application/json',
  'x-app-id': APP_ID,
  'x-app-key': APP_KEY,
  'x-remote-user-id': '0' // Required by Nutritionix API but can be 0 for testing
};

/**
 * Get nutrition information for a food item using Nutritionix API
 * @param {string} foodItem - Food item name
 * @returns {Promise<Object>} - Nutrition information
 */
async function getNutritionInfo(foodItem) {
  try {
    // Use semantic search to find the standard food name
    const standardFoodName = await findStandardFoodName(foodItem);
    console.log(`Food mapping: "${foodItem}" → "${standardFoodName}"`); 
    
    // First, search for the food item to get its ID
    const searchResponse = await axios.post(
      `${NUTRITIONIX_BASE_URL}/natural/nutrients`,
      { query: standardFoodName || foodItem },
      { headers: NUTRITIONIX_HEADERS }
    );

    if (searchResponse.data && searchResponse.data.foods && searchResponse.data.foods.length > 0) {
      // Get the first match
      const foodData = searchResponse.data.foods[0];
      
      return {
        foodItem,
        calories: foodData.nf_calories || 0,
        protein: foodData.nf_protein || 0,
        fat: foodData.nf_total_fat || 0,
        carbs: foodData.nf_total_carbohydrate || 0,
        fiber: foodData.nf_dietary_fiber || 0,
        serving_qty: foodData.serving_qty || 1,
        serving_unit: foodData.serving_unit || 'serving',
        serving_weight_grams: foodData.serving_weight_grams || 100
      };
    }
    
    // If no exact match, try instant search
    const instantResponse = await axios.get(
      `${NUTRITIONIX_BASE_URL}/search/instant`,
      {
        params: { query: foodItem },
        headers: NUTRITIONIX_HEADERS
      }
    );

    if (instantResponse.data && instantResponse.data.common && instantResponse.data.common.length > 0) {
      // Get the first common food item
      const commonFood = instantResponse.data.common[0];
      
      return {
        foodItem: commonFood.food_name,
        calories: commonFood.nf_calories || 0,
        protein: 0, // Common foods don't have detailed nutrition
        fat: 0,
        carbs: 0,
        fiber: 0,
        serving_qty: commonFood.serving_qty || 1,
        serving_unit: commonFood.serving_unit || 'serving',
        serving_weight_grams: commonFood.serving_weight_grams || 100,
        note: 'Estimated nutrition data - not detailed'
      };
    }
    
    // Try one more time with a fallback search
    try {
      // If the food item contains multiple words, try just the main ingredient
      const words = standardFoodName.split(' ');
      let mainIngredient = standardFoodName;
      
      if (words.length > 1) {
        // Try using just the first word (often the main ingredient)
        mainIngredient = words[0];
        
        console.log(`Trying fallback search with main ingredient: "${mainIngredient}"`); 
        
        const fallbackResponse = await axios.post(
          `${NUTRITIONIX_BASE_URL}/natural/nutrients`,
          { query: mainIngredient },
          { headers: NUTRITIONIX_HEADERS }
        );
        
        if (fallbackResponse.data && fallbackResponse.data.foods && fallbackResponse.data.foods.length > 0) {
          // Get the first match
          const foodData = fallbackResponse.data.foods[0];
          
          return {
            foodItem,
            mappedTo: mainIngredient,
            calories: foodData.nf_calories || 0,
            protein: foodData.nf_protein || 0,
            fat: foodData.nf_total_fat || 0,
            carbs: foodData.nf_total_carbohydrate || 0,
            fiber: foodData.nf_dietary_fiber || 0,
            serving_qty: foodData.serving_qty || 1,
            serving_unit: foodData.serving_unit || 'serving',
            serving_weight_grams: foodData.serving_weight_grams || 100,
            note: 'Estimated from main ingredient'
          };
        }
      }
    } catch (fallbackError) {
      console.error(`Fallback search failed for ${foodItem}:`, fallbackError.message);
    }
    
    return {
      foodItem,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      error: 'No nutrition data found'
    };
  } catch (error) {
    console.error(`Error fetching nutrition for ${foodItem}:`, error.response?.data?.message || error.message);
    return {
      foodItem,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Process a CSV file containing meal data with a specific format:
 * Each line contains: Day, Breakfast items (comma-separated), Lunch items (comma-separated), Dinner items (comma-separated)
 * @param {string} filePath - Path to the CSV file
 */
async function processMealData(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      console.error('No data found in the timetable file');
      return [];
    }
    
    const mealData = [];
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split the line into day and meals
      const firstComma = line.indexOf(',');
      if (firstComma === -1) {
        console.warn(`Skipping malformed line (${i + 1}): No comma found`);
        continue;
      }
      
      const day = line.substring(0, firstComma).trim();
      const mealsStr = line.substring(firstComma + 1);
      
      if (!day) {
        console.warn(`Skipping line ${i + 1}: Missing day`);
        continue;
      }
      
      // Split the remaining string into breakfast, lunch, dinner
      // Each meal is separated by a comma that's not followed by a space
      // This is a simple heuristic - in a real app, you'd want more robust parsing
      const mealSplits = [];
      let currentMeal = '';
      let inMeal = false;
      
      for (let j = 0; j < mealsStr.length; j++) {
        const char = mealsStr[j];
        const nextChar = mealsStr[j + 1];
        
        if (char === ',') {
          if (nextChar === ' ' || j === mealsStr.length - 1) {
            // This comma separates meals
            mealSplits.push(currentMeal.trim());
            currentMeal = '';
            j++; // Skip the space
            if (mealSplits.length === 2) {
              // The rest is dinner
              mealSplits.push(mealsStr.substring(j + 1).trim());
              break;
            }
            continue;
          }
        }
        currentMeal += char;
      }
      
      // If we didn't find enough splits, push what we have
      if (mealSplits.length < 3 && currentMeal) {
        mealSplits.push(currentMeal.trim());
      }
      
      // Ensure we have exactly 3 meals
      while (mealSplits.length < 3) {
        mealSplits.push('');
      }
      
      const [breakfast, lunch, dinner] = mealSplits;
      
      // Helper function to split meal items by comma and clean them up
      const splitMealItems = (mealStr) => {
        if (!mealStr) return [];
        return mealStr
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      };
      
      const breakfastItems = splitMealItems(breakfast);
      const lunchItems = splitMealItems(lunch);
      const dinnerItems = splitMealItems(dinner);
      
      console.log(`\nDay: ${day}`);
      console.log('Breakfast:', breakfastItems);
      console.log('Lunch:', lunchItems);
      console.log('Dinner:', dinnerItems);
      
      mealData.push({
        day,
        breakfast: breakfastItems,
        lunch: lunchItems,
        dinner: dinnerItems
      });
    }
    
    console.log(`\nProcessed ${mealData.length} days of meal data`);
    return mealData;
  } catch (error) {
    console.error('Error processing meal data:', error);
    return [];
  }
}

/**
 * Calculate nutrition for a meal
 * @param {Array<string>} foodItems - List of food items
 */
async function calculateMealNutrition(foodItems) {
  if (!foodItems || foodItems.length === 0) {
    return {
      items: [],
      totals: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0
      }
    };
  }

  console.log(`Processing ${foodItems.length} items:`, foodItems);
  
  // Process all food items in parallel
  const nutritionPromises = foodItems.map(item => {
    const trimmedItem = item.trim();
    if (!trimmedItem) return null;
    return getNutritionInfo(trimmedItem);
  }).filter(Boolean);
  
  const nutritionResults = await Promise.all(nutritionPromises);
  
  // Calculate totals
  const totals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0
  };
  
  nutritionResults.forEach(item => {
    if (item) {
      totals.calories += item.calories || 0;
      totals.protein += item.protein || 0;
      totals.fat += item.fat || 0;
      totals.carbs += item.carbs || 0;
      totals.fiber += item.fiber || 0;
    }
  });
  
  return {
    items: nutritionResults,
    totals
  };
}

/**
 * Analyze nutrition for all meals in a timetable
 * @param {string} filePath - Path to the timetable CSV file
 */
async function analyzeTimetableNutrition(filePath) {
  try {
    console.log(`Analyzing nutrition for timetable: ${filePath}`);
    const mealData = await processMealData(filePath);
    
    if (!mealData.length) {
      console.error('No meal data found');
      return;
    }
    
    const results = {};
    
    // Process each day
    for (const dayData of mealData) {
      console.log(`\nProcessing nutrition for ${dayData.day}:`);
      
      // Process breakfast
      console.log('\n--- BREAKFAST ---');
      const breakfastNutrition = await calculateMealNutrition(dayData.breakfast);
      console.log('Breakfast Items:');
      breakfastNutrition.items.forEach(item => {
        const mappingInfo = item.mappedTo ? ` (mapped to "${item.mappedTo}")` : '';
        console.log(`${item.foodItem}${mappingInfo}: ${Math.round(item.calories)} cal, Protein: ${item.protein.toFixed(1)}g, Carbs: ${item.carbs.toFixed(1)}g, Fat: ${item.fat.toFixed(1)}g`);
      });
      console.log(`Breakfast Totals: ${Math.round(breakfastNutrition.totals.calories)} cal, Protein: ${breakfastNutrition.totals.protein.toFixed(1)}g, Carbs: ${breakfastNutrition.totals.carbs.toFixed(1)}g, Fat: ${breakfastNutrition.totals.fat.toFixed(1)}g`);
      
      // Process lunch
      console.log('\n--- LUNCH ---');
      const lunchNutrition = await calculateMealNutrition(dayData.lunch);
      console.log('Lunch Items:');
      lunchNutrition.items.forEach(item => {
        const mappingInfo = item.mappedTo ? ` (mapped to "${item.mappedTo}")` : '';
        console.log(`${item.foodItem}${mappingInfo}: ${Math.round(item.calories)} cal, Protein: ${item.protein.toFixed(1)}g, Carbs: ${item.carbs.toFixed(1)}g, Fat: ${item.fat.toFixed(1)}g`);
      });
      console.log(`Lunch Totals: ${Math.round(lunchNutrition.totals.calories)} cal, Protein: ${lunchNutrition.totals.protein.toFixed(1)}g, Carbs: ${lunchNutrition.totals.carbs.toFixed(1)}g, Fat: ${lunchNutrition.totals.fat.toFixed(1)}g`);
      
      // Process dinner
      console.log('\n--- DINNER ---');
      const dinnerNutrition = await calculateMealNutrition(dayData.dinner);
      console.log('Dinner Items:');
      dinnerNutrition.items.forEach(item => {
        const mappingInfo = item.mappedTo ? ` (mapped to "${item.mappedTo}")` : '';
        console.log(`${item.foodItem}${mappingInfo}: ${Math.round(item.calories)} cal, Protein: ${item.protein.toFixed(1)}g, Carbs: ${item.carbs.toFixed(1)}g, Fat: ${item.fat.toFixed(1)}g`);
      });
      console.log(`Dinner Totals: ${Math.round(dinnerNutrition.totals.calories)} cal, Protein: ${dinnerNutrition.totals.protein.toFixed(1)}g, Carbs: ${dinnerNutrition.totals.carbs.toFixed(1)}g, Fat: ${dinnerNutrition.totals.fat.toFixed(1)}g`);
      
      // Daily totals
      const dailyTotals = {
        calories: breakfastNutrition.totals.calories + lunchNutrition.totals.calories + dinnerNutrition.totals.calories,
        protein: breakfastNutrition.totals.protein + lunchNutrition.totals.protein + dinnerNutrition.totals.protein,
        carbs: breakfastNutrition.totals.carbs + lunchNutrition.totals.carbs + dinnerNutrition.totals.carbs,
        fat: breakfastNutrition.totals.fat + lunchNutrition.totals.fat + dinnerNutrition.totals.fat,
        fiber: breakfastNutrition.totals.fiber + lunchNutrition.totals.fiber + dinnerNutrition.totals.fiber
      };
      
      console.log(`\nDAILY TOTALS FOR ${dayData.day}: ${Math.round(dailyTotals.calories)} cal, Protein: ${dailyTotals.protein.toFixed(1)}g, Carbs: ${dailyTotals.carbs.toFixed(1)}g, Fat: ${dailyTotals.fat.toFixed(1)}g`);
      
      results[dayData.day] = {
        breakfast: breakfastNutrition,
        lunch: lunchNutrition,
        dinner: dinnerNutrition,
        dailyTotals
      };
    }
    
    return results;
  } catch (error) {
    console.error('Error analyzing timetable nutrition:', error);
  }
}

// This file is meant to be imported as a module

export {
  getNutritionInfo,
  analyzeTimetableNutrition,
  calculateMealNutrition
};

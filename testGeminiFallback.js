import dotenv from 'dotenv';
import { findBestNutritionixMatch, getNutritionInfo } from './utils/nutritionixSearch.js';

// Load environment variables
dotenv.config();

// Test foods that might not be found in Nutritionix or have low similarity
const testFoods = [
  'aloo tikki', // Indian food that might not be in Nutritionix
  'pav bhaji',  // Another Indian food
  'khichdi',    // Simple Indian dish
  'butter chicken', // More common Indian dish
  'pizza',      // Common food (control - should be found in Nutritionix)
  'hamburger',
  'Arhar Dal' // Common food (control - should be found in Nutritionix)
];

async function testFallbackFunction() {
  console.log('🧪 Testing Gemini Fallback Function');
  console.log('==================================\n');

  for (const food of testFoods) {
    console.log(`\n🔍 Testing food item: "${food}"`);
    console.log('----------------------------------------');
    
    try {
      // First test with Nutritionix only (no fallback)
      console.log('📊 Testing with Nutritionix only:');
      const nutritionixResult = await findBestNutritionixMatch(food, false);
      console.log(`Result: ${nutritionixResult.found ? '✅ Found' : '❌ Not found'}`);
      if (nutritionixResult.found) {
        console.log(`  Standard name: ${nutritionixResult.standardName}`);
        console.log(`  Similarity: ${nutritionixResult.similarity.toFixed(3)}`);
        console.log(`  Source: ${nutritionixResult.source || 'nutritionix'}`);
        
        // Log detailed nutrition info if available
        if (nutritionixResult.data) {
          console.log('  Full API Response:');
          
          console.log('\n  Nutrition Information:');
          console.log(`    Serving size: ${nutritionixResult.data.serving_weight_grams || 'N/A'}g`);
          console.log(`    Calories: ${nutritionixResult.data.nf_calories || 'N/A'}`);
          
          // Try to find nutrition data in nested fields
          const foodData = nutritionixResult.data.food || nutritionixResult.data;
          const fullNutrients = foodData.full_nutrients || [];
          
          // Helper to find nutrient by attribute ID
          const findNutrient = (id) => {
            const nutrient = fullNutrients.find(n => n.attr_id === id);
            return nutrient ? nutrient.value : 'N/A';
          };
          
          // Common nutrient IDs in Nutritionix
          const NUTRIENT_IDS = {
            PROTEIN: 203,
            CARBS: 205,
            FAT: 204,
            FIBER: 291,
            SUGAR: 269,
            CALORIES: 208
          };
          
          console.log(`    Protein: ${findNutrient(NUTRIENT_IDS.PROTEIN)}g`);
          console.log(`    Carbs: ${findNutrient(NUTRIENT_IDS.CARBS)}g`);
          console.log(`    Fat: ${findNutrient(NUTRIENT_IDS.FAT)}g`);
          console.log(`    Fiber: ${findNutrient(NUTRIENT_IDS.FIBER)}g`);
          console.log(`    Sugar: ${findNutrient(NUTRIENT_IDS.SUGAR)}g`);
          
          // Also log the full nutrients array

        }
      } else {
        console.log(`  Error: ${nutritionixResult.error}`);
      }
      
      // Then test with fallback enabled
      // console.log('\n📊 Testing with Gemini fallback enabled:');
      const fallbackResult = await findBestNutritionixMatch(food, true);
      console.log(`Result: ${fallbackResult.found ? '✅ Found' : '❌ Not found'}`);
      if (fallbackResult.found) {
        console.log(`  Standard name: ${fallbackResult.standardName}`);
        console.log(`  Source: ${fallbackResult.source || 'nutritionix'}`);
        if (fallbackResult.similarity) {
          console.log(`  Similarity: ${fallbackResult.similarity.toFixed(3)}`);
        }
        if (fallbackResult.confidence) {
          console.log(`  Confidence: ${fallbackResult.confidence.toFixed(3)}`);
        }
        
        // Log detailed nutrition info based on source
        if (fallbackResult.source === 'gemini' && fallbackResult.nutrition) {
          console.log('  Gemini Nutrition Information:');
          console.log(`    Serving size: ${fallbackResult.nutrition.serving_size || '100g'}`);
          console.log(`    Calories: ${fallbackResult.nutrition.calories || 'N/A'}`);
          console.log(`    Protein: ${fallbackResult.nutrition.protein || 'N/A'}g`);
          console.log(`    Carbs: ${fallbackResult.nutrition.carbs || 'N/A'}g`);
          console.log(`    Fat: ${fallbackResult.nutrition.fat || 'N/A'}g`);
          console.log(`    Fiber: ${fallbackResult.nutrition.fiber || 'N/A'}g`);
          console.log(`    Sugar: ${fallbackResult.nutrition.sugar || 'N/A'}g`);
        } else if (fallbackResult.data) {
          console.log('  Nutrition Information:');
          console.log(`    Serving size: ${fallbackResult.data.serving_weight_grams || 'N/A'}g`);
          console.log(`    Calories: ${fallbackResult.data.nf_calories || 'N/A'}`);
          console.log(`    Protein: ${fallbackResult.data.nf_protein || 'N/A'}g`);
          console.log(`    Carbs: ${fallbackResult.data.nf_total_carbohydrate || 'N/A'}g`);
          console.log(`    Fat: ${fallbackResult.data.nf_total_fat || 'N/A'}g`);
          console.log(`    Fiber: ${fallbackResult.data.nf_dietary_fiber || 'N/A'}g`);
          console.log(`    Sugar: ${fallbackResult.data.nf_sugars || 'N/A'}g`);
        }
      } else {
        console.log(`  Error: ${fallbackResult.error}`);
      }
      
      // Test full nutrition info
      console.log('\n📊 Testing full nutrition info:');
      const nutritionInfo = await getNutritionInfo(food);
      console.log(`Result: ${nutritionInfo.success ? '✅ Success' : '❌ Failed'}`);
      if (nutritionInfo.success) {
        // console.log(`  Original name: ${nutritionInfo.originalName}`);
        // console.log(`  Standard name: ${nutritionInfo.standardName}`);
        // console.log(`  Source: ${nutritionInfo.source}`);
        // console.log('  Nutrition data:');
        // console.log(`    Serving size: ${nutritionInfo.nutrition.serving_size_g}g`);
        // console.log(`    Calories: ${nutritionInfo.nutrition.calories}`);
        // console.log(`    Protein: ${nutritionInfo.nutrition.protein_g}g`);
        // console.log(`    Carbs: ${nutritionInfo.nutrition.carbohydrates_total_g}g`);
        // console.log(`    Fat: ${nutritionInfo.nutrition.fat_total_g}g`);
      } else {
        console.log(`  Error: ${nutritionInfo.error}`);
      }
      
      console.log('\n');
    } catch (error) {
      console.error(`❌ Error testing "${food}":`, error);
    }
    
    // Add a delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the test
testFallbackFunction().catch(error => {
  console.error('❌ Test failed:', error);
});

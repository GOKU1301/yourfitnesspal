import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { calculateStringSimilarity } from './foodMapping.js';
import { getFallbackNutrition } from './geminiNutrition.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_APP_KEY) {
  console.error('Error: Nutritionix API credentials missing. Please set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in .env file');
}

/**
 * Search for food items in Nutritionix API
 * @param {string} query - Food item to search for
 * @returns {Promise<Array>} - Array of matching food items
 */
async function searchNutritionix(query) {
  try {
    console.log(`🔍 [NUTRITIONIX_SEARCH] Searching API for: "${query}"`);
    console.log(`🔍 [NUTRITIONIX_SEARCH] Request timestamp: ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    const response = await axios({
      method: 'GET',
      url: 'https://trackapi.nutritionix.com/v2/search/instant',
      headers: {
        'x-app-id': NUTRITIONIX_APP_ID,
        'x-app-key': NUTRITIONIX_APP_KEY,
        'Content-Type': 'application/json'
      },
      params: {
        query: query,
        detailed: true
      }
    });
    
    const endTime = Date.now();
    console.log(`🔍 [NUTRITIONIX_SEARCH] API response time: ${endTime - startTime}ms`);
    
    // Combine common and branded foods
    const allFoods = [
      ...(response.data.common || []),
      ...(response.data.branded || [])
    ];
    
    console.log(`✅ [NUTRITIONIX_SEARCH] Found ${allFoods.length} matches for "${query}"`);
    console.log(`🔍 [NUTRITIONIX_SEARCH] Common foods: ${response.data.common?.length || 0}, Branded foods: ${response.data.branded?.length || 0}`);
    
    if (allFoods.length > 0) {
      console.log(`🔍 [NUTRITIONIX_SEARCH] First match: "${allFoods[0].food_name || allFoods[0].brand_name + ' ' + allFoods[0].food_name || 'unknown'}"`);
    }
    
    return allFoods;
  } catch (error) {
    console.error(`❌ [NUTRITIONIX_SEARCH] Error searching for "${query}":`, error.message);
    console.error(`❌ [NUTRITIONIX_SEARCH] Error timestamp: ${new Date().toISOString()}`);
    
    if (error.response) {
      console.error(`❌ [NUTRITIONIX_SEARCH] Status code: ${error.response.status}`);
      console.error(`❌ [NUTRITIONIX_SEARCH] Response headers:`, error.response.headers);
    }
    
    // If rate limited, wait and retry
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 2;
      console.log(`⏱️ [NUTRITIONIX_SEARCH] Rate limited, waiting ${retryAfter} seconds before retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return searchNutritionix(query);
    }
    return [];
  }
}

/**
 * Find the best match for a food item in Nutritionix
 * @param {string} foodItem - The food item to find a match for
 * @param {boolean} useGeminiFallback - Whether to use Gemini as fallback
 * @returns {Promise<Object>} - The best match and its information
 */
async function findBestNutritionixMatch(foodItem, useGeminiFallback = true) {
  console.log(`\n🍳 [NUTRITIONIX_MATCH] Starting best match search for: "${foodItem || ''}"`);
  console.log(`🍳 [NUTRITIONIX_MATCH] Start timestamp: ${new Date().toISOString()}`);
  console.log(`🍳 [NUTRITIONIX_MATCH] Gemini fallback enabled: ${useGeminiFallback}`);
  
  if (!foodItem || typeof foodItem !== 'string' || foodItem.trim().length < 2) {
    console.log(`⚠️ [NUTRITIONIX_MATCH] Invalid food item: "${foodItem || ''}"`);
    return { 
      found: false, 
      originalName: foodItem || '',
      error: 'Invalid food item',
      similarity: 0
    };
  }
  
  const cleanedFoodItem = foodItem.trim();
  console.log(`🍳 [NUTRITIONIX_MATCH] Cleaned food item: "${cleanedFoodItem}"`);
  
  try {
    // Search Nutritionix
    console.log(`🍳 [NUTRITIONIX_MATCH] Initiating Nutritionix API search...`);
    const matches = await searchNutritionix(cleanedFoodItem);
    
    if (matches.length === 0) {
      console.log(`⚠️ [NUTRITIONIX_MATCH] No matches found for "${cleanedFoodItem}" in Nutritionix`);
      
      // Use Gemini fallback if enabled
      if (useGeminiFallback) {
        console.log(`🤖 [NUTRITIONIX_MATCH] Trying Gemini fallback for "${cleanedFoodItem}"...`);
        console.log(`🤖 [NUTRITIONIX_MATCH] Gemini fallback timestamp: ${new Date().toISOString()}`);
        return await getFallbackNutrition(cleanedFoodItem);
      }
      
      return { 
        found: false, 
        originalName: cleanedFoodItem, 
        error: 'No matches found',
        similarity: 0
      };
    }
    
    // If we got matches but they don't have nutrition data, try to fetch it
    const enhancedMatches = await Promise.all(matches.map(async (match) => {
      // If the match already has nutrition data, use it
      if (match.nf_calories !== undefined || (match.full_nutrients && match.full_nutrients.length > 0)) {
        return match;
      }
      
      // Otherwise, try to fetch the detailed nutrition data
      try {
        const foodId = match.nix_item_id || match.food_name;
        if (!foodId) return match;
        
        console.log(`🔍 [NUTRITIONIX_MATCH] Fetching detailed nutrition data for: ${match.food_name || match.foodName}`);
        console.log(`🔍 [NUTRITIONIX_MATCH] Food ID: ${foodId}`);
        const detailStartTime = Date.now();
        const response = await axios({
          method: 'GET',
          url: 'https://trackapi.nutritionix.com/v2/search/item',
          headers: {
            'x-app-id': NUTRITIONIX_APP_ID,
            'x-app-key': NUTRITIONIX_APP_KEY,
            'Content-Type': 'application/json'
          },
          params: {
            nix_item_id: foodId
          }
        });
        console.log(`🔍 [NUTRITIONIX_MATCH] Detailed nutrition fetch time: ${Date.now() - detailStartTime}ms`);
        
        if (response.data && response.data.foods && response.data.foods.length > 0) {
          return { ...match, ...response.data.foods[0] };
        }
      } catch (error) {
        console.error(`Error fetching detailed nutrition for ${match.food_name || match.foodName}:`, error.message);
      }
      
      return match;
    }));
    
    // Use the enhanced matches for further processing
    const matchesWithNutrition = enhancedMatches.filter(match => 
      match.nf_calories !== undefined || 
      (match.full_nutrients && match.full_nutrients.length > 0)
    );
    
    // If no matches have nutrition data, log a warning
    if (matchesWithNutrition.length === 0) {
      console.log(`⚠️ No matches with nutrition data found for "${cleanedFoodItem}"`);
      if (useGeminiFallback) {
        console.log(`🤖 Trying Gemini fallback for "${cleanedFoodItem}"...`);
        return await getFallbackNutrition(cleanedFoodItem);
      }
      
      return { 
        found: false, 
        originalName: cleanedFoodItem, 
        error: 'No nutrition data available',
        similarity: 0
      };
    }
    
    // Find best match based on string similarity and nutrition data availability
    let bestMatch = null;
    let bestSimilarity = -1;
    
    // Log top matches for better debugging
    console.log(`📊 [NUTRITIONIX_MATCH] Top matches for "${cleanedFoodItem}":`);
    const topN = Math.min(matchesWithNutrition.length, 5);
    console.log(`📊 [NUTRITIONIX_MATCH] Found ${matchesWithNutrition.length} matches with nutrition data`);
    
    for (let i = 0; i < matchesWithNutrition.length; i++) {
      const match = matchesWithNutrition[i];
      const matchName = match.food_name || match.foodName || '';
      const similarity = calculateStringSimilarity(cleanedFoodItem, matchName);
      
      // Only consider matches with nutrition data
      const hasNutritionData = match.nf_calories !== undefined || 
                             (match.full_nutrients && match.full_nutrients.length > 0);
      
      if (i < topN) {
        console.log(`   ${i+1}. "${matchName}" (similarity: ${similarity.toFixed(3)}, has nutrition: ${hasNutritionData ? '✅' : '❌'})`);
      }
      
      // Prefer matches with better similarity and nutrition data
      if (hasNutritionData && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = match;
      }
    }
    
    // If no match with nutrition data was found, use the first one
    if (!bestMatch && matchesWithNutrition.length > 0) {
      bestMatch = matchesWithNutrition[0];
      const matchName = bestMatch.food_name || bestMatch.foodName || '';
      bestSimilarity = calculateStringSimilarity(cleanedFoodItem, matchName);
      console.log(`ℹ️ No match with nutrition data found, using best match: "${matchName}"`);
    }
    
    // Use a higher similarity threshold to ensure better matches
    const similarityThreshold = 0.85;
    
    // Note: We no longer use a lower threshold for Indian foods
    
    const bestMatchName = bestMatch.food_name || bestMatch.foodName || '';
    console.log(`✅ [NUTRITIONIX_MATCH] Best match: "${bestMatchName}" (similarity: ${bestSimilarity.toFixed(3)})`);
    console.log(`🍳 [NUTRITIONIX_MATCH] Match threshold: ${similarityThreshold}, Actual similarity: ${bestSimilarity.toFixed(3)}`);
    
    // Log the complete raw nutritional data structure from Nutritionix
    console.log(`\n📊 [NUTRITIONIX_MATCH] RAW API DATA for "${bestMatchName}":`);
    console.log(`- Food ID: ${bestMatch.food_name}`);
    console.log(`- Serving size: ${bestMatch.serving_qty} ${bestMatch.serving_unit} (${bestMatch.serving_weight_grams}g)`);
    console.log(`- Calories: ${bestMatch.nf_calories} kcal`);
    console.log(`🍳 [NUTRITIONIX_MATCH] Nutrition data available: ${bestMatch.nf_calories ? 'Yes' : 'No'}`);
    
    // Check if data is in alt_measures or full_measures array
    if (bestMatch.alt_measures && bestMatch.alt_measures.length > 0) {
      console.log('\nFound alt_measures data:');
      console.log(JSON.stringify(bestMatch.alt_measures.slice(0, 2), null, 2));
    }
    
    // Check data structure - this field might have what we need
    if (bestMatch.full_nutrients && bestMatch.full_nutrients.length > 0) {
      console.log('\nFound full_nutrients data (first 3 entries):');
      // console.log(JSON.stringify(bestMatch.full_nutrients.slice(0, 3), null, 2));
      
      // Map of attr_id to nutrient name
      const NUTRIENT_IDS = {
        203: 'protein',
        204: 'fat',
        205: 'carbs',
        208: 'calories',
        269: 'sugars',
        291: 'fiber'
      };
      
      // Extract nutrients from full_nutrients array
      const nutrients = {};
      bestMatch.full_nutrients.forEach(nutrient => {
        if (NUTRIENT_IDS[nutrient.attr_id]) {
          nutrients[NUTRIENT_IDS[nutrient.attr_id]] = nutrient.value;
        }
      });
      
      // console.log('\nExtracted nutrients from full_nutrients array:');
      // console.log(JSON.stringify(nutrients, null, 2));
      
      // Update bestMatch with extracted nutrients
      if (!bestMatch.nf_protein && nutrients.protein) bestMatch.nf_protein = nutrients.protein;
      if (!bestMatch.nf_total_fat && nutrients.fat) bestMatch.nf_total_fat = nutrients.fat;
      if (!bestMatch.nf_total_carbohydrate && nutrients.carbs) bestMatch.nf_total_carbohydrate = nutrients.carbs;
      if (!bestMatch.nf_sugars && nutrients.sugars) bestMatch.nf_sugars = nutrients.sugars;
      if (!bestMatch.nf_dietary_fiber && nutrients.fiber) bestMatch.nf_dietary_fiber = nutrients.fiber;
    }
    
    // Log the potentially updated nutrients
    console.log('\n🍳 [NUTRITIONIX_MATCH] Final nutrient values:');
    console.log(`- Protein: ${bestMatch.nf_protein || 'N/A'}g`);
    console.log(`- Carbohydrates: ${bestMatch.nf_total_carbohydrate || 'N/A'}g`);
    console.log(`- Fat: ${bestMatch.nf_total_fat || 'N/A'}g`);
    console.log(`- Fiber: ${bestMatch.nf_dietary_fiber || 'N/A'}g`);
    console.log(`- Sugars: ${bestMatch.nf_sugars || 'N/A'}g`);
    
    console.log(`🍳 [NUTRITIONIX_MATCH] Nutrition data extraction complete at: ${new Date().toISOString()}`);
    
    // Show raw data structure fields
    // console.log('\n📋 Available fields in the API response:');
    // console.log(Object.keys(bestMatch).join(', '));      
    
    // Return the match if similarity is above threshold
    if (bestSimilarity >= similarityThreshold) {
      console.log(`✅ [NUTRITIONIX_MATCH] Match accepted: "${cleanedFoodItem}" → "${bestMatchName}"`);
      return {
        found: true,
        originalName: cleanedFoodItem,
        standardName: bestMatchName,
        similarity: bestSimilarity,
        source: 'nutritionix',
        data: bestMatch
      };
    } else {
      console.log(`⚠️ [NUTRITIONIX_MATCH] No good match found for "${cleanedFoodItem}" (best similarity: ${bestSimilarity.toFixed(3)})`);
      console.log(`⚠️ [NUTRITIONIX_MATCH] Similarity ${bestSimilarity.toFixed(3)} below threshold ${similarityThreshold}`);
      
      // Use Gemini fallback if enabled
      if (useGeminiFallback) {
        console.log(`🤖 [NUTRITIONIX_MATCH] Trying Gemini fallback for "${cleanedFoodItem}"...`);
        console.log(`🤖 [NUTRITIONIX_MATCH] Gemini fallback timestamp: ${new Date().toISOString()}`);
        return await getFallbackNutrition(cleanedFoodItem, similarityThreshold);
      }
      
      return { 
        found: false, 
        originalName: cleanedFoodItem, 
        similarity: bestSimilarity,
        error: 'No good match found'
      };
    }
  } catch (error) {
    console.error(`❌ [NUTRITIONIX_MATCH] Error finding match for "${cleanedFoodItem}":`, error.message);
    console.error(`❌ [NUTRITIONIX_MATCH] Error timestamp: ${new Date().toISOString()}`);
    console.error(`❌ [NUTRITIONIX_MATCH] Error stack:`, error.stack);
    
    // Use Gemini fallback if enabled and there was an error with Nutritionix
    if (useGeminiFallback) {
      console.log(`🤖 [NUTRITIONIX_MATCH] Trying Gemini fallback due to error for "${cleanedFoodItem}"...`);
      console.log(`🤖 [NUTRITIONIX_MATCH] Gemini fallback timestamp: ${new Date().toISOString()}`);
      try {
        return await getFallbackNutrition(cleanedFoodItem);
      } catch (fallbackError) {
        console.error(`❌ [NUTRITIONIX_MATCH] Gemini fallback also failed for "${cleanedFoodItem}":`, fallbackError.message);
        console.error(`❌ [NUTRITIONIX_MATCH] Fallback error timestamp: ${new Date().toISOString()}`);
      }
    }
    
    return { 
      found: false, 
      originalName: cleanedFoodItem, 
      error: error.message,
      similarity: 0
    };
  }
}

/**
 * Check if a food item is likely Indian food based on common terms
 * @param {string} foodItem - The food item to check
 * @returns {boolean} - Whether the food is likely Indian
 */
function isIndianFood(foodItem) {
  const indianFoodTerms = [
    'aloo', 'paneer', 'dal', 'roti', 'naan', 'tikka', 'masala', 
    'sabzi', 'puri', 'paratha', 'samosa', 'pulao', 'biryani',
    'korma', 'vindaloo', 'kheer', 'ladoo', 'gulab', 'jamun',
    'raita', 'chutney', 'sambar', 'rasam', 'dosa', 'idli', 'vada'
  ];
  
  return indianFoodTerms.some(term => 
    foodItem.toLowerCase().includes(term.toLowerCase())
  );
}

/**
 * Add a food mapping if it doesn't already exist
 * @param {string} localName - Original food name
 * @param {string} standardName - Standard food name in Nutritionix
 * @returns {Promise<{added: boolean, existed: boolean}>} - Whether the mapping was added or existed
 */
async function addFoodMappingIfNew(localName, standardName) {
  const mappingsPath = path.join(process.cwd(), 'data', 'foodMappings.json');
  const mappingsDir = path.dirname(mappingsPath);
  
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(mappingsDir, { recursive: true });
    
    let mappings = {};
    
    // Read existing mappings if file exists
    try {
      const rawData = await fs.readFile(mappingsPath, 'utf8');
      if (rawData.trim()) {
        mappings = JSON.parse(rawData);
      }
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        console.error('❌ Error reading food mappings:', readError.message);
      }
      // If file doesn't exist, we'll create it with the new mapping
    }
    
    // Normalize names
    const normalizedLocalName = localName.toLowerCase().trim();
    const normalizedStandardName = standardName.toLowerCase().trim();
    
    // Check if mapping already exists
    if (mappings[normalizedLocalName]) {
      const existingMapping = mappings[normalizedLocalName];
      if (existingMapping === normalizedStandardName) {
        console.log(`ℹ️ Mapping already exists: "${normalizedLocalName}" → "${normalizedStandardName}"`);
        return { added: false, existed: true };
      } else {
        console.log(`🔄 Updating mapping: "${normalizedLocalName}" from "${existingMapping}" to "${normalizedStandardName}"`);
      }
    }
    
    // Add/update the mapping
    mappings[normalizedLocalName] = normalizedStandardName;
    
    // Write back to file with pretty print
    await fs.writeFile(mappingsPath, JSON.stringify(mappings, null, 2), 'utf8');
    
    return { 
      added: true, 
      existed: false 
    };
    
  } catch (error) {
    console.error('❌ Error adding/updating food mapping:', error.message);
    return { 
      added: false, 
      existed: false,
      error: error.message 
    };
  }
}

/**
 * Process a list of food items and add mappings for them
 * @param {Array<string>} foodItems - List of food items to process
 * @returns {Promise<Array>} - Results of processing
 */
async function processFoodItemsForMappings(foodItems) {
  const results = [];
  
  console.log(`🚀 Processing ${foodItems.length} food items for mappings...`);
  
  // Process each food item
  for (const item of foodItems) {
    if (!item || item.trim() === '') continue;
    
    console.log(`\n🔍 Processing: "${item}"`);
    
    try {
      // Find best match in Nutritionix
      const match = await findBestNutritionixMatch(item);
      
      if (match.found && match.similarity > 0.6) {
        // Add to mappings if it's a good match
        const added = await addFoodMappingIfNew(match.originalName, match.standardName);
        results.push({
          originalName: match.originalName,
          standardName: match.standardName,
          similarity: match.similarity,
          added
        });
      } else {
        console.log(`⚠️ No good match found for "${item}". Skipping.`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error processing "${item}":`, error.message);
      results.push({
        originalName: item,
        error: error.message
      });
    }
  }
  
  console.log(`\n✅ Completed processing ${results.length} food items`);
  return results;
}

/**
 * Get detailed nutrition information for a food item
 * @param {string} foodItem - The food item to get nutrition for
 * @param {boolean} useGeminiFallback - Whether to use Gemini as fallback
 * @returns {Promise<Object>} - Nutrition information
 */
async function getNutritionInfo(foodItem, useGeminiFallback = true) {
  try {
    // First find the best match
    const match = await findBestNutritionixMatch(foodItem, useGeminiFallback);
    
    if (!match.found) {
      return {
        success: false,
        originalName: foodItem,
        error: match.error || 'No nutrition information found',
        source: match.source || 'unknown'
      };
    }
    
    // If the match is from Gemini, the nutrition data is already included
    if (match.source === 'gemini') {
      return {
        success: true,
        originalName: match.originalName,
        standardName: match.standardName,
        source: 'gemini',
        confidence: match.confidence,
        nutrition: match.nutrition
      };
    }
    
    // Extract nutrition data from Nutritionix API response
    const nutritionData = match.data.food || match.data;
    
    console.log('\n📊 Processing Nutritionix data for better nutrition extraction');
    
    // Common nutrient IDs in Nutritionix
    const NUTRIENT_IDS = {
      PROTEIN: 203,
      CARBS: 205,
      FAT: 204,
      FIBER: 291,
      SUGAR: 269,
      CALORIES: 208
    };
    
    // Extract nutrients from full_nutrients array first
    const extractedNutrients = {};
    
    if (nutritionData.full_nutrients && Array.isArray(nutritionData.full_nutrients)) {
      console.log(`Found ${nutritionData.full_nutrients.length} nutrients in full_nutrients array`);
      
      // Process the full_nutrients array
      nutritionData.full_nutrients.forEach(nutrient => {
        const { attr_id, value } = nutrient;
        
        // Map to standard nutrient names
        switch (attr_id) {
          case NUTRIENT_IDS.PROTEIN:
            extractedNutrients.protein = value;
            break;
          case NUTRIENT_IDS.CARBS:
            extractedNutrients.carbs = value;
            break;
          case NUTRIENT_IDS.FAT:
            extractedNutrients.fat = value;
            break;
          case NUTRIENT_IDS.FIBER:
            extractedNutrients.fiber = value;
            break;
          case NUTRIENT_IDS.SUGAR:
            extractedNutrients.sugar = value;
            break;
          case NUTRIENT_IDS.CALORIES:
            extractedNutrients.calories = value;
            break;
        }
      });
      
      console.log('Extracted nutrients from full_nutrients array:');
      console.log(extractedNutrients);
    }
    
    // Helper to find nutrient by attribute ID or direct field
    const getNutrientValue = (possibleFields, attrId = null) => {
      // First try direct fields
      for (const field of possibleFields) {
        if (nutritionData[field] !== undefined) {
          return nutritionData[field];
        }
      }
      
      // Then try our extracted nutrients
      for (const nutrientKey of Object.keys(extractedNutrients)) {
        if (possibleFields.some(field => field.toLowerCase().includes(nutrientKey))) {
          return extractedNutrients[nutrientKey];
        }
      }
      
      // If we have the specific nutrient from extraction, use it
      if (attrId && extractedNutrients[Object.keys(NUTRIENT_IDS).find(key => NUTRIENT_IDS[key] === attrId)?.toLowerCase()]) {
        return extractedNutrients[Object.keys(NUTRIENT_IDS).find(key => NUTRIENT_IDS[key] === attrId)?.toLowerCase()];
      }
      
      return 0; // Default to 0 if not found
    };
    
    // Get serving size - prioritize serving_weight_grams, then calculate from qty and weight
    let servingSize = 100; // Default to 100g if not specified
    if (nutritionData.serving_weight_grams) {
      servingSize = nutritionData.serving_weight_grams;
    } else if (nutritionData.serving_qty && nutritionData.serving_unit) {
      // Try to estimate weight based on serving quantity and unit
      const weightPerServing = {
        'g': 1,
        'ml': 1, // Assuming 1ml ≈ 1g for most foods
        'oz': 28.35,
        'lb': 453.6,
        'cup': 240, // Approximate for most ingredients
        'tbsp': 15,
        'tsp': 5,
        'piece': 100, // Default weight for a piece
        'slice': 30   // Default weight for a slice
      };
      
      const unit = nutritionData.serving_unit.toLowerCase();
      if (weightPerServing[unit]) {
        servingSize = nutritionData.serving_qty * weightPerServing[unit];
      }
    }
    
    // Get nutrition values
    const calories = getNutrientValue(['nf_calories', 'calories', 'cal'], NUTRIENT_IDS.CALORIES);
    const protein = getNutrientValue(['nf_protein', 'protein', 'proteins'], NUTRIENT_IDS.PROTEIN);
    const carbs = getNutrientValue(['nf_total_carbohydrate', 'carbs', 'carbohydrates', 'total_carbohydrate'], NUTRIENT_IDS.CARBS);
    const fat = getNutrientValue(['nf_total_fat', 'fat', 'total_fat'], NUTRIENT_IDS.FAT);
    const fiber = getNutrientValue(['nf_dietary_fiber', 'fiber', 'dietary_fiber'], NUTRIENT_IDS.FIBER);
    const sugar = getNutrientValue(['nf_sugars', 'sugar', 'sugars'], NUTRIENT_IDS.SUGAR);
    
    // Log the extracted values for debugging
    // console.log('Extracted nutrition values:', {
    //   servingSize,
    //   calories,
    //   protein,
    //   carbs,
    //   fat,
    //   fiber,
    //   sugar
    // });
    
    return {
      success: true,
      originalName: match.originalName,
      standardName: match.standardName,
      source: 'nutritionix',
      similarity: match.similarity,
      nutrition: {
        serving_size_g: Math.round(servingSize * 100) / 100, // Round to 2 decimal places
        calories: Math.round(calories * 100) / 100,
        protein_g: Math.round(protein * 100) / 100,
        carbohydrates_total_g: Math.round(carbs * 100) / 100,
        fat_total_g: Math.round(fat * 100) / 100,
        fiber_g: Math.round(fiber * 100) / 100,
        sugar_g: Math.round(sugar * 100) / 100,
        // Save the original serving unit information for better portion handling
        serving_qty: nutritionData.serving_qty || 1,
        serving_unit: nutritionData.serving_unit || 'g'
      },
      // Include the full match data for debugging
      _fullData: match.data
    
    };
  } catch (error) {
    console.error(`❌ Error getting nutrition info for "${foodItem}":`, error.message);
    return {
      success: false,
      originalName: foodItem,
      error: error.message
    };
  }
}

export {
  searchNutritionix,
  findBestNutritionixMatch,
  addFoodMappingIfNew,
  processFoodItemsForMappings,
  getNutritionInfo
};

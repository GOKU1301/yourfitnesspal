/**
 * Generate consistent, real-world portion sizes for different food types
 * @param {object} baseServing - Base serving object from Gemini response
 * @returns {Array<object>} Array of serving objects with consistent sizes
 */
/**
 * Detects if a food item is typically served in discrete pieces/units rather than by weight
 * @param {string} foodName - The name of the food item
 * @param {object} serving - The serving object that might contain piece-based flags
 * @returns {boolean} - True if the food is piece-based
 */
function isPieceBasedFood(foodName = '', serving = {}) {
  // Check if the serving was already marked as piece-based by the nutrition pipeline
  if (serving._pieceBasedFood) {
    return true;
  }
  
  // Check if the original Nutritionix serving unit was piece-based
  if (serving._source === 'nutritionix' && serving.serving_unit && 
      ['piece', 'pieces', 'ball', 'balls', 'cookie', 'cookies'].includes(serving.serving_unit.toLowerCase())) {
    return true;
  }
  
  // Check common terms for piece-based foods
  const pieceBasedTerms = [
    'sweet', 'laddu', 'barfi', 'pedha', 'jalebi', 'cookie', 'biscuit',
    'mithai', 'dessert', 'cake', 'pastry', 'snack', 'samosa', 'pakora'
  ];
  
  foodName = (foodName || '').toLowerCase();
  return pieceBasedTerms.some(term => foodName.includes(term));
}

/**
 * Generate consistent, real-world portion sizes for different food types
 * @param {object} baseServing - Base serving object from Gemini or Nutritionix
 * @returns {Array<object>} Array of serving objects with consistent sizes
 */
export function generateScaledServings(baseServing = {}) {
  const servings = [];
  if (!baseServing) return servings;

  // Clone helper
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  // Normalize input values to prevent extreme scaling
  const normalizeInput = (value, defaultVal, maxVal) => {
    if (value === null || value === undefined) return defaultVal;
    // Cap the value to prevent extreme scaling
    return Math.min(value, maxVal);
  };

  // Helper to create a serving with consistent structure
  const createServing = (size, label, weight_g, volume_ml, diameter_cm, factor = 1) => {
    const s = clone(baseServing);
    s.size = size;
    
    // Get food name in lowercase for easier matching
    const foodName = (baseServing.name || '').toLowerCase();
    let actualWeight = weight_g;
    let actualVolume = volume_ml;
    
    // Define portion sizes for different food types (in grams)
    const portionSizes = {
      // Breads
      bread: { small: 30, medium: 60, large: 90 },
      // Fruits (like apple)
      apple: { small: 100, medium: 150, large: 200 },
      // Rice and dals
      rice: { small: 100, medium: 150, large: 200 },
      dal: { small: 100, medium: 150, large: 200 },
      // Curries and main dishes
      curry: { small: 150, medium: 200, large: 300 },
      // Default for other items
      default: { small: 100, medium: 200, large: 300 }
    };
    
    // Determine food type
    let foodType = 'default';
    if (foodName.includes('bread') || foodName.includes('toast') || foodName.includes('roti')) {
      foodType = 'bread';
    } else if (foodName.includes('apple') || foodName.includes('fruit')) {
      foodType = 'apple';
    } else if (foodName.includes('rice')) {
      foodType = 'rice';
    } else if (foodName.includes('dal') || foodName.includes('lentil') || foodName.includes('curry')) {
      foodType = foodName.includes('dal') ? 'dal' : 'curry';
    }
    
    // Get appropriate portion size
    const sizes = portionSizes[foodType] || portionSizes.default;
    actualWeight = sizes[size] || sizes.medium; // Default to medium if size not found
    
    // Update portion label
    if (foodType === 'bread') {
      s.portion_label = `1 ${size === 'medium' ? '' : size + ' '}Slice (${actualWeight}g)`;
    } else if (foodType === 'apple') {
      s.portion_label = `1 ${size} ${foodName} (${actualWeight}g)`;
    } else if (foodType === 'rice' || foodType === 'dal') {
      s.portion_label = `1 ${size === 'medium' ? '' : size + ' '}Katori (${actualWeight}g)`;
    } else if (foodType === 'curry') {
      s.portion_label = `1 ${size === 'medium' ? '' : size + ' '}Bowl (${actualWeight}g)`;
    } else {
      s.portion_label = label; // Keep original label if no specific type matched
    }
    
    // Log adjustments for debugging
    if (weight_g !== actualWeight) {
      console.warn(`Adjusted portion size for ${foodName} (${size}): ${weight_g}g → ${actualWeight}g`);
    }
    
    // Set the appropriate measurement based on food type
    if (weight_g !== null) s.weight_g = actualWeight;
    if (volume_ml !== null) s.volume_ml = actualVolume || volume_ml;
    if (diameter_cm !== null) s.diameter_cm = diameter_cm;
    
    // Apply the scaling factor to nutrition values
    // For Nutritionix data, we need to use density-based scaling to preserve nutritional values
    if (baseServing._source === 'nutritionix') {
      // Calculate original density (nutrition per gram)
      const origWeight = baseServing.weight_g || 100;
      const caloriesDensity = (baseServing.calories || 0) / origWeight;
      const proteinDensity = (baseServing.protein || 0) / origWeight;
      const carbsDensity = (baseServing.carbs || 0) / origWeight;
      const fatDensity = (baseServing.fat || 0) / origWeight;
      const fiberDensity = (baseServing.fiber || 0) / origWeight;
      const sugarDensity = (baseServing.sugar || 0) / origWeight;
      
      // Apply density-based scaling
      s.calories = Math.round(caloriesDensity * actualWeight * 10) / 10;
      s.protein = Math.round(proteinDensity * actualWeight * 10) / 10;
      s.carbs = Math.round(carbsDensity * actualWeight * 10) / 10;
      s.fat = Math.round(fatDensity * actualWeight * 10) / 10;
      
      // These fields might not be present in all data
      if (baseServing.fiber) s.fiber = Math.round(fiberDensity * actualWeight * 10) / 10;
      if (baseServing.sugar) s.sugar = Math.round(sugarDensity * actualWeight * 10) / 10;
      
      console.log(`Nutritionix density-based scaling: ${origWeight}g → ${actualWeight}g`);
      console.log(`Calories: ${caloriesDensity.toFixed(2)} cal/g × ${actualWeight}g = ${s.calories} cal`);
    } else {
      // For non-Nutritionix data, use the original scaling method
      scaleNutrition(s, factor);
    }
    return s;
  };

  // Special handling for piece-based foods (sweets, cookies, etc.)
  const foodName = (baseServing.name || '').toLowerCase();
  if (isPieceBasedFood(foodName, baseServing)) {
    console.log(`[PortionScaling] Using piece-based scaling for "${baseServing.name}"`);
    
    // Get base weight per piece
    const baseWeight = baseServing.weight_g || 100;
    
    servings.push(
      createServing('small', '1 piece', baseWeight, null, null, 1),
      createServing('medium', '2 pieces', baseWeight * 2, null, null, 2),
      createServing('large', '3 pieces', baseWeight * 3, null, null, 3)
    );
    return servings;
  }
  
  // 1. Breads (roti, chapati, etc.) - by diameter
  if (baseServing.diameter_cm) {
    const baseD = normalizeInput(baseServing.diameter_cm, 25, 50); // Cap at 50cm
    servings.push(
      createServing('small', '1 Small Roti (20cm)', null, null, 20, Math.pow(20/baseD, 2)),
      createServing('medium', '1 Medium Roti (25cm)', null, null, 25, Math.pow(25/baseD, 2)),
      createServing('large', '1 Large Roti (30cm)', null, null, 30, Math.pow(30/baseD, 2))
    );
    return servings;
  }

  // 2. Liquids (milk, dal, etc.) - by volume
  if (baseServing.volume_ml || (baseServing.name && isLiquidFood(baseServing.name))) {
    // For Nutritionix data, we need to properly scale from reference values
    // Most Nutritionix data comes with weight_g but we need to handle liquids by volume
    
    // Log debug info for scaling
    console.log(`[NutritionPipeline] Detected "${baseServing.name || 'Unknown'}" as a LIQUID food item.`);
    
    // Calculate scaling factor based on volume or weight
    let baseVol = baseServing.volume_ml;
    
    // If no volume but has weight (as is the case with Nutritionix data - e.g., milk as 244g cup)
    // We need to treat weight as volume for liquids (1g ≈ 1ml for most liquids)
    if (!baseVol && baseServing.weight_g) {
      baseVol = baseServing.weight_g;
      console.log(`[NutritionPipeline] Converting weight (${baseVol}g) to volume for liquid scaling.`);
    }
    
    // Normalize base volume
    baseVol = normalizeInput(baseVol, 200, 500); // Cap at 500ml
    
    // Create standard liquid servings
    servings.push(
      createServing('small', '1 Small Glass (100ml)', null, 100, null, 100/baseVol),
      createServing('medium', '1 Glass (200ml)', null, 200, null, 200/baseVol),
      createServing('large', '1 Large Glass (300ml)', null, 300, null, 300/baseVol)
    );
    return servings;
  }

  // 3. Solid foods (rice, sabzi, etc.) - by weight
  if (baseServing.weight_g) {
    const baseW = normalizeInput(baseServing.weight_g, 100, 500); // Cap at 500g
    servings.push(
      createServing('small', '1 Small Katori (100g)', 100, null, null, 100/baseW),
      createServing('medium', '1 Katori (200g)', 200, null, null, 200/baseW),
      createServing('large', '1 Large Katori (300g)', 300, null, null, 300/baseW)
    );
    return servings;
  }

  // 4. For items with no specific measurement (like fruits, eggs)
  servings.push(
    createServing('small', '1 Small Piece', 50, null, null, 1),
    createServing('medium', '1 Piece', 100, null, null, 1),
    createServing('large', '1 Large Piece', 150, null, null, 1.5)
  );

  return servings;
}

// Import the liquid food detection function from foodUtils.js
import { isLiquidFood } from './foodUtils.js';

function scaleNutrition(serving, factor) {
  const foodName = (serving.name || '').toLowerCase();
  
  // For liquids, use volume_ml for scaling; otherwise use weight_g
  const isLiquid = isLiquidFood(foodName);
  const scalingValue = isLiquid && serving.volume_ml ? 
    serving.volume_ml : 
    (serving.weight_g || 100); // Default to 100g if not specified
  
  // Define nutrition profiles per 100g for different food types
  const nutritionProfiles = {
    // Breads
    bread: {
      calories: 265, protein: 9, carbs: 49, fat: 3.2,
      fiber: 2.7, sugar: 5, sodium_mg: 490
    },
    // Fruits (like apple)
    apple: {
      calories: 52, protein: 0.3, carbs: 14, fat: 0.2,
      fiber: 2.4, sugar: 10, sodium_mg: 1
    },
    // Rice
    rice: {
      calories: 130, protein: 2.7, carbs: 28, fat: 0.3,
      fiber: 0.4, sugar: 0.1, sodium_mg: 1
    },
    // Dals/Lentils
    dal: {
      calories: 116, protein: 9, carbs: 20, fat: 0.4,
      fiber: 7.9, sugar: 1.8, sodium_mg: 2
    },
    // Curries
    curry: {
      calories: 150, protein: 10, carbs: 8, fat: 8,
      fiber: 2, sugar: 3, sodium_mg: 400
    },
    // Default (generic food)
    default: {
      calories: 150, protein: 5, carbs: 20, fat: 5,
      fiber: 2, sugar: 5, sodium_mg: 200
    }
  };
  
  // Determine food type
  let foodType = 'default';
  if (foodName.includes('bread') || foodName.includes('toast') || foodName.includes('roti')) {
    foodType = 'bread';
  } else if (foodName.includes('apple') || foodName.includes('fruit')) {
    foodType = 'apple';
  } else if (foodName.includes('rice')) {
    foodType = 'rice';
  } else if (foodName.includes('dal') || foodName.includes('lentil')) {
    foodType = 'dal';
  } else if (foodName.includes('curry')) {
    foodType = 'curry';
  }
  
  // Get the appropriate nutrition profile
  const profile = nutritionProfiles[foodType] || nutritionProfiles.default;
  
  // Calculate nutrition based on weight/volume scaling factor
  // For Nutritionix data, use the provided factor directly as it's more accurate
  // than using our food profiles
  if (factor) {
    // If we have Nutritionix values, scale them directly
    const scalableNutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 
                              'sodium_mg', 'protein_g', 'carbohydrates_total_g', 'fat_total_g', 'fiber_g', 'sugar_g'];
    
    scalableNutrients.forEach(nutrient => {
      if (serving[nutrient] !== undefined && serving[nutrient] !== null) {
        // Store original value for debug
        const originalValue = serving[nutrient];
        // Apply scaling factor
        serving[nutrient] = Math.round(serving[nutrient] * factor * 10) / 10;
        
        // Debug for major nutrients
        if (['calories', 'protein', 'carbs', 'fat'].includes(nutrient)) {
          console.log(`Scaling ${nutrient} from ${originalValue} to ${serving[nutrient]} (factor: ${factor.toFixed(2)})`);
        }
      }
    });
  } else {
    // Fallback to our predefined profiles if no factor provided
    const scale = isLiquid && serving.volume_ml ? 
      serving.volume_ml / 100 : 
      scalingValue / 100;
    
    Object.entries(profile).forEach(([key, value]) => {
      if (serving[key] !== undefined) {
        serving[key] = Math.round(value * scale * 10) / 10;
      }
    });
  }
  
  // Apply caps to nutrition values (safety check)
  const nutritionCaps = {
    calories: 2000,    // Max calories per serving
    protein: 100,      // Max protein per serving (g)
    carbs: 300,        // Max carbs per serving (g)
    fat: 100,          // Max fat per serving (g)
    fiber: 50,         // Max fiber per serving (g)
    sugar: 100,        // Max sugar per serving (g)
    sodium_mg: 5000    // Max sodium per serving (mg)
  };
  
  // Apply caps to ensure no value exceeds maximums
  Object.entries(nutritionCaps).forEach(([key, maxValue]) => {
    if (serving[key] !== null && serving[key] !== undefined) {
      const value = parseFloat(serving[key]);
      if (!isNaN(value) && isFinite(value) && value > maxValue) {
        console.warn(`Capped ${key} from ${value} to ${maxValue} for ${foodName}`);
        serving[key] = maxValue;
      }
    }
  });
}

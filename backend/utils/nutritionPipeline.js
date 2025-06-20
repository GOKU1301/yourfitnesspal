import { GeminiNutrition, saveNutritionToDb } from './geminiNutrition.js';
import { getNutritionInfo } from './nutritionixSearch.js';
import { generateScaledServings } from './portionScaling.js';
import { isLiquidFood, formatFoodPortion } from './foodUtils.js';

/**
 * Process a list of food items, fetch nutrition data and persist to MongoDB using Nutrition schema.
 * @param {string[]} foodItems Array of raw food item names
 * @returns {Promise<{saved:number, skipped:number, errors:Array}>}
 */
async function processAndStoreNutrition(foodItems = []) {
  console.log('=== NUTRITION PIPELINE STARTED ===');
  const gemini = new GeminiNutrition();
  let saved = 0;
  let skipped = 0;
  const errors = [];

  // Remove duplicates & trim
  const unique = [...new Set(foodItems.map(f => (f || '').trim()).filter(Boolean))];
  console.log(`[NutritionPipeline] Processing ${unique.length} unique items:`, unique);

  for (const item of unique) {
    try {
      // Check if already in MongoDB
      const existing = await saveNutritionToDb({ name: item, checkOnly: true });
      if (existing && existing._id) {
        console.log(`[NutritionPipeline] Skipped (already in DB): "${item}"`);
        skipped++;
        continue;
      }

      // Try to get nutrition from Nutritionix first
      const nutritionixResult = await getNutritionInfo(item);
      const MIN_SIMILARITY = 0.700; // Minimum similarity score to trust Nutritionix result

      // Use the correct similarity value for fallback logic
      const similarity = nutritionixResult && (typeof nutritionixResult.similarity === 'number' ? nutritionixResult.similarity : (nutritionixResult.bestMatch && typeof nutritionixResult.bestMatch.similarity === 'number' ? nutritionixResult.bestMatch.similarity : 0));

      // If no result from Nutritionix or similarity is too low, use Gemini
      if (!nutritionixResult || !nutritionixResult.nutrition || similarity < MIN_SIMILARITY) {
        
        const reason = !nutritionixResult ? 'no result' : 
                      (nutritionixResult.bestMatch ? 
                       `low similarity (${nutritionixResult.bestMatch.similarity.toFixed(2)})` : 'no nutrition data');
        
        console.log(`[NutritionPipeline] Falling back to Gemini for "${item}": ${reason}`);
        
        const geminiResult = await gemini.getNutritionInfo(item);
        if (geminiResult) {
          await saveNutritionToDb({
            name: item,
            category: geminiResult.category || 'unknown',
            servings: geminiResult.servings || []
          }, false);
          saved++;
        } else {
          console.error(`[NutritionPipeline] No nutrition data available for "${item}"`);
          errors.push(`No nutrition data available for "${item}"`);
        }
        continue;
      }

      let nutritionData = null;
      if (nutritionixResult && nutritionixResult.success && nutritionixResult.nutrition) {
        // Nutritionix gave us a base nutrition (per X grams or per piece)
        const base = nutritionixResult.nutrition;
        
        // Check if this is a piece-based food (like sweets) that should use piece-based scaling
        const isPieceBasedFood = base.serving_unit && ['piece', 'pieces', 'ball', 'balls', 'cookie', 'cookies'].includes(base.serving_unit.toLowerCase());
        
        if (isPieceBasedFood) {
          console.log(`[NutritionPipeline] Detected "${item}" as a PIECE-BASED food item with serving unit: ${base.serving_unit}`);
          // For piece-based foods, create servings based on piece counts
          nutritionData = {
            name: item,
            aliases: [],
            category: nutritionixResult.standardName || '',
            servings: [
              {
                size: 'small',
                portion_label: `1 piece`,
                weight_g: base.serving_size_g,
                volume_ml: null,
                calories: base.calories,
                protein: base.protein_g,
                carbs: base.carbohydrates_total_g,
                fat: base.fat_total_g,
                fiber: base.fiber_g,
                sugar: base.sugar_g,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              },
              {
                size: 'medium',
                portion_label: `2 pieces`,
                weight_g: base.serving_size_g * 2,
                volume_ml: null,
                calories: Math.round(base.calories * 2 * 10) / 10,
                protein: Math.round(base.protein_g * 2 * 10) / 10,
                carbs: Math.round(base.carbohydrates_total_g * 2 * 10) / 10,
                fat: Math.round(base.fat_total_g * 2 * 10) / 10,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * 2 * 10) / 10 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * 2 * 10) / 10 : undefined,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              },
              {
                size: 'large',
                portion_label: `3 pieces`,
                weight_g: base.serving_size_g * 3,
                volume_ml: null,
                calories: Math.round(base.calories * 3 * 10) / 10,
                protein: Math.round(base.protein_g * 3 * 10) / 10,
                carbs: Math.round(base.carbohydrates_total_g * 3 * 10) / 10,
                fat: Math.round(base.fat_total_g * 3 * 10) / 10,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * 3 * 10) / 10 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * 3 * 10) / 10 : undefined,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              }
            ]
          };
        } else {
          // Standard flow - Ask Gemini for portion sizes
          const prompt = `For the food item "${item}", provide typical small, medium, and large portion sizes using common Indian household measurements that a normal person would use without a kitchen scale.
          the value of each portion be default to 1 and unit be increased as per the portions for eg 1 bowl of rice with small portion weighs 100g,1 bowl for medium portion weighs 200g and large 300g  this is just a sample example,y
          IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
        {
          "small": { "value": number, "unit": "unit_type" },
          "medium": { "value": number, "unit": "unit_type" },
          "large": { "value": number, "unit": "unit_type" },
          "isLiquid": boolean  // true if this is a liquid item like milk, dal, etc.
        }
        
        Use these units based on food type:
        - For liquids (milk, dal, curry): "glass" (1 glass = 200ml) or "bowl" (1 bowl = 150ml)
        - For rice, dal (dry): "katori" (1 katori = 100g) or "plate" (1 plate = 200g)
        - For roti/paratha: "count" (number of pieces)
        - For dry snacks: "katori" or "handful"
        - For vegetables: "katori" or pieces
        - For curd/raita: "katori" or "tbsp"
        -For solid sweets : piece and size of piece
        -For liquid sweets : cup with cup size mentioned in ml
        
        
        Examples:
        For "dal" (liquid):
        {
          "small": { "value": 1, "unit": "katori (100ml)" },
          "medium": { "value": 1, "unit": "katori (200ml)" },
          "large": { "value": 1, "unit": "katori (300ml)" },
          "isLiquid": true
        }
        
        For "rice":
        {
          "small": { "value": 1, "unit": "katori (50g)" },
          "medium": { "value": 1, "unit": "katori (100g)" },
          "large": { "value": 1, "unit": "katori (200g)" },
          "isLiquid": false
        }
        
        For "milk":
        {
          "small": { "value": 0.5, "unit": "glass (100ml)" },
          "medium": { "value": 1, "unit": "glass (200ml)" },
          "large": { "value": 1.5, "unit": "glasses (300ml)" },
          "isLiquid": true
        }
        
        For "roti":
        {
          "small": { "value": 1, "unit": "piece" },
          "medium": { "value": 2, "unit": "pieces" },
          "large": { "value": 3, "unit": "pieces" },
          "isLiquid": false
        }`;
        let portionSizes;
        try {
          const geminiPortion = await gemini.model.generateContent(prompt);
          const responseText = geminiPortion.response.text().trim();
          
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                          [null, responseText];
          
          try {
            portionSizes = JSON.parse(jsonMatch[1] || responseText);
          } catch (parseError) {
            console.error(`[NutritionPipeline] Failed to parse Gemini response as JSON. Response was:`, responseText);
            throw new Error('Invalid JSON response from Gemini');
          }
        } catch (err) {
          console.error(`[NutritionPipeline] Gemini portion size error for "${item}":`, err.message);
          // Fallback to reasonable defaults
          portionSizes = {
            small: 100,
            medium: 200,
            large: 300
          };
          console.log(`[NutritionPipeline] Using default portion sizes for "${item}":`, portionSizes);
        }
        if (portionSizes) {
          // Convert Indian household measurements to grams for consistent scaling
          const convertToGrams = (value, unit, isLiquid = false) => {
            if (value === undefined || unit === undefined) {
              console.warn('Missing value or unit:', { value, unit });
              return isLiquid ? 200 : 100; // Default to 200ml for liquids, 100g for solids
            }

            const unitLower = unit.toString().toLowerCase().trim();
            
            // Common Indian measurements with their approximate weights in grams
            const approxGrams = {
              // Liquid measurements (ml)
              'glass': 200, 'glasses': 200, 'glass (200ml)': 200,
              'small glass': 100, 'small glasses': 100, 'small glass (100ml)': 100,
              'large glass': 300, 'large glasses': 300, 'large glass (300ml)': 300,
              'katori': isLiquid ? 100 : 100, 'katoris': isLiquid ? 100 : 100, 
              'katori (100ml)': 100, 'katori (100g)': 100,
              'small katori': 50, 'small katoris': 50, 'small katori (50g)': 50,
              'bowl': 150, 'bowls': 150, 'bowl (150ml)': 150,
              'small bowl': 75, 'small bowls': 75,
              'cup': 240, 'cups': 240, 'cup (240ml)': 240,
              'small cup': 120, 'small cups': 120,
              
              // Dry measurements (g)
              'plate': 200, 'plates': 200, 'plate (200g)': 200,
              'handful': 30, 'handfuls': 30,
              'tablespoon': 15, 'tbsp': 15, 'tablespoons': 15,
              'teaspoon': 5, 'tsp': 5, 'teaspoons': 5,
              
              // Common Indian food items
              'piece': 30, 'pieces': 30,
              'roti': 30, 'rotis': 30, 'roti (30g)': 30,
              'chapati': 30, 'chapatis': 30,
              'paratha': 80, 'parathas': 80,
              'idli': 50, 'idlis': 50,
              'dosa': 100, 'dosas': 100,
              'poori': 30, 'puris': 30,
              'vada': 60, 'vadas': 60,
              'samosa': 50, 'samosas': 50,
              'puri': 20, 'puris': 20,
              
              // Visual sizes
              'small piece': 50, 'medium piece': 100, 'large piece': 150,
              'palm-sized': 100, 'hand-sized': 150, 'fist-sized': 200,
              'deck of cards': 100,
              
              // Standard units
              'g': 1, 'gram': 1, 'grams': 1,
              'kg': 1000, 'kilogram': 1000, 'kilograms': 1000,
              'ml': 1, 'milliliter': 1, 'milliliters': 1,
              'l': 1000, 'liter': 1000, 'liters': 1000
            };

            // Extract numeric value if it's a string (e.g., '1.5 cups' -> 1.5)
            if (typeof value === 'string') {
              const numMatch = value.match(/[0-9.]+/);
              if (numMatch) value = parseFloat(numMatch[0]);
            }

            // Convert to number if it's a string
            value = parseFloat(value) || 0;

            // Find the best matching unit
            let gramsPerUnit = 0;
            
            // First try exact match
            if (unitLower in approxGrams) {
              gramsPerUnit = approxGrams[unitLower];
            } 
            // Then try to find a partial match (e.g., '1 glass' -> 'glass')
            else {
              const matchingUnit = Object.keys(approxGrams).find(u => 
                unitLower.includes(u) || u.includes(unitLower)
              );
              if (matchingUnit) {
                gramsPerUnit = approxGrams[matchingUnit];
              }
            }

            // If still no match, use defaults based on food type
            if (gramsPerUnit === 0) {
              if (isLiquid) {
                console.warn(`Unknown liquid unit "${unit}", defaulting to 1g/ml`);
                gramsPerUnit = 1; // Default for liquids (1ml = 1g)
              } else {
                console.warn(`Unknown unit "${unit}", defaulting to 30g per unit`);
                gramsPerUnit = 30; // Default for solids
              }
            }

            return Math.round(value * gramsPerUnit);
          };

          // Format the portion label with proper unit handling
          const formatPortionLabel = (size, value, unit) => {
            const sizeLabel = size.charAt(0).toUpperCase() + size.slice(1);
            // Don't add 's' if the unit already contains a number or is in ml/g
            if (value !== 1 && !/\d/.test(unit) && !['ml', 'g', 'tsp', 'tbsp'].some(u => unit.includes(u))) {
              unit = unit.endsWith('s') ? unit : unit + 's';
            }
            return `${sizeLabel} Portion (${value} ${unit})`.replace(/\s+/g, ' ').trim();
          };

          // Extract isLiquid flag or default to false
          const isLiquid = portionSizes.isLiquid || false;
          
          // Scale nutrition for each portion (filter out the isLiquid property)
          const servings = Object.entries(portionSizes)
            .filter(([key]) => ['small', 'medium', 'large'].includes(key))
            .map(([size, { value, unit }]) => {
              const grams = convertToGrams(value, unit, isLiquid);
              const portionLabel = formatPortionLabel(size, value, unit);
            
              return {
                size,
                portion_label: portionLabel,
                weight_g: Math.round(grams * 10) / 10, // Round to 1 decimal place
                volume_ml: isLiquid ? Math.round(grams * 10) / 10 : null,
                calories: Math.round(base.calories * grams / base.serving_size_g),
                protein: Math.round(base.protein_g * grams / base.serving_size_g * 100) / 100,
                carbs: Math.round(base.carbohydrates_total_g * grams / base.serving_size_g * 100) / 100,
                fat: Math.round(base.fat_total_g * grams / base.serving_size_g * 100) / 100,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * grams / base.serving_size_g * 100) / 100 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * grams / base.serving_size_g * 100) / 100 : undefined,
                _source: 'nutritionix', // Mark the source for scaling logic
                _originalServingSize: base.serving_size_g, // Store original serving size
                _originalCalories: base.calories // Store original calories
              };
            });
          nutritionData = {
            name: item,
            aliases: [],
            category: nutritionixResult.standardName || '',
            servings
          };
        }
      }

      // Use our improved portion scaling for Nutritionix results
      if (nutritionData && nutritionData.servings && nutritionData.servings.length > 0) {
        // Get the base serving from Nutritionix
        const baseServing = {
          ...nutritionData.servings[0],
          name: item,  // Add name for food type detection
          _source: nutritionData.servings[0]._source || 'nutritionix'  // Mark source for scaling logic
        };
        
        // Replace servings with our improved scaled servings
        console.log(`[NutritionPipeline] Applying improved portion scaling for "${item}"...`);
        nutritionData.servings = generateScaledServings(baseServing);
      }
      
      // If Nutritionix failed or portion sizes failed, fallback to Gemini for everything
      if (!nutritionData) {
        try {
          nutritionData = await gemini.getNutritionInfo(item);
        } catch (err) {
          console.error(`[NutritionPipeline] Gemini nutrition fallback failed for "${item}": ${err.message}`);
          skipped++;
          continue;
        }
      }

      // Check if this is a liquid food and format appropriately
      const isLiquid = isLiquidFood(item);
      if (isLiquid) {
        console.log(`[NutritionPipeline] Detected "${item}" as a LIQUID food item.`);
        
        // Apply liquid formatting to all servings
        if (nutritionData.servings && nutritionData.servings.length > 0) {
          nutritionData.servings = nutritionData.servings.map(serving => formatFoodPortion(serving, item));
        }
      }
      
      // Debug the nutrition data structure before saving
      console.log(`[NutritionPipeline] DEBUG - Data structure for "${item}":`);
      console.log(`- Name: ${nutritionData.name}`);
      console.log(`- Aliases: ${JSON.stringify(nutritionData.aliases || [])}`);
      console.log(`- Category: ${nutritionData.category || 'none'}`);
      console.log(`- Type: ${isLiquid ? 'LIQUID' : 'SOLID'}`);
      console.log(`- Servings count: ${nutritionData.servings ? nutritionData.servings.length : 0}`);
      if (nutritionData.servings && nutritionData.servings.length > 0) {
        const sample = nutritionData.servings[0];
        console.log(`- Sample serving: ${JSON.stringify(sample)}`);
      } else {
        console.log(`- WARNING: No servings found in data!`);
      }
      
      // Save to database
      const savedDoc = await saveNutritionToDb(nutritionData);
      console.log(`[NutritionPipeline] Saved nutrition for "${item}" with ID: ${savedDoc._id}`);
      saved++;
    }
    } catch (err) {
      console.error(`[NutritionPipeline] Error processing "${item}": ${err.message}`);
      errors.push({ item, error: err.message });
    }
  } // <-- closes the for-loop

  console.log(`\n=== NUTRITION PIPELINE COMPLETED ===`);
  console.log(`Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors.length}`);

  return { saved, skipped, errors };
}

export { processAndStoreNutrition };

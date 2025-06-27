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
  console.log('🍽️ [NUTRITION_PIPELINE] Start timestamp:', new Date().toISOString());
  const gemini = new GeminiNutrition();
  let saved = 0;
  let skipped = 0;
  const errors = [];

  // Remove duplicates & trim
  const unique = [...new Set(foodItems.map(f => (f || '').trim()).filter(Boolean))];
  console.log(`🍽️ [NUTRITION_PIPELINE] Processing ${unique.length} unique items:`, unique);
  console.log(`🍽️ [NUTRITION_PIPELINE] Raw input items count: ${foodItems.length}, Unique items count: ${unique.length}`);

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
      console.log(`🍽️ [NUTRITION_PIPELINE] Fetching nutrition for "${item}" from Nutritionix...`);
      const nutritionixResult = await getNutritionInfo(item);
      console.log(`🍽️ [NUTRITION_PIPELINE] Nutritionix result for "${item}": ${nutritionixResult ? 'Data received' : 'No data'}`);
      if (nutritionixResult) {
        console.log(`🍽️ [NUTRITION_PIPELINE] Nutritionix match found: ${nutritionixResult.standardName || 'N/A'}, similarity: ${nutritionixResult.similarity ? nutritionixResult.similarity.toFixed(3) : 'N/A'}`);
      }
      const MIN_SIMILARITY = 0.700; // Minimum similarity score to trust Nutritionix result

      // Use the correct similarity value for fallback logic
      const similarity = nutritionixResult && (typeof nutritionixResult.similarity === 'number' ? nutritionixResult.similarity : (nutritionixResult.bestMatch && typeof nutritionixResult.bestMatch.similarity === 'number' ? nutritionixResult.bestMatch.similarity : 0));

      // If no result from Nutritionix or similarity is too low, use Gemini
      if (!nutritionixResult || !nutritionixResult.nutrition || similarity < MIN_SIMILARITY) {
        
        const reason = !nutritionixResult ? 'no result' : 
                      (nutritionixResult.bestMatch ? 
                       `low similarity (${nutritionixResult.bestMatch.similarity.toFixed(2)})` : 'no nutrition data');
        
        console.log(`🍽️ [NUTRITION_PIPELINE] Falling back to Gemini for "${item}": ${reason}`);
        console.log(`🍽️ [NUTRITION_PIPELINE] Gemini request timestamp: ${new Date().toISOString()}`);
        
        const geminiResult = await gemini.getNutritionInfo(item);
        console.log(`🍽️ [NUTRITION_PIPELINE] Gemini result for "${item}": ${geminiResult ? 'Success' : 'Failed'}`);
        if (geminiResult) {
          console.log(`🍽️ [NUTRITION_PIPELINE] Gemini nutrition data for "${item}": Category: ${geminiResult.category || 'unknown'}, Servings: ${geminiResult.servings ? geminiResult.servings.length : 0}`);
          await saveNutritionToDb({
            name: item,
            category: geminiResult.category || 'unknown',
            servings: geminiResult.servings || []
          }, false);
          console.log(`🍽️ [NUTRITION_PIPELINE] Saved Gemini nutrition data for "${item}" to database`);
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
        // Expanded piece-based food detection
        const PIECE_BASED_FOODS = [
          'roti','roti','chapati','paratha','naan','poori','puri','bread','bread omelette','gulab jamun','jalebi','kachori','sandwich','coleslaw sandwich','bread omelette','poori','kachori','jalebi','barfi','peda','laddu','ladoo','rasgulla','soan papdi','vada','samosa','idli','ball','cookie','biscuit','cutlet','pakora','burger','pizza slice','bun','pav'
        ];
        const isPieceBasedFood = PIECE_BASED_FOODS.some(f => item.toLowerCase().includes(f)) || (base.serving_unit && typeof base.serving_unit === 'string' && ['piece', 'pieces', 'ball', 'balls', 'cookie', 'cookies'].includes(base.serving_unit.toLowerCase()));

        // Helper for realistic weights for piece-based foods
        const PIECE_BASED_WEIGHTS = {
          roti:    { small: 30, medium: 50, large: 70 },
          paratha: { small: 50, medium: 80, large: 120 },
          bread:   { small: 20, medium: 35, large: 50 },
          sandwich: { small: 50, medium: 80, large: 120 },
          'bread omelette': { small: 60, medium: 100, large: 150 },
          poori:   { small: 15, medium: 25, large: 35 },
          kachori: { small: 25, medium: 40, large: 60 },
          jalebi:  { small: 20, medium: 35, large: 50 },
          'gulab jamun': { small: 25, medium: 40, large: 60 },
          barfi:   { small: 20, medium: 35, large: 50 },
          peda:    { small: 20, medium: 35, large: 50 },
          laddu:   { small: 20, medium: 35, large: 50 },
          ladoo:   { small: 20, medium: 35, large: 50 },
          rasgulla: { small: 30, medium: 45, large: 60 },
          'soan papdi': { small: 20, medium: 35, large: 50 },
          vada:    { small: 30, medium: 50, large: 70 },
          samosa:  { small: 30, medium: 50, large: 70 },
          idli:    { small: 25, medium: 40, large: 55 },
          ball:    { small: 20, medium: 35, large: 50 },
          cookie:  { small: 10, medium: 20, large: 30 },
          biscuit: { small: 10, medium: 20, large: 30 },
          cutlet:  { small: 30, medium: 50, large: 70 },
          pakora:  { small: 15, medium: 25, large: 35 },
          burger:  { small: 70, medium: 120, large: 180 },
          'pizza slice': { small: 60, medium: 100, large: 150 },
          bun:     { small: 30, medium: 50, large: 70 },
          pav:     { small: 30, medium: 50, large: 70 }
        };
        // Try to get mapped weights, fallback to base serving_size_g
        function getPieceWeights(food) {
          const key = Object.keys(PIECE_BASED_WEIGHTS).find(k => food.toLowerCase().includes(k));
          if (key) return PIECE_BASED_WEIGHTS[key];
          return {
            small: base.serving_size_g || 30,
            medium: (base.serving_size_g || 30) * 2,
            large: (base.serving_size_g || 30) * 3
          };
        }

        
        if (isPieceBasedFood) {
          console.log(`[NutritionPipeline] Detected "${item}" as a PIECE-BASED food item with serving unit: ${base.serving_unit}`);
          // For piece-based foods, create servings based on piece counts
          const pieceWeights = getPieceWeights(item);
          nutritionData = {
            name: item,
            aliases: [],
            category: nutritionixResult.standardName || '',
            servings: [
              {
                size: 'small',
                portion_label: `1 piece`,
                weight_g: pieceWeights.small,
                volume_ml: null,
                calories: Math.round(base.calories * (pieceWeights.small / base.serving_size_g) * 10) / 10,
                protein: Math.round(base.protein_g * (pieceWeights.small / base.serving_size_g) * 10) / 10,
                carbs: Math.round(base.carbohydrates_total_g * (pieceWeights.small / base.serving_size_g) * 10) / 10,
                fat: Math.round(base.fat_total_g * (pieceWeights.small / base.serving_size_g) * 10) / 10,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * (pieceWeights.small / base.serving_size_g) * 10) / 10 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * (pieceWeights.small / base.serving_size_g) * 10) / 10 : undefined,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              },
              {
                size: 'medium',
                portion_label: `1 piece`,
                weight_g: pieceWeights.medium,
                volume_ml: null,
                calories: Math.round(base.calories * (pieceWeights.medium / base.serving_size_g) * 10) / 10,
                protein: Math.round(base.protein_g * (pieceWeights.medium / base.serving_size_g) * 10) / 10,
                carbs: Math.round(base.carbohydrates_total_g * (pieceWeights.medium / base.serving_size_g) * 10) / 10,
                fat: Math.round(base.fat_total_g * (pieceWeights.medium / base.serving_size_g) * 10) / 10,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * (pieceWeights.medium / base.serving_size_g) * 10) / 10 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * (pieceWeights.medium / base.serving_size_g) * 10) / 10 : undefined,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              },
              {
                size: 'large',
                portion_label: `1 piece`,
                weight_g: pieceWeights.large,
                volume_ml: null,
                calories: Math.round(base.calories * (pieceWeights.large / base.serving_size_g) * 10) / 10,
                protein: Math.round(base.protein_g * (pieceWeights.large / base.serving_size_g) * 10) / 10,
                carbs: Math.round(base.carbohydrates_total_g * (pieceWeights.large / base.serving_size_g) * 10) / 10,
                fat: Math.round(base.fat_total_g * (pieceWeights.large / base.serving_size_g) * 10) / 10,
                fiber: base.fiber_g !== undefined ? Math.round(base.fiber_g * (pieceWeights.large / base.serving_size_g) * 10) / 10 : undefined,
                sugar: base.sugar_g !== undefined ? Math.round(base.sugar_g * (pieceWeights.large / base.serving_size_g) * 10) / 10 : undefined,
                _source: 'nutritionix',
                _originalServingSize: base.serving_size_g,
                _originalCalories: base.calories,
                _pieceBasedFood: true
              }
            ]
          };

        } else {
          // Map Nutritionix data to plate section servings using final user estimates
          const PLATE_SECTIONS = [
            { size: 'side', portion_label: 'Side Section (~105ml / ~100g)', volume_ml: 105, weight_g: 100 },
            { size: 'center', portion_label: 'Center Section (~135ml / ~130g)', volume_ml: 135, weight_g: 130 },
            { size: 'narrow', portion_label: 'Narrow Section (~115ml / ~110g)', volume_ml: 115, weight_g: 110 },
            { size: 'main', portion_label: 'Main Section (~300ml / ~290g)', volume_ml: 300, weight_g: 290 }
          ];

          // Determine if food is liquid (use your isLiquidFood util if available)
          const isLiquid = isLiquidFood ? isLiquidFood(item) : false;

          // Nutritionix base is per 100g or per serving_size_g
          const baseWeight = base.serving_size_g || 100;
          const baseCalories = base.calories;
          const baseProtein = base.protein_g;
          const baseCarbs = base.carbohydrates_total_g;
          const baseFat = base.fat_total_g;
          const baseFiber = base.fiber_g;
          const baseSugar = base.sugar_g;

          // Helper to scale nutrients from baseWeight to targetWeight
          const scale = (value, targetWeight) => value && baseWeight ? Math.round((value * targetWeight / baseWeight) * 10) / 10 : null;

          nutritionData = {
            name: item,
            aliases: [],
            category: nutritionixResult.standardName || '',
            servings: PLATE_SECTIONS.map(section => ({
              size: section.size,
              portion_label: section.portion_label,
              weight_g: isLiquid ? null : section.weight_g,
              volume_ml: isLiquid ? section.volume_ml : null,
              calories: scale(baseCalories, isLiquid ? section.volume_ml : section.weight_g),
              protein: scale(baseProtein, isLiquid ? section.volume_ml : section.weight_g),
              carbs: scale(baseCarbs, isLiquid ? section.volume_ml : section.weight_g),
              fat: scale(baseFat, isLiquid ? section.volume_ml : section.weight_g),
              fiber: scale(baseFiber, isLiquid ? section.volume_ml : section.weight_g),
              sugar: scale(baseSugar, isLiquid ? section.volume_ml : section.weight_g),
              _source: 'nutritionix',
              _originalServingSize: baseWeight,
              _originalCalories: baseCalories
            }))
          };
        
        
        // Remove the code that references undefined prompt variable
        // This was causing the "prompt is not defined" error
        let portionSizes;
        try {
          // Create default portionSizes directly instead of calling Gemini here
          // (we already have NutritionIX data at this point)
          portionSizes = {
            small: { value: 1, unit: 'small portion' },
            medium: { value: 1, unit: 'medium portion' },
            large: { value: 1, unit: 'large portion' }
          };
        } catch (err) {
          console.error(`[NutritionPipeline] Gemini nutrition fallback error for "${item}": ${err.message}`);
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
        
        // ENFORCE PLATE SECTION FORMAT FOR ALL NON-PIECE FOODS
        const isBreadOrPiece = item && typeof item === 'string' && [
          'roti','paratha','poori','puri','bread','naan','kulcha','ladoo','laddu','ball','cookie','biscuit','idli','vada','vadai','pakora','cutlet','samosa'
        ].some(b => typeof item === 'string' && item.toLowerCase().includes(b));

        if (!isBreadOrPiece) {
          console.log(`[NutritionPipeline] Mapping "${item}" to plate sections...`);
          
          // Map to plate sections
          const PLATE_SECTIONS = [
            { size: 'side', portion_label: 'Side Section (~105ml / ~100g)', volume_ml: 105, weight_g: 100 },
            { size: 'center', portion_label: 'Center Section (~135ml / ~130g)', volume_ml: 135, weight_g: 130 },
            { size: 'narrow', portion_label: 'Narrow Section (~115ml / ~110g)', volume_ml: 115, weight_g: 110 },
            { size: 'main', portion_label: 'Main Section (~300ml / ~290g)', volume_ml: 300, weight_g: 290 }
          ];
          
          const baseWeight = baseServing.weight_g || 100;
          const baseCalories = baseServing.calories;
          const baseProtein = baseServing.protein || baseServing.protein_g;
          const baseCarbs = baseServing.carbs || baseServing.carbs_g;
          const baseFat = baseServing.fat || baseServing.fat_g;
          const baseFiber = baseServing.fiber || baseServing.fiber_g;
          const baseSugar = baseServing.sugar || baseServing.sugar_g;
          const isLiquid = typeof isLiquidFood === 'function' && item ? isLiquidFood(item) : false;
          const scale = (value, targetWeight) => value && baseWeight ? Math.round((value * targetWeight / baseWeight) * 10) / 10 : null;
          
          nutritionData.servings = PLATE_SECTIONS.map(section => ({
            size: section.size,
            portion_label: section.portion_label,
            weight_g: isLiquid ? null : section.weight_g,
            volume_ml: isLiquid ? section.volume_ml : null,
            calories: scale(baseCalories, isLiquid ? section.volume_ml : section.weight_g),
            protein: scale(baseProtein, isLiquid ? section.volume_ml : section.weight_g),
            carbs: scale(baseCarbs, isLiquid ? section.volume_ml : section.weight_g),
            fat: scale(baseFat, isLiquid ? section.volume_ml : section.weight_g),
            fiber: scale(baseFiber, isLiquid ? section.volume_ml : section.weight_g),
            sugar: scale(baseSugar, isLiquid ? section.volume_ml : section.weight_g),
            _source: 'nutritionix',
            _originalServingSize: baseWeight,
            _originalCalories: baseCalories,
            _mappedToPlateSection: true
          }));
        } else {
          // For piece-based foods, keep the existing servings
          console.log(`[NutritionPipeline] Keeping piece-based servings for "${item}"...`);
        }
      }
      
      // If Nutritionix failed or portion sizes failed, fallback to Gemini for everything
      if (!nutritionData) {
        try {
          console.log(`[NutritionPipeline] Falling back to Gemini for "${item}"...`);
          nutritionData = await gemini.getNutritionInfo(item);

          // --- ENFORCE PLATE SECTION SERVINGS FOR GEMINI ---
          // Only for non-piece-based foods
          const isBreadOrPiece = item && typeof item === 'string' && [
            'roti','paratha','poori','puri','bread','naan','kulcha','ladoo','laddu','ball','cookie','biscuit','idli','vada','vadai','pakora','cutlet','samosa'
          ].some(b => typeof item === 'string' && item.toLowerCase().includes(b));

          if (nutritionData && nutritionData.servings && !isBreadOrPiece) {
            // Map to plate sections
            const PLATE_SECTIONS = [
              { size: 'side', portion_label: 'Side Section (~105ml / ~100g)', volume_ml: 105, weight_g: 100 },
              { size: 'center', portion_label: 'Center Section (~135ml / ~130g)', volume_ml: 135, weight_g: 130 },
              { size: 'narrow', portion_label: 'Narrow Section (~115ml / ~110g)', volume_ml: 115, weight_g: 110 },
              { size: 'main', portion_label: 'Main Section (~300ml / ~290g)', volume_ml: 300, weight_g: 290 }
            ];
            // Use first serving as base for scaling
            const base = nutritionData.servings[0];
            const baseWeight = base.weight_g || 100;
            const baseCalories = base.calories;
            const baseProtein = base.protein || base.protein_g;
            const baseCarbs = base.carbs || base.carbs_g;
            const baseFat = base.fat || base.fat_g;
            const baseFiber = base.fiber || base.fiber_g;
            const baseSugar = base.sugar || base.sugar_g;
            const isLiquid = isLiquidFood ? isLiquidFood(item) : false;
            const scale = (value, targetWeight) => value && baseWeight ? Math.round((value * targetWeight / baseWeight) * 10) / 10 : null;
            nutritionData.servings = PLATE_SECTIONS.map(section => ({
              size: section.size,
              portion_label: section.portion_label,
              weight_g: isLiquid ? null : section.weight_g,
              volume_ml: isLiquid ? section.volume_ml : null,
              calories: scale(baseCalories, isLiquid ? section.volume_ml : section.weight_g),
              protein: scale(baseProtein, isLiquid ? section.volume_ml : section.weight_g),
              carbs: scale(baseCarbs, isLiquid ? section.volume_ml : section.weight_g),
              fat: scale(baseFat, isLiquid ? section.volume_ml : section.weight_g),
              fiber: scale(baseFiber, isLiquid ? section.volume_ml : section.weight_g),
              sugar: scale(baseSugar, isLiquid ? section.volume_ml : section.weight_g),
              _source: 'gemini',
              _originalServingSize: baseWeight,
              _originalCalories: baseCalories
            }));
          }
          // --- END ENFORCE ---
        } catch (err) {
          console.error(`[NutritionPipeline] Gemini nutrition fallback failed for "${item}": ${err.message}`);
          skipped++;
          continue;
        }
      }

      // Check if this is a liquid food and format appropriately
      const isLiquid = typeof isLiquidFood === 'function' && item ? isLiquidFood(item) : false;
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

  console.log(`🍽️ [NUTRITION_PIPELINE] Processing complete at: ${new Date().toISOString()}`);
  console.log(`🍽️ [NUTRITION_PIPELINE] Summary: Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors.length}`);
  return { saved, skipped, errors };
}

export { processAndStoreNutrition };

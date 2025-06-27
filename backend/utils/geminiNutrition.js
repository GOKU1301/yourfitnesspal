import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiNutrition {
  constructor() {
    // Initialize with your Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
      },
    });
  }

  /**
   * Get nutrition information for a food item using Gemini
   * @param {string} foodItem - The food item to get nutrition for
   * @returns {Promise<Object>} - Nutrition information object
   */
  async getNutritionInfo(text) {
    try {
      console.log('Getting nutrition info from Gemini for: "' + text + '"');
      
      // Prepare the prompt with strict formatting instructions
      const prompt = `Provide accurate nutrition information for: "${text}"

    Return ONLY a JSON object matching this structure (do not include any markdown):
    {
      "name": "standard food name (English)",
      "servings": [
        {
          "size": "side", // For non-piece foods, use ONLY "side", "center", "narrow", or "main". For piece-based foods only, use "small", "medium", or "large".
          "portion_label": "Portion description",
          "diameter_cm": number | null,
          "calories": number | null,
          "protein": number | null,
          "carbs": number | null,
          "fat": number | null,
          "fiber_g": number | null,
          "sugar_g": number | null,
          "volume_ml": number | null,
          "weight_g": number | null
        },
        // Include all appropriate servings
      ],
      "category": "Food Category"
    }

    CRITICAL PORTION SIZE RULES - FOLLOW EXACTLY:

    1. First, determine if this is a piece-based food or a regular food:
       - Piece-based foods: roti, chapati, paratha, naan, poori, bread, bread omelette, gulab jamun, jalebi, kachori, sandwich (any form), coleslaw sandwich, bread omelette, poori, kachori, jalebi, all solid sweets (e.g. barfi, peda, laddu, ladoo, rasgulla, soan papdi, etc.), vada, samosa, idli, ball, cookie, biscuit, cutlet, pakora, sandwich, burger, pizza slice, bun, pav
       - Beverages: milk, tea, coffee, juice, buttermilk, water
       - Everything else: regular food (dal, sabzi, curry, rice, etc.)

    2. For piece-based foods ONLY:
       - Use piece-based sizes: "small", "medium", "large"
       - For each, provide: size ("small", "medium", "large"), portion_label (e.g. "1 piece"), and weight_g (in grams)
       - Example for roti: small = 1 piece (~30g), medium = 1 piece (~50g), large = 1 piece (~70g)
       - For sweets, sandwiches, and other piece-based items, use realistic weights (e.g. gulab jamun: small = 1 piece (~25g), medium = 1 piece (~40g), large = 1 piece (~60g)).
       - Always specify the weight in grams for each size. If unsure, provide your best estimate based on similar foods.
       - Set volume_ml to null for piece-based foods.

    3. For beverages ONLY:
       - Small Glass (100ml), Glass (200ml), Large Glass (300ml)
       - Set weight_g to null for beverages

    4. For ALL OTHER FOODS, you MUST use ONLY these four plate sections:

       a. Side Section (~105ml / ~100g)
          - size: "side"
          - portion_label: "Side Section (~105ml / ~100g)"

       b. Center Section (~135ml / ~130g)
          - size: "center"
          - portion_label: "Center Section (~135ml / ~130g)"

       c. Narrow Section (~115ml / ~110g)
          - size: "narrow"
          - portion_label: "Narrow Section (~115ml / ~110g)"

       d. Main Section (~300ml / ~290g)
          - size: "main"
          - portion_label: "Main Section (~300ml / ~290g)"

    GENERAL RULES:
    1. For breads and piece-based items: provide small, medium, and large servings, each with a weight in grams.
    2. For all other foods: provide ONLY the four plate section servings (side, center, narrow, main)
    3. Use the exact plate section names and measurements specified above
    4. Return realistic values for the nutrition
    5. List macros in grams (g) as positive numbers
    6. Include non-zero values for fiber and sugar when appropriate
    7. Make sure calorie counts make sense based on macros
    8. Always specify weight in grams (weight_g) and volume in ml (volume_ml) when available
    9. For items normally measured by piece/count, set volume_ml to null
    10. For liquid foods, set weight_g to null and use volume_ml
    11. For solid foods, set volume_ml to null and use weight_g
    12. Do not include comments in the JSON output

    Category options: bread, rice, dal, curry, chutney, salad, beverage, snack, sweet, fruit

    If you don't know, just provide your best estimate based on similar foods.`;
      
      console.log('Sending request to Gemini API...');
      const result = await this.model.generateContent({ 
        contents: [{ 
          role: 'user', 
          parts: [{ 
            text: prompt,
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
        }
      });
      
      const response = await result.response;
      let textResponse = response.text();
      
      // Log first 300 chars for debugging
      console.log('Raw Gemini response (first 300 chars):', textResponse.substring(0, 300));
      
      try {
        // Clean the response - remove markdown code blocks and any text before/after JSON
        let jsonStr = textResponse
          .replace(/^[\s\S]*?(\{|\[)/, '$1')  // Remove everything before first { or [
          .replace(/[^}\]]*$/, '')             // Remove everything after last } or ]
          .replace(/^```(?:json)?\s*/i, '')     // Remove starting ```json or ```
          .replace(/```.*$/, '')               // Remove ending ``` and anything after
          .trim();
          
        // Try to fix common JSON issues
        jsonStr = jsonStr
          .replace(/,\s*([}\]])/g, '$1')     // Remove trailing commas
          .replace(/([\{\[]\s*),/g, '$1')     // Fix empty objects/arrays with trailing comma
          .replace(/:\s*"null"/g, ': null')   // Replace "null" with actual null
          .replace(/:\s*'null'/g, ': null')    // Replace 'null' with actual null
          .replace(/([^\"\']|\s|^)(true|false)([^\"\']|\s|$)/g, '$1"$2"$3')  // Only quote true/false
          .replace(/([\{\[,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')  // Add quotes around unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
          .replace(/:\s*([0-9]+\.?[0-9]*)\s*([,}\s])/g, ': $1$2')  // Ensure numbers are not quoted
          .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();  // Minify to single line
          
        console.log('Cleaned JSON string:', jsonStr);
        
        // Parse the cleaned JSON
        const nutritionData = JSON.parse(jsonStr);
        
        // Validate required fields
        if (!nutritionData.name) {
          throw new Error('Response missing required field: name');
        }
        
        if (!nutritionData.servings || !Array.isArray(nutritionData.servings) || nutritionData.servings.length === 0) {
          throw new Error('Response missing or invalid servings array');
        }
        
        // Ensure we have required serving sizes (either standard or plate sections)
        const standardSizes = ['small', 'medium', 'large'];
        const plateSectionSizes = ['side', 'center', 'narrow', 'main'];
        const sizes = nutritionData.servings.map(s => s.size);

        // Check if we have either all standard sizes OR all plate section sizes
        let hasAllStandardSizes = standardSizes.every(size => sizes.includes(size));
        let hasAllPlateSectionSizes = plateSectionSizes.every(size => sizes.includes(size));

        // --- AUTOFIX INCOMPLETE SERVINGS ---
        if (!hasAllStandardSizes && !hasAllPlateSectionSizes) {
          // Try to infer type: piece-based, beverage, or plate-section food
          const lowerName = nutritionData.name.toLowerCase();
          const pieceBasedFoods = [
            'roti','chapati','paratha','naan','poori','puri','bread','bread omelette','gulab jamun','jalebi','kachori','sandwich','coleslaw sandwich','barfi','peda','laddu','ladoo','rasgulla','soan papdi','vada','samosa','idli','ball','cookie','biscuit','cutlet','pakora','burger','pizza slice','bun','pav'
          ];
          const beverages = ['milk','tea','coffee','juice','buttermilk','water','lassi','cold coffee'];
          const isPiece = pieceBasedFoods.some(f => lowerName.includes(f));
          const isBeverage = beverages.some(f => lowerName.includes(f));

          // Helper for piece weights (same as in pipeline)
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
          function getPieceWeights(food, fallback) {
            const key = Object.keys(PIECE_BASED_WEIGHTS).find(k => food.includes(k));
            if (key) return PIECE_BASED_WEIGHTS[key];
            return {
              small: fallback || 30,
              medium: (fallback || 30) * 2,
              large: (fallback || 30) * 3
            };
          }

          // Only one serving present, use it as base
          const baseServing = nutritionData.servings[0];
          // For piece-based foods
          if (isPiece) {
            const weights = getPieceWeights(lowerName, baseServing.weight_g);
            const baseWeight = baseServing.weight_g || 30;
            nutritionData.servings = [
              {
                size: 'small',
                portion_label: '1 piece',
                weight_g: weights.small,
                volume_ml: null,
                calories: Math.round((baseServing.calories || 0) * (weights.small / baseWeight) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (weights.small / baseWeight) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (weights.small / baseWeight) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (weights.small / baseWeight) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (weights.small / baseWeight) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (weights.small / baseWeight) * 10) / 10 : null
              },
              {
                size: 'medium',
                portion_label: '1 piece',
                weight_g: weights.medium,
                volume_ml: null,
                calories: Math.round((baseServing.calories || 0) * (weights.medium / baseWeight) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (weights.medium / baseWeight) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (weights.medium / baseWeight) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (weights.medium / baseWeight) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (weights.medium / baseWeight) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (weights.medium / baseWeight) * 10) / 10 : null
              },
              {
                size: 'large',
                portion_label: '1 piece',
                weight_g: weights.large,
                volume_ml: null,
                calories: Math.round((baseServing.calories || 0) * (weights.large / baseWeight) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (weights.large / baseWeight) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (weights.large / baseWeight) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (weights.large / baseWeight) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (weights.large / baseWeight) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (weights.large / baseWeight) * 10) / 10 : null
              }
            ];
            hasAllStandardSizes = true;
          } else if (isBeverage) {
            // For beverages: small glass (100ml), glass (200ml), large glass (300ml)
            const baseVol = baseServing.volume_ml || 200;
            nutritionData.servings = [
              {
                size: 'small',
                portion_label: 'Small Glass (~100ml)',
                volume_ml: 100,
                weight_g: null,
                calories: Math.round((baseServing.calories || 0) * (100 / baseVol) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (100 / baseVol) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (100 / baseVol) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (100 / baseVol) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (100 / baseVol) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (100 / baseVol) * 10) / 10 : null
              },
              {
                size: 'medium',
                portion_label: 'Glass (~200ml)',
                volume_ml: 200,
                weight_g: null,
                calories: Math.round((baseServing.calories || 0) * (200 / baseVol) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (200 / baseVol) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (200 / baseVol) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (200 / baseVol) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (200 / baseVol) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (200 / baseVol) * 10) / 10 : null
              },
              {
                size: 'large',
                portion_label: 'Large Glass (~300ml)',
                volume_ml: 300,
                weight_g: null,
                calories: Math.round((baseServing.calories || 0) * (300 / baseVol) * 10) / 10,
                protein: Math.round((baseServing.protein || 0) * (300 / baseVol) * 10) / 10,
                carbs: Math.round((baseServing.carbs || 0) * (300 / baseVol) * 10) / 10,
                fat: Math.round((baseServing.fat || 0) * (300 / baseVol) * 10) / 10,
                fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (300 / baseVol) * 10) / 10 : null,
                sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (300 / baseVol) * 10) / 10 : null
              }
            ];
            hasAllStandardSizes = true;
          } else {
            // Fallback to plate sections (side, center, narrow, main)
            const sectionDefs = [
              { size: 'side', portion_label: 'Side Section (~105ml / ~100g)', volume_ml: 105, weight_g: 100 },
              { size: 'center', portion_label: 'Center Section (~135ml / ~130g)', volume_ml: 135, weight_g: 130 },
              { size: 'narrow', portion_label: 'Narrow Section (~115ml / ~110g)', volume_ml: 115, weight_g: 110 },
              { size: 'main', portion_label: 'Main Section (~300ml / ~290g)', volume_ml: 300, weight_g: 290 }
            ];
            const baseWeight = baseServing.weight_g || 290;
            nutritionData.servings = sectionDefs.map(sec => ({
              size: sec.size,
              portion_label: sec.portion_label,
              volume_ml: sec.volume_ml,
              weight_g: sec.weight_g,
              calories: Math.round((baseServing.calories || 0) * (sec.weight_g / baseWeight) * 10) / 10,
              protein: Math.round((baseServing.protein || 0) * (sec.weight_g / baseWeight) * 10) / 10,
              carbs: Math.round((baseServing.carbs || 0) * (sec.weight_g / baseWeight) * 10) / 10,
              fat: Math.round((baseServing.fat || 0) * (sec.weight_g / baseWeight) * 10) / 10,
              fiber_g: baseServing.fiber_g !== undefined ? Math.round((baseServing.fiber_g || 0) * (sec.weight_g / baseWeight) * 10) / 10 : null,
              sugar_g: baseServing.sugar_g !== undefined ? Math.round((baseServing.sugar_g || 0) * (sec.weight_g / baseWeight) * 10) / 10 : null
            }));
            hasAllPlateSectionSizes = true;
          }
        }

        
        // Add metadata
        nutritionData.source = 'gemini';
        nutritionData.originalName = text;
        
        // Properly log the parsed object
        console.log( `hahahahahaha type of `);  // should be 'string

        console.log(typeof jsonStr);  // should be 'string'

        console.log('Parsed nutrition data:', JSON.stringify(nutritionData, null, 2));
        console.log(`✅ Successfully parsed nutrition data for "${text}"`);
        
        return nutritionData;
        
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
        console.error('Raw response (first 200 chars):', textResponse.substring(0, 200));
        throw new Error(`Failed to parse nutrition data: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Error getting nutrition info from Gemini for "' + text + '":', error);
      throw error;
    }
  }
}

/**
 * Get nutrition information for a food item as a fallback when API fails
 * @param {string} foodItem - Food item to get nutrition for
 * @param {number} similarityThreshold - Minimum similarity threshold that wasn't met
 * @returns {Promise<Object>} - Nutrition information object
 */
async function getFallbackNutrition(foodItem, similarityThreshold = 0.85) {
  try {
    const geminiNutrition = new GeminiNutrition();
    const nutritionData = await geminiNutrition.getNutritionInfo(foodItem);
    
    // Only use Gemini data if confidence is high enough
    if (nutritionData.confidence >= 0.85) {
      console.log('Using Gemini nutrition data for "' + foodItem + '" (confidence: ' + nutritionData.confidence.toFixed(2) + ')');
      
      // Map the Nutritionix-style fields to our standard format
      return {
        found: true,
        originalName: foodItem,
        standardName: nutritionData.food_name || foodItem,
        source: 'gemini',
        confidence: nutritionData.confidence,
        nutrition: {
          serving_size_g: nutritionData.serving_weight_grams || 100,
          calories: nutritionData.nf_calories || 0,
          protein_g: nutritionData.nf_protein || 0,
          carbohydrates_total_g: nutritionData.nf_total_carbohydrate || 0,
          fat_total_g: nutritionData.nf_total_fat || 0,
          fiber_g: nutritionData.nf_dietary_fiber || 0,
          sugar_g: nutritionData.nf_sugars || 0
        }
      };
    } else {
      const confidenceLevel = nutritionData.confidence ? nutritionData.confidence.toFixed(2) : 'unknown';
      console.log('Gemini confidence too low (' + confidenceLevel + ') for "' + foodItem + '"');
      return { 
        found: false, 
        originalName: foodItem,
        error: 'Low confidence in Gemini nutrition data',
        similarity: 0
      };
    }
  } catch (error) {
    console.error('Error getting fallback nutrition for "' + foodItem + '":', error);
    return { 
      found: false, 
      originalName: foodItem,
      error: error.message,
      similarity: 0
    };
  }
}

import Nutrition from '../models/Nutrition.js';

/**
 * Save or update nutrition info for a food item in the nutrition collection.
 * @param {Object} nutritionData - Data matching the Nutrition.js schema
 * @returns {Promise<Object>} - The saved/updated document
 */
async function saveNutritionToDb(nutritionData) {
  if (!nutritionData || !nutritionData.name) {
    throw new Error('Invalid nutrition data: missing name');
  }
  
  // If checkOnly is true, just check if it exists and return it (or null)
  if (nutritionData.checkOnly === true) {
    console.log(`[DB Check] Checking if "${nutritionData.name}" exists in database...`);
    const existingDoc = await Nutrition.findOne({ name: nutritionData.name });
    return existingDoc || null;
  }

  console.log('========== NUTRITION SAVE DEBUG ==========');
  console.log(`Saving nutrition for: "${nutritionData.name}"`);
  
  // Check if we have servings
  if (!nutritionData.servings || !Array.isArray(nutritionData.servings) || nutritionData.servings.length === 0) {
    console.log(`WARNING: No servings found for "${nutritionData.name}"!`);
  } else {
    console.log(`Found ${nutritionData.servings.length} servings to process`);
    console.log(`Raw first serving:`, JSON.stringify(nutritionData.servings[0], null, 2));
  }
  
  // Map the nutrition data to match our schema
  const nutritionDoc = {
    name: nutritionData.name,
    aliases: nutritionData.aliases || [],
    category: nutritionData.category || 'other',
    servings: (nutritionData.servings || []).map(serving => {
      // Create a serving object that matches our schema
      // Create a serving object that EXACTLY matches our schema (models/Nutrition.js)
      const mappedServing = {
        size: serving.size || 'medium',
        portion_label: serving.portion_label || `1 ${serving.size || 'Medium'} Serving`,
        weight_g: serving.weight_g || 0,
        volume_ml: serving.volume_ml || null,
        diameter_cm: serving.diameter_cm || null,
        calories: serving.calories || 0,
        protein: serving.protein_g || serving.protein || 0,
        carbs: serving.carbs_g || serving.carbs || 0,
        fat: serving.fat_g || serving.fat || 0
      };
      
      console.log(`Mapped ${serving.size} serving:`, JSON.stringify(mappedServing, null, 2));
      return mappedServing;
    })
  };
  
  console.log(`Final document structure to save: Name=${nutritionDoc.name}, ServingsCount=${nutritionDoc.servings.length}`);
  console.log('========== END DEBUG ==========');

  // Try to find by name
  let doc = await Nutrition.findOne({ name: nutritionDoc.name });
  
  if (doc) {
    // Update existing
    doc.aliases = [...new Set([...(doc.aliases || []), ...(nutritionDoc.aliases || [])])];
    doc.category = nutritionDoc.category || doc.category;
    
    // Merge servings, keeping unique ones based on size
    const existingSizes = new Set(doc.servings.map(s => s.size));
    const newServings = nutritionDoc.servings.filter(s => !existingSizes.has(s.size));
    doc.servings = [...doc.servings, ...newServings];
    
    await doc.save();
  } else {
    // Create new
    doc = await Nutrition.create(nutritionDoc);
  }
  
  console.log(`Saved to DB - Name: ${doc.name}, Servings: ${doc.servings.length}`);
  return doc;
}

export { GeminiNutrition, getFallbackNutrition, saveNutritionToDb };


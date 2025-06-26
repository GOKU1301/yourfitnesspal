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
            "size": "side", // IMPORTANT: For non-piece foods, use ONLY "side", "center", "narrow", or "main"
                            // For piece-based foods only, use "small", "medium", or "large"
            "portion_label": "Portion description",
            "diameter_cm": number | null,
            "calories": number | null,
            "protein": number | null,
            "carbs": number | null,
            "fat": number | null,
            "fiber_g": number | null,
            "sugar_g": number | null,
            "volume_ml": number | null,
            "weight_g": number | null,
            // all these are sample values,but you must insert actual real nutrition values in place of these
          },
          // Include all appropriate servings
        ],
        "category": "Food Category"
      }
      
      CRITICAL PORTION SIZE RULES - FOLLOW EXACTLY:
      
      1. First, determine if this is a piece-based food or a regular food:
         - Piece-based foods: roti, chapati, paratha, naan, poori, bread, idli, vada, samosa, ladoo
         - Beverages: milk, tea, coffee, juice, buttermilk, water
         - Everything else: regular food (dal, sabzi, curry, rice, etc.)

      2. For piece-based foods ONLY:
         - Use piece-based sizes: "small", "medium", "large"
         - Small: 1 Small Piece (30g)
         - Medium: 1 Normal Piece (60g)
         - Large: 1 Large Piece (90g)
         - Set volume_ml to null for piece-based foods
         
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
      1. For breads and piece-based items: provide small, medium, and large servings
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
        const hasAllStandardSizes = standardSizes.every(size => sizes.includes(size));
        const hasAllPlateSectionSizes = plateSectionSizes.every(size => sizes.includes(size));
        
        if (!hasAllStandardSizes && !hasAllPlateSectionSizes) {
          throw new Error(`Missing required serving sizes. Need either standard sizes (${standardSizes.join(', ')}) or plate section sizes (${plateSectionSizes.join(', ')})`);
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


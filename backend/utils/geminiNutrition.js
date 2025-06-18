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
  "aliases": ["alias1", "alias2"],
  "category": "bread | sabzi | dal | beverage | sweet | snack | dairy | etc.",
  "servings": [
    {
      "size": "e.g. small, medium, cup, katori, piece, etc.",
      "portion_label": "e.g. Full Cup, Half Roti, 1 Piece, etc.",
      "diameter_cm": number | null, // Only for breads like roti/chapati/paratha. Null for all others.
      "weight_g": number | null, // For solids, sweets, snacks, etc. Null if not applicable.
      "volume_ml": number | null, // Only for beverages (tea, milk, etc.). Null for all others.
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ]
}

IMPORTANT:
1. Automatically detect the correct food category (bread, sabzi, dal, beverage, sweet, snack, dairy, etc.) based on the food item name and common Indian meal context.
2. For breads (roti, chapati, paratha, etc.): Only fill diameter_cm (realistic value, e.g., 14 for roti), set volume_ml and weight_g to null.
3. For dal, sabzi, gravies: Portion should be measured in cups or katori. Set diameter_cm and volume_ml to null, use size/portion_label and weight_g if known.
4. For beverages (tea, milk, lassi, etc.): Only fill volume_ml (e.g., 200 for a cup), set diameter_cm and weight_g to null.
5. For sweets/snacks: Use best-fit logic (by piece or by weight). Only fill relevant fields, set others to null.
6. For dairy (curd, paneer): Use portion size and weight_g if known, others null.
7. Set all unused or irrelevant fields to null (not 0).
8. Use realistic values based on standard nutritional databases.
9. Return ONLY valid JSON, no explanation or markdown.
10. If unsure, set value to null.
11. All numeric values should be numbers, not strings.
12. The output must exactly match the above schema.`;

      // Generate content with the prompt
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
  
      // Get the response text
      const response = await result.response;
      let textResponse = response.text();
      
      console.log('Raw Gemini response:', textResponse);
      
      try {
        // Just parse the response directly
        const nutritionData = JSON.parse(textResponse);
        console.log('Successfully parsed nutrition data for "' + text + '"');
        
        // Add source information
        nutritionData.source = 'gemini';
        nutritionData.originalName = text;
        
        return nutritionData;
      } catch (error) {
        console.error('Error parsing response:', error);
        console.log('Raw response:', textResponse);
        throw new Error('Failed to parse nutrition data');
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
async function getFallbackNutrition(foodItem, similarityThreshold = 0.7) {
  try {
    const geminiNutrition = new GeminiNutrition();
    const nutritionData = await geminiNutrition.getNutritionInfo(foodItem);
    
    // Only use Gemini data if confidence is high enough
    if (nutritionData.confidence >= 0.7) {
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
      console.log('Gemini confidence too low (' + nutritionData.confidence.toFixed(2) + ') for "' + foodItem + '"');
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
export async function saveNutritionToDb(nutritionData) {
  if (!nutritionData || !nutritionData.name) {
    throw new Error('Invalid nutrition data: missing name');
  }
  // Try to find by name
  let doc = await Nutrition.findOne({ name: nutritionData.name });
  if (doc) {
    // Update existing
    doc.aliases = nutritionData.aliases || doc.aliases;
    doc.category = nutritionData.category || doc.category;
    doc.servings = nutritionData.servings || doc.servings;
    await doc.save();
  } else {
    // Create new
    doc = await Nutrition.create(nutritionData);
  }
  return doc;
}

export { GeminiNutrition, getFallbackNutrition };


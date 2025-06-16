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
      const prompt = 'Provide accurate nutrition information for: "' + text + '"\n\n' +
        'Please return ONLY a JSON object with the following structure:\n' +
        '{\n' +
        '  "food_name": "standard food name (most common name in English)",\n' +
        '  "serving_weight_grams": serving size in grams (number only),\n' +
        '  "nf_calories": calories per serving (number only),\n' +
        '  "nf_protein": protein in grams (number only),\n' +
        '  "nf_total_carbohydrate": total carbohydrates in grams (number only),\n' +
        '  "nf_total_fat": total fat in grams (number only),\n' +
        '  "nf_dietary_fiber": dietary fiber in grams (number only),\n' +
        '  "nf_sugars": sugar in grams (number only),\n' +
        '  "confidence": a value between 0 and 1 indicating your confidence in this data\n' +
        '}\n\n' +
        'IMPORTANT: \n' +
        '1. Return ONLY valid JSON with no additional text or explanation\n' +
        '2. Use realistic values based on standard nutritional databases\n' +
        '3. If you\'re uncertain about the food item, set a lower confidence value\n' +
        '4. For regional or ethnic foods, provide your best estimate based on ingredients\n' +
        '5. DO NOT include any markdown formatting like ```json or ```\n' +
        '6. Use null for any unknown values\n' +
        '7. All numeric values should be numbers (not strings)';

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

export { GeminiNutrition, getFallbackNutrition };

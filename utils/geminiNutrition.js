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
  // In geminiNutrition.js, update the getNutritionInfo method to handle markdown code blocks
async getNutritionInfo(text) {
    try {
      console.log(`🔍 Getting nutrition info from Gemini for: "${text}"`);
      
      // Prepare the prompt with strict formatting instructions
      const prompt = `Provide accurate nutrition information for: "${text}"
  
  Please return ONLY a JSON object with the following structure:
  {
    "name": "the food item name",
    "serving_size": "standard serving size in grams",
    "calories": number of calories per serving,
    "protein": protein in grams per serving,
    "carbs": carbohydrates in grams per serving,
    "fat": total fat in grams per serving,
    "fiber": dietary fiber in grams per serving,
    "sugar": sugar in grams per serving,
    "confidence": a value between 0 and 1 indicating your confidence in this data
  }
  
  IMPORTANT: 
  1. Return ONLY valid JSON with no additional text or explanation
  2. Use realistic values based on nutritional databases
  3. If you're uncertain about the food item, set a lower confidence value
  4. For regional or ethnic foods, provide your best estimate based on ingredients
  5. DO NOT include any markdown formatting like \`\`\`json or \`\`\``;
  
      // Generate content with the prompt
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
  
      // Get the response text
      const response = await result.response;
      let textResponse = response.text();
      
      console.log('Raw Gemini response:', textResponse);
      
      // Clean the response by removing markdown code blocks if present
      let cleanJson = textResponse
        // Remove markdown code blocks
        .replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1')
        // Also handle cases where there might be extra backticks
        .replace(/`/g, '')
        // Remove any remaining whitespace
        .trim();
      
      console.log('Cleaned JSON:', cleanJson);
      
      // Parse the JSON response
      try {
        const nutritionData = JSON.parse(cleanJson);
        console.log(`✅ Successfully parsed nutrition data for "${text}" from Gemini`);
        
        // Add source information
        nutritionData.source = 'gemini';
        nutritionData.originalName = text;
        
        return nutritionData;
      } catch (parseError) {
        console.error('Error parsing Gemini nutrition response:', parseError);
        console.log('Raw response:', textResponse);
        throw new Error('Failed to parse nutrition data from Gemini');
      }
    } catch (error) {
      console.error(`❌ Error getting nutrition info from Gemini for "${text}":`, error);
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
      console.log(`✅ Using Gemini nutrition data for "${foodItem}" (confidence: ${nutritionData.confidence.toFixed(2)})`);
      return {
        found: true,
        originalName: foodItem,
        standardName: nutritionData.name,
        source: 'gemini',
        confidence: nutritionData.confidence,
        nutrition: {
          serving_size_g: parseFloat(nutritionData.serving_size) || 100,
          calories: nutritionData.calories,
          protein_g: nutritionData.protein,
          carbohydrates_total_g: nutritionData.carbs,
          fat_total_g: nutritionData.fat,
          fiber_g: nutritionData.fiber,
          sugar_g: nutritionData.sugar
        }
      };
    } else {
      console.log(`⚠️ Gemini confidence too low (${nutritionData.confidence.toFixed(2)}) for "${foodItem}"`);
      return { 
        found: false, 
        originalName: foodItem,
        error: 'Low confidence in Gemini nutrition data',
        similarity: 0
      };
    }
  } catch (error) {
    console.error(`❌ Error getting fallback nutrition for "${foodItem}":`, error);
    return { 
      found: false, 
      originalName: foodItem,
      error: error.message,
      similarity: 0
    };
  }
}

export { GeminiNutrition, getFallbackNutrition };

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class NutritionixService {
  constructor() {
    if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_APP_KEY) {
      throw new Error('Nutritionix API credentials not found in environment variables');
    }
    
    this.client = axios.create({
      baseURL: 'https://trackapi.nutritionix.com/v2',
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID,
        'x-app-key': process.env.NUTRITIONIX_APP_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get nutrition data for a food item from Nutritionix API
   * @param {string} query - Food item name to search for
   * @returns {Promise<Object>} - Formatted nutrition data matching our schema
   */
  async getNutritionInfo(query) {
    try {
      console.log(`[Nutritionix] Searching for: "${query}"`);
      
      // First, search for the food item
      const searchResponse = await this.client.post('/natural/nutrients', {
        query,
        timezone: 'US/Eastern'
      });
      
      if (!searchResponse.data || !searchResponse.data.foods || searchResponse.data.foods.length === 0) {
        throw new Error('No food items found');
      }
      
      // Take the first result
      const food = searchResponse.data.foods[0];
      console.log(`[Nutritionix] Found: ${food.food_name}`);
      
      // Format the response to match our schema
      return this.formatNutritionData(food, query);
      
    } catch (error) {
      console.error('[Nutritionix] Error getting nutrition info:', error.message);
      throw error;
    }
  }

  /**
   * Format Nutritionix API response to match our schema
   * @param {Object} food - Food item from Nutritionix
   * @param {string} originalQuery - Original food item query
   * @returns {Object} - Formatted nutrition data
   */
  formatNutritionData(food, originalQuery) {
    // Common serving sizes in grams
    const commonSizes = {
      small: 100,    // 100g
      medium: 150,   // 150g
      large: 225     // 225g
    };

    // Calculate scaling factors
    const baseServingGrams = food.serving_weight_grams || 100;
    
    // Generate servings for small, medium, large
    const servings = Object.entries(commonSizes).map(([size, grams]) => {
      const ratio = grams / baseServingGrams;
      
      return {
        size,
        portion_label: `1 ${size.charAt(0).toUpperCase() + size.slice(1)} Serving (${grams}g)`,
        weight_g: grams,
        calories: Math.round(food.nf_calories * ratio),
        protein_g: Math.round(food.nf_protein * ratio * 10) / 10, // 1 decimal place
        carbs_g: Math.round(food.nf_total_carbohydrate * ratio * 10) / 10,
        fat_g: Math.round(food.nf_total_fat * ratio * 10) / 10,
        fiber_g: food.nf_dietary_fiber ? Math.round(food.nf_dietary_fiber * ratio * 10) / 10 : null,
        sugar_g: food.nf_sugars ? Math.round(food.nf_sugars * ratio * 10) / 10 : null,
        sodium_mg: food.nf_sodium ? Math.round(food.nf_sodium * ratio) : null
      };
    });

    return {
      name: food.food_name.toLowerCase(),
      aliases: [originalQuery.toLowerCase()],
      category: this.mapCategory(food.food_group, food.food_name),
      servings,
      source: 'nutritionix',
      originalName: originalQuery
    };
  }

  /**
   * Map Nutritionix food group to our categories
   */
  mapCategory(foodGroup, foodName = '') {
    if (!foodGroup) return 'other';
    
    const lowerName = foodName.toLowerCase();
    
    // Map based on food group and name patterns
    if (foodGroup.includes('Dairy') || foodGroup.includes('Cheese') || 
        lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('paneer')) {
      return 'dairy';
    }
    
    if (foodGroup.includes('Grain') || foodGroup.includes('Bread') || 
        lowerName.includes('roti') || lowerName.includes('chapati') || lowerName.includes('naan')) {
      return 'bread';
    }
    
    if (foodGroup.includes('Vegetable') || foodGroup.includes('Fruit') || 
        foodGroup.includes('Legume') || foodGroup.includes('Bean')) {
      if (lowerName.includes('dal') || lowerName.includes('sambar') || 
          lowerName.includes('sambhar') || lowerName.includes('rajma')) {
        return 'dal';
      }
      return 'sabzi';
    }
    
    if (foodGroup.includes('Meat') || foodGroup.includes('Poultry') || 
        foodGroup.includes('Fish') || foodGroup.includes('Egg')) {
      return 'non-veg';
    }
    
    if (foodGroup.includes('Sweet') || lowerName.includes('halwa') || 
        lowerName.includes('kheer') || lowerName.includes('sweet')) {
      return 'sweet';
    }
    
    return 'other';
  }
}

export default NutritionixService;

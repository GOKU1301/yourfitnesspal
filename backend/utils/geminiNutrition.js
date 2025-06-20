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
      "size": "small | medium | large",
      "portion_label": "Description with quantity and unit (e.g., '1 Small Roti (20cm)' or '1 Katori (200g)')",
      "diameter_cm": number | null, // Only for breads like roti/chapati/paratha
      "weight_g": number | null,     // For solids, sweets, snacks, etc.
      "volume_ml": number | null,    // Only for beverages and liquids
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber_g": number | null,
      "sugar_g": number | null,
      "sodium_mg": number | null
    }
  ]
}

IMPORTANT PORTION SIZE RULES:
1. For breads (roti, chapati, paratha, etc.):
   - Small: 1 Small Roti (20cm, 30g)
   - Medium: 1 Medium Roti (25cm, 50g)
   - Large: 1 Large Roti (30cm, 70g)
   - Set volume_ml and weight_g to null

2. For rice, sabzi, dal, curries:
   - Small: 1 Small Katori (100g)
   - Medium: 1 Katori (200g)
   - Large: 1 Large Katori (300g)
   - Set diameter_cm and volume_ml to null

3. For beverages (milk, lassi, juice, etc.):
   - Small: 1 Small Glass (100ml)
   - Medium: 1 Glass (200ml)
   - Large: 1 Large Glass (300ml)
   - Set diameter_cm and weight_g to null

4. For snacks, sweets, and other items:
   - Small: 1 Small Piece (50g)
   - Medium: 1 Piece (100g)
   - Large: 1 Large Piece (150g)
   - Set diameter_cm and volume_ml to null

PORTION LABEL FORMAT:
- Always use '1' as the quantity in portion_label
- Include size (Small/Medium/Large) and unit in the label
- Examples:
  - For breads: '1 Small Roti (20cm)'
  - For rice/dal: '1 Small Katori (100g)'
  - For drinks: '1 Small Glass (100ml)'
  - For snacks: '1 Small Piece (50g)'

GENERAL RULES:
1. Always provide all three portion sizes (small, medium, large)
2. Use consistent units and realistic weights/volumes as specified above
3. Set all unused measurement fields to null (not 0)
4. Use realistic nutritional values based on standard databases
5. Return ONLY valid JSON, no explanation or markdown
6. All numeric values must be numbers, not strings
7. The output must exactly match the schema above`;

      // Generate content with the prompt
      console.log('Sending request to Gemini API...');
      const result = await this.model.generateContent({ 
        contents: [{ 
          role: 'user', 
          parts: [{ 
            text: `Provide accurate nutrition information for: "${text}"

First, determine if "${text}" is a LIQUID or SOLID food item.

IMPORTANT: For LIQUIDS (milk, juice, water, etc):
- ALWAYS use GLASS as the container, not katori
- Set weight_g to null (JavaScript null, not string "null")
- Set volume_ml to the actual volume in ml
- Portion sizes should be: Small Glass (100ml), Glass (200ml), Large Glass (300ml)

For SOLIDS (all other food items):
- Use appropriate containers like katori, bowl, piece, etc.
- Set volume_ml to null (JavaScript null, not string "null")
- Set weight_g to the actual weight in grams

Return ONLY a JSON object matching this structure (do not include any markdown):
{
  "name": "standard food name (English)",
  "aliases": ["alias1", "alias2"],
  "category": "bread | sabzi | dal | beverage | sweet | snack | dairy | etc.",
  "servings": [
    {
      "size": "small",
      "portion_label": "Description with quantity and unit",
      "weight_g": number or null,     // Use null for liquids
      "volume_ml": number or null,    // Use null for solids
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "sugar_g": number,
      "sodium_mg": number
    },
    // medium and large portions follow same format
  ]
}

IMPORTANT PORTION SIZE RULES:
1. For vegetables dishes (sabzi):
   - Small: 1 Small Katori (100g)
   - Medium: 1 Katori (150g)
   - Large: 1 Large Katori (200g)
   - Protein: 2-4g per 100g for plain vegetable dishes
   - Protein: 4-6g per 100g for dishes with peas or other legumes

2. For rice, dals, curries:
   - Small: 1 Small Katori (100g)
   - Medium: 1 Katori (150g)
   - Large: 1 Large Katori (200g)
   - Protein: 2-3g per 100g for plain rice
   - Protein: 7-9g per 100g for dals
   - Protein: 6-15g per 100g for meat curries (depending on meat content)

3. For breads (roti, chapati, paratha):
   - Small: 1 Small Roti (25g)
   - Medium: 1 Medium Roti (40g)
   - Large: 1 Large Roti/Paratha (60g)
   - Protein: 2-3g per roti/chapati
   - Protein: 3-4g for stuffed parathas

4. For snacks and sweets:
   - Small: 1 Small Piece (30g)
   - Medium: 1 Medium Piece (50g)
   - Large: 1 Large Piece (75g)
   - Protein: 1-3g per 100g for most sweet items
   - Protein: 3-7g per 100g for snacks with legumes/nuts

5. For beverages and liquid items (EXTREMELY IMPORTANT):
   - Small: 1 Small Glass (100ml)
   - Medium: 1 Glass (200ml)
   - Large: 1 Large Glass (300ml)
   - Set weight_g to null
   - Set volume_ml to the actual volume (100, 200, or 300)
   - For milk: 60-70 calories, 3-3.5g protein, 5g carbs, 3-4g fat per 100ml
   - For fruit juices: 45-60 calories, 0-1g protein, 10-15g carbs, 0g fat per 100ml
   - For tea/coffee: 1-2 calories, 0g protein, 0-1g carbs, 0g fat per 100ml (without milk/sugar)

PORTION LABEL FORMAT:
- For solid foods: Always specify the exact weight in grams in the portion_label
  Example: "1 Small Katori (100g)" or "1 Medium Piece (50g)"
- For liquid foods: Always specify the exact volume in ml in the portion_label
  Example: "1 Small Glass (100ml)" or "1 Glass (200ml)"

NUTRITIONAL VALUE GUIDELINES:
- Vegetables: 20-40 calories, 1-3g protein, 3-8g carbs, 0-1g fat per 100g
- Sabzi (cooked veg): 60-120 calories, 2-6g protein, 5-15g carbs, 2-8g fat per 100g
- Rice (cooked): 130-150 calories, 2-3g protein, 28-30g carbs, 0-1g fat per 100g
- Dal (cooked): 100-120 calories, 7-9g protein, 15-20g carbs, 0.5-2g fat per 100g
- Roti/Chapati: 70-80 calories, 2-3g protein, 15g carbs, 0.3g fat per piece (25-30g)
- Paratha: 150-180 calories, 3-4g protein, 20g carbs, 7-8g fat per piece (50-60g)
- Milk: 60-70 calories, 3-3.5g protein, 5g carbs, 3-4g fat per 100ml

NULL VALUES: For any field that might be null, you MUST use an actual JavaScript null value (not the string "null"). For example: "weight_g": null

ALL VALUES MUST BE REALISTIC AND PROPORTIONAL TO WEIGHT/VOLUME.`
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
        
        // Ensure we have all required serving sizes
        const requiredSizes = ['small', 'medium', 'large'];
        const sizes = nutritionData.servings.map(s => s.size);
        const missingSizes = requiredSizes.filter(size => !sizes.includes(size));
        
        if (missingSizes.length > 0) {
          throw new Error(`Missing required serving sizes: ${missingSizes.join(', ')}`);
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


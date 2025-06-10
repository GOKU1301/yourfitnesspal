const express = require('express');
const router = express.Router();
const axios = require('axios');
const { OpenAI } = require('openai');
const { PineconeClient } = require('pinecone-client');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone client
const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'us-west1-gcp' // Update with your Pinecone environment
});

/**
 * @route   GET api/nutrition/search/:query
 * @desc    Search for food items using semantic search
 * @access  Public
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`Performing semantic search for: ${query}`);
    
    // Generate embedding for the query using OpenAI
    const embedding = await generateEmbedding(query);
    
    // Query Pinecone for similar food items
    const indexName = process.env.PINECONE_INDEX_NAME;
    const index = pinecone.Index(indexName);
    
    const queryResults = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true
    });
    
    // Format results
    const results = queryResults.matches.map(match => ({
      foodItem: match.metadata.foodItem,
      similarity: match.score,
      nutritionInfo: match.metadata.nutritionInfo || {}
    }));
    
    return res.json(results);
  } catch (error) {
    console.error('Error in semantic search:', error);
    return res.status(500).json({ error: 'Failed to perform search', details: error.message });
  }
});

/**
 * @route   GET api/nutrition/info/:foodItem
 * @desc    Get nutrition information for a food item
 * @access  Public
 */
router.get('/info/:foodItem', async (req, res) => {
  try {
    const { foodItem } = req.params;
    
    if (!foodItem || foodItem.trim() === '') {
      return res.status(400).json({ error: 'Food item name is required' });
    }
    
    console.log(`Getting nutrition info for: ${foodItem}`);
    
    // Try to get nutrition info from a free API
    // For this example, we'll use the Edamam Food Database API
    // You'll need to sign up for a free API key at https://developer.edamam.com/food-database-api
    const nutritionInfo = await getNutritionInfo(foodItem);
    
    return res.json(nutritionInfo);
  } catch (error) {
    console.error('Error getting nutrition info:', error);
    return res.status(500).json({ error: 'Failed to get nutrition information', details: error.message });
  }
});

/**
 * @route   POST api/nutrition/calculate
 * @desc    Calculate nutrition based on food items and portions
 * @access  Public
 */
router.post('/calculate', async (req, res) => {
  try {
    const { foodItems } = req.body;
    
    if (!foodItems || !Array.isArray(foodItems) || foodItems.length === 0) {
      return res.status(400).json({ error: 'Food items array is required' });
    }
    
    // Calculate nutrition for each food item
    const nutritionPromises = foodItems.map(async (item) => {
      const { name, portionSize = 100 } = item;
      
      // Get nutrition info
      const nutritionInfo = await getNutritionInfo(name);
      
      // Scale nutrition based on portion size
      const scaledNutrition = scaleNutrition(nutritionInfo, portionSize);
      
      return {
        foodItem: name,
        portionSize,
        nutrition: scaledNutrition
      };
    });
    
    const nutritionResults = await Promise.all(nutritionPromises);
    
    // Calculate total nutrition
    const totalNutrition = calculateTotalNutrition(nutritionResults);
    
    return res.json({
      items: nutritionResults,
      total: totalNutrition
    });
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    return res.status(500).json({ error: 'Failed to calculate nutrition', details: error.message });
  }
});

/**
 * @route   POST api/nutrition/index
 * @desc    Index a food item in Pinecone for semantic search
 * @access  Private (would require auth middleware in production)
 */
router.post('/index', async (req, res) => {
  try {
    const { foodItem, nutritionInfo } = req.body;
    
    if (!foodItem || !nutritionInfo) {
      return res.status(400).json({ error: 'Food item and nutrition info are required' });
    }
    
    // Generate embedding for the food item
    const embedding = await generateEmbedding(foodItem);
    
    // Index in Pinecone
    const indexName = process.env.PINECONE_INDEX_NAME;
    const index = pinecone.Index(indexName);
    
    await index.upsert({
      vectors: [{
        id: `food_${Date.now()}`,
        values: embedding,
        metadata: {
          foodItem,
          nutritionInfo
        }
      }]
    });
    
    return res.json({ success: true, message: 'Food item indexed successfully' });
  } catch (error) {
    console.error('Error indexing food item:', error);
    return res.status(500).json({ error: 'Failed to index food item', details: error.message });
  }
});

/**
 * Generate embedding for text using OpenAI
 * @param {string} text - Text to generate embedding for
 * @returns {Array} Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Get nutrition information for a food item
 * @param {string} foodItem - Food item name
 * @returns {Object} Nutrition information
 */
async function getNutritionInfo(foodItem) {
  try {
    // For this example, we'll use the Edamam Food Database API
    // You'll need to sign up for a free API key at https://developer.edamam.com/food-database-api
    // Replace APP_ID and APP_KEY with your actual credentials
    const APP_ID = 'your_app_id';
    const APP_KEY = 'your_app_key';
    
    const response = await axios.get(`https://api.edamam.com/api/food-database/v2/parser`, {
      params: {
        app_id: APP_ID,
        app_key: APP_KEY,
        ingr: foodItem
      }
    });
    
    // Extract nutrition information from response
    if (response.data && response.data.hints && response.data.hints.length > 0) {
      const firstHint = response.data.hints[0];
      const nutrients = firstHint.food.nutrients;
      
      return {
        calories: nutrients.ENERC_KCAL || 0,
        protein: nutrients.PROCNT || 0,
        fat: nutrients.FAT || 0,
        carbs: nutrients.CHOCDF || 0,
        fiber: nutrients.FIBTG || 0
      };
    }
    
    // If no nutrition info found, return default values
    return {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0
    };
  } catch (error) {
    console.error('Error getting nutrition info:', error);
    
    // Return default values if API call fails
    return {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0
    };
  }
}

/**
 * Scale nutrition based on portion size
 * @param {Object} nutrition - Nutrition information
 * @param {number} portionSize - Portion size in grams
 * @returns {Object} Scaled nutrition information
 */
function scaleNutrition(nutrition, portionSize) {
  const scaleFactor = portionSize / 100; // Assuming nutrition info is per 100g
  
  return {
    calories: nutrition.calories * scaleFactor,
    protein: nutrition.protein * scaleFactor,
    fat: nutrition.fat * scaleFactor,
    carbs: nutrition.carbs * scaleFactor,
    fiber: nutrition.fiber * scaleFactor
  };
}

/**
 * Calculate total nutrition from multiple food items
 * @param {Array} nutritionItems - Array of nutrition items
 * @returns {Object} Total nutrition
 */
function calculateTotalNutrition(nutritionItems) {
  return nutritionItems.reduce((total, item) => {
    const nutrition = item.nutrition;
    
    return {
      calories: total.calories + nutrition.calories,
      protein: total.protein + nutrition.protein,
      fat: total.fat + nutrition.fat,
      carbs: total.carbs + nutrition.carbs,
      fiber: total.fiber + nutrition.fiber
    };
  }, {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0
  });
}

module.exports = router;

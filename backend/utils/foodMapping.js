import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Pinecone configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'jiitnutritionindex1';

// Model configuration for embeddings
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Food mapping database - local fallback for when Pinecone is unavailable
const FOOD_MAPPINGS_PATH = path.join(__dirname, '../data/foodMappings.json');

// Initialize Pinecone client and index
let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client and index
 */
async function initPinecone() {
  try {
    if (!PINECONE_API_KEY) {
      console.warn('Pinecone API key not found. Semantic search will be disabled.');
      return false;
    }

    // Initialize Pinecone client with the latest configuration
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    try {
      // Get the index reference
      pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
      
      // Test the connection by getting index stats
      await pineconeIndex.describeIndexStats();
      console.log('✅ Pinecone connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Error connecting to Pinecone index:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error.message);
    return false;
  }
}

/**
 * Generate embedding for a text using OpenAI API
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<Array<number>>} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    // Initialize the model if not already initialized
    if (!generateEmbedding.model) {
      generateEmbedding.model = await pipeline('feature-extraction', MODEL_NAME);
    }

    // Generate embedding using transformers
    const result = await generateEmbedding.model(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data);
    return embedding;
    
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMsg = `Embedding error: ${error.response.status} - ${error.response.statusText}`;
      console.error(errorMsg);
      
      // If the error is 429 (rate limit), throw with retry information
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 10;
        error.retryAfter = parseInt(retryAfter, 10);
        error.status = 429;
        throw error;
      }
      
      throw new Error(errorMsg);
    } else {
      console.error('Error generating embedding:', error.message);
      throw error;
    }
  }
}

/**
 * Load the local food mappings database
 * @returns {Object} - Food mappings
 */
function loadLocalMappings() {
  try {
    if (fs.existsSync(FOOD_MAPPINGS_PATH)) {
      const data = fs.readFileSync(FOOD_MAPPINGS_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading local food mappings:', error);
    return {};
  }
}

/**
 * Save mappings to local database
 * @param {Object} mappings - Food mappings to save
 */
function saveLocalMappings(mappings) {
  try {
    // Ensure directory exists
    const dir = path.dirname(FOOD_MAPPINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(FOOD_MAPPINGS_PATH, JSON.stringify(mappings, null, 2));
  } catch (error) {
    console.error('Error saving local food mappings:', error);
  }
}

/**
 * Add a food mapping to Pinecone
 * @param {string} localName - Local food name (e.g., "achar")
 * @param {string} standardName - Standard food name (e.g., "pickle")
 */
async function addFoodMapping(localName, standardName) {
  try {
    // First update local mappings
    const localMappings = loadLocalMappings();
    localMappings[localName.toLowerCase()] = standardName.toLowerCase();
    saveLocalMappings(localMappings);
    
    // Then update Pinecone if available
    if (pineconeIndex) {
      const embedding = await generateEmbedding(localName);
      
      await pineconeIndex.upsert({
        vectors: [{
          id: localName.toLowerCase().replace(/\s+/g, '-'),
          values: embedding,
          metadata: {
            originalName: localName.toLowerCase(),
            standardName: standardName.toLowerCase()
          }
        }]
      });
      
      console.log(`Added mapping: ${localName} → ${standardName}`);
    }
  } catch (error) {
    console.error(`Error adding food mapping for ${localName}:`, error);
  }
}

/**
 * Calculate string similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  // Convert both strings to lowercase for case-insensitive comparison
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Calculate Levenshtein distance
  const track = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  // Return similarity as a value between 0 and 1
  // 1 means identical, 0 means completely different
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Find the standard food name for a local food item using Nutritionix API first, then fall back to Pinecone
 * @param {string} foodItem - Food item to find mapping for
 * @returns {Promise<string>} - Standard food name
 */
async function findStandardFoodName(foodItem) {
  if (!foodItem) return '';
  
  const normalizedFoodItem = foodItem.toLowerCase().trim();
  console.log(`\n🔍 [FOOD_MAPPING] Looking up food item: "${normalizedFoodItem}"`);
  console.log(`🔍 [FOOD_MAPPING] Timestamp: ${new Date().toISOString()}`);
  
  // First check local mappings for exact match
  const localMappings = loadLocalMappings();
  console.log(`🔍 [FOOD_MAPPING] Local mappings database has ${Object.keys(localMappings).length} entries`);
  
  if (localMappings[normalizedFoodItem]) {
    console.log(`✅ [FOOD_MAPPING] Found LOCAL mapping: "${normalizedFoodItem}" → "${localMappings[normalizedFoodItem]}"`);
    return localMappings[normalizedFoodItem];
  }
  
  console.log(`🔍 [FOOD_MAPPING] No exact match found in local database for "${normalizedFoodItem}"`);
  
  // Import Nutritionix search function here to avoid circular dependencies
  const { findBestNutritionixMatch, addFoodMappingIfNew } = await import('./nutritionixSearch.js');
  
  try {
    // First try to find a match in Nutritionix
    console.log(`🔎 [FOOD_MAPPING] Searching Nutritionix API for: "${normalizedFoodItem}"`);
    const nutritionixMatch = await findBestNutritionixMatch(normalizedFoodItem);
    
    console.log(`🔎 [FOOD_MAPPING] Nutritionix search result:`, {
      found: nutritionixMatch.found,
      similarity: nutritionixMatch.similarity ? nutritionixMatch.similarity.toFixed(3) : 'N/A',
      standardName: nutritionixMatch.standardName || 'N/A'
    });
    
    if (nutritionixMatch.found && nutritionixMatch.similarity >= 0.7) {
      console.log(`✅ [FOOD_MAPPING] Found NUTRITIONIX match: "${normalizedFoodItem}" → "${nutritionixMatch.standardName}" (similarity: ${nutritionixMatch.similarity.toFixed(3)})`);
      
      // Add this mapping for future use
      console.log(`🔄 [FOOD_MAPPING] Adding new mapping to database: "${normalizedFoodItem}" → "${nutritionixMatch.standardName}"`);
      await addFoodMappingIfNew(normalizedFoodItem, nutritionixMatch.standardName);
      return nutritionixMatch.standardName;
    }
    
    console.log(`⚠️ [FOOD_MAPPING] No good Nutritionix match found for "${normalizedFoodItem}", trying Pinecone...`);
    
    // Fall back to Pinecone if Nutritionix didn't find a good match
    if (!pineconeInitialized) {
      console.log(`⚠️ [FOOD_MAPPING] Pinecone not initialized, using original food name: "${normalizedFoodItem}"`);
      return normalizedFoodItem;
    }
    
    console.log(`🔄 [FOOD_MAPPING] Pinecone status: ${pineconeInitialized ? 'Connected' : 'Not connected'}`);

    console.log(`🔎 [FOOD_MAPPING] Searching Pinecone for: "${normalizedFoodItem}"`);
    console.log(`🔄 [FOOD_MAPPING] Generating embedding for "${normalizedFoodItem}"...`);
    const embedding = await generateEmbedding(normalizedFoodItem);
    console.log(`🔄 [FOOD_MAPPING] Embedding generated, vector length: ${embedding.length}`);
    console.log(`🔄 [FOOD_MAPPING] Querying Pinecone index: ${PINECONE_INDEX_NAME}`);
    
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      includeValues: false
    });
    
    console.log(`🔄 [FOOD_MAPPING] Pinecone query complete at: ${new Date().toISOString()}`);

    if (queryResponse.matches?.length > 0) {
      console.log(`📊 [FOOD_MAPPING] Pinecone found ${queryResponse.matches.length} potential matches:`);
      queryResponse.matches.forEach((match, i) => {
        console.log(`   ${i + 1}. "${match.metadata?.standardName || 'unknown'}" (score: ${match.score.toFixed(3)})`);
      });

      const bestMatch = queryResponse.matches[0];
      
      // Only use Pinecone match if we're very confident
      if (bestMatch.score > 0.8 && bestMatch.metadata?.standardName) {
        console.log(`✅ [FOOD_MAPPING] Using PINECONE match: "${normalizedFoodItem}" → "${bestMatch.metadata.standardName}" (score: ${bestMatch.score.toFixed(3)})`);
        // Add this mapping for future use
        console.log(`🔄 [FOOD_MAPPING] Adding successful Pinecone mapping to local database`);
        await addFoodMappingIfNew(normalizedFoodItem, bestMatch.metadata.standardName);
        return bestMatch.metadata.standardName;
      } else {
        console.log(`⚠️ [FOOD_MAPPING] Best Pinecone match score (${bestMatch.score.toFixed(3)}) below threshold (0.8), using original`);
      }
    } else {
      console.log('⚠️ [FOOD_MAPPING] No matches found in Pinecone vector database');
    }
  } catch (error) {
    console.error('❌ [FOOD_MAPPING] Search error:', error.message);
    console.error('❌ [FOOD_MAPPING] Error stack:', error.stack);
  }
  
  // If no match found or score too low, return the original
  console.log(`ℹ️ [FOOD_MAPPING] No suitable mapping found, using original: "${normalizedFoodItem}"`);
  console.log(`ℹ️ [FOOD_MAPPING] Mapping process complete at: ${new Date().toISOString()}`);
  return normalizedFoodItem;
}

/**
 * Initialize the food mapping database with common Indian food items
 * This should be called once to populate the database
 */
async function initializeFoodMappings() {
  const commonMappings = {
    // Indian dishes to Western equivalents
    'achar': 'pickle',
    'aloo gobi': 'potato and cauliflower curry',
    'aloo matar': 'potato and pea curry',
    'aloo paratha': 'potato stuffed flatbread',
    'bhaji': 'vegetable fritters',
    'bhatura': 'fried bread',
    'bhindi': 'okra',
    'biryani': 'mixed rice dish',
    'chapati': 'whole wheat flatbread',
    'chaat': 'savory snack',
    'chana masala': 'chickpea curry',
    'chutney': 'spicy condiment',
    'dal': 'lentil soup',
    'dosa': 'rice pancake',
    'gulab jamun': 'sweet milk balls',
    'idli': 'steamed rice cake',
    'jalebi': 'sweet fried dough',
    'kheer': 'rice pudding',
    'kulfi': 'indian ice cream',
    'ladoo': 'sweet balls',
    'lassi': 'yogurt drink',
    'naan': 'leavened flatbread',
    'pakora': 'fritters',
    'paneer': 'indian cottage cheese',
    'paratha': 'layered flatbread',
    'raita': 'yogurt sauce',
    'rasam': 'tamarind soup',
    'roti': 'flatbread',
    'sabzi': 'mixed vegetables',
    'sambar': 'lentil vegetable stew',
    'samosa': 'fried pastry with filling',
    'tandoori': 'clay oven cooked',
    'upma': 'semolina porridge',
    'vada': 'savory fried snack',
    
    // Regional variations
    'puri': 'fried bread',
    'poori': 'fried bread',
    'pulao': 'rice pilaf',
    'pulav': 'rice pilaf',
    'halwa': 'sweet pudding',
    'halva': 'sweet pudding',
    'barfi': 'milk-based sweet',
    'burfi': 'milk-based sweet',
    'kofta': 'meatballs',
    'korma': 'creamy curry',
    'kurma': 'creamy curry',
    'tikka': 'marinated meat pieces',
    'tikka masala': 'creamy tomato curry'
  };
  
  console.log('Initializing food mappings database...');
  
  // Add all mappings
  for (const [localName, standardName] of Object.entries(commonMappings)) {
    await addFoodMapping(localName, standardName);
  }
  
  console.log('Food mappings initialized successfully');
}

// Initialize Pinecone on module load
let pineconeInitialized = false;
initPinecone().then(result => {
  pineconeInitialized = result;
  if (pineconeInitialized) {
    console.log('Pinecone initialized successfully');
  } else {
    console.warn('Pinecone initialization failed, using local mappings only');
  }
}).catch(err => {
  console.error('Error initializing Pinecone:', err);
  console.warn('Falling back to local mappings only');
});

export {
  findStandardFoodName,
  addFoodMapping,
  initializeFoodMappings,
  calculateStringSimilarity,
  loadLocalMappings,
  saveLocalMappings
};

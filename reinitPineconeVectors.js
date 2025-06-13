import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'jiitnutritionindex1';
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const FOOD_MAPPINGS_PATH = path.join(__dirname, './data/foodMappings.json');

// Initialize embedding model
let embeddingModel = null;

/**
 * Generate embedding for a text using all-MiniLM-L6-v2 model
 */
async function generateEmbedding(text) {
  try {
    // Initialize the model if not already initialized
    if (!embeddingModel) {
      console.log(`⏳ Loading model: ${MODEL_NAME}...`);
      embeddingModel = await pipeline('feature-extraction', MODEL_NAME);
      console.log('✅ Model loaded successfully');
    }

    // Generate embedding using transformers
    const result = await embeddingModel(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data); // Return the 384-dimension embedding directly
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

/**
 * Load the local food mappings database
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
 * Initialize Pinecone client and index
 */
async function initPinecone() {
  try {
    if (!PINECONE_API_KEY) {
      console.error('❌ Pinecone API key not found. Please set PINECONE_API_KEY in .env file.');
      return null;
    }

    // Initialize Pinecone client
    const pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    try {
      // Get the index reference
      const pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
      
      // Test the connection by getting index stats
      const stats = await pineconeIndex.describeIndexStats();
      console.log('✅ Pinecone connected successfully');
      console.log(`📊 Current index stats: ${JSON.stringify(stats, null, 2)}`);
      
      return pineconeIndex;
    } catch (error) {
      console.error('❌ Error connecting to Pinecone index:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error.message);
    return null;
  }
}

/**
 * Main function to reinitialize Pinecone with new embeddings
 */
async function reinitializePinecone() {
  console.log('🚀 Starting Pinecone reinitialization with all-MiniLM-L6-v2 embeddings...');
  
  // Initialize Pinecone
  const pineconeIndex = await initPinecone();
  if (!pineconeIndex) {
    console.error('❌ Failed to initialize Pinecone. Exiting...');
    return;
  }
  
  // Load local mappings
  const localMappings = loadLocalMappings();
  console.log(`📚 Loaded ${Object.keys(localMappings).length} local food mappings`);
  
  if (Object.keys(localMappings).length === 0) {
    console.error('❌ No local mappings found. Please run initializeFoodMappings() first.');
    return;
  }
  
  // Delete all existing vectors
  try {
    console.log('🗑️ Deleting all existing vectors from Pinecone...');
    // Use the namespace-less delete all for the latest Pinecone SDK
    await pineconeIndex.deleteAll();
    console.log('✅ All vectors deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting vectors:', error.message);
    console.error('Error details:', error);
    // Continue anyway
  }
  
  // Process mappings in batches to avoid rate limiting
  const batchSize = 10;
  const entries = Object.entries(localMappings);
  const totalBatches = Math.ceil(entries.length / batchSize);
  
  console.log(`🔄 Processing ${entries.length} mappings in ${totalBatches} batches...`);
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}...`);
    
    // Process each mapping in the batch
    const vectors = [];
    
    for (const [localName, standardName] of batch) {
      try {
        console.log(`🔄 Generating embedding for "${localName}"...`);
        const embedding = await generateEmbedding(localName);
        
        vectors.push({
          id: localName.toLowerCase().replace(/\s+/g, '-'),
          values: embedding,
          metadata: {
            originalName: localName.toLowerCase(),
            standardName: standardName.toLowerCase()
          }
        });
        
        console.log(`✅ Processed: ${localName} → ${standardName}`);
      } catch (error) {
        console.error(`❌ Error processing ${localName}:`, error.message);
      }
    }
    
    // Upsert vectors to Pinecone
    if (vectors.length > 0) {
      try {
        console.log(`📤 Upserting ${vectors.length} vectors to Pinecone...`);
        // Format for the latest Pinecone SDK
        await pineconeIndex.upsert(vectors);
        console.log(`✅ Successfully upserted ${vectors.length} vectors`);
      } catch (error) {
        console.error('❌ Error upserting vectors to Pinecone:', error.message);
        console.error('Error details:', error);
      }
    }
    
    // Add a delay between batches to avoid rate limiting
    if (i + batchSize < entries.length) {
      const delayMs = 2000; // 2 seconds
      console.log(`⏳ Waiting ${delayMs/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Get final stats
  try {
    const stats = await pineconeIndex.describeIndexStats();
    console.log(`\n✅ Reinitialization complete!`);
    console.log(`📊 Final index stats: ${JSON.stringify(stats, null, 2)}`);
  } catch (error) {
    console.error('❌ Error getting final stats:', error.message);
  }
}

// Run the reinitialization
reinitializePinecone().catch(console.error);

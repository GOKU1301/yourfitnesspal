import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * Generate embedding for a text using all-MiniLM-L6-v2 model
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<Array<number>>} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    console.log(`🔄 Generating embedding for: "${text}"`);
    
    // Initialize the model if not already initialized
    if (!generateEmbedding.model) {
      console.log(`⏳ Loading model: ${MODEL_NAME}...`);
      generateEmbedding.model = await pipeline('feature-extraction', MODEL_NAME);
      console.log('✅ Model loaded successfully');
    }

    // Generate embedding using transformers
    console.log('⏳ Generating embedding...');
    const startTime = performance.now();
    const result = await generateEmbedding.model(text, { pooling: 'mean', normalize: true });
    const duration = performance.now() - startTime;
    
    // Convert to regular array
    const embedding = Array.from(result.data);
    
    console.log(`✅ Embedding generated in ${duration.toFixed(2)}ms`);
    console.log(`📊 Embedding dimension: ${embedding.length}`);
    console.log(`📊 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Test embeddings with sample food items
 */
async function testEmbeddings() {
  console.log('🚀 Starting embedding test with all-MiniLM-L6-v2...\n');
  
  try {
    // Generate embeddings for a few food items
    const foods = [
      'paneer',
      'indian cheese',
      'roti',
      'flatbread',
      'dal',
      'lentils'
    ];
    
    const embeddings = {};
    
    // Generate embeddings for each food
    for (const food of foods) {
      embeddings[food] = await generateEmbedding(food);
      console.log('-'.repeat(50));
    }
    
    // Test similarities
    console.log('\n📊 Similarity Tests:');
    console.log('='.repeat(60));
    
    const pairs = [
      ['paneer', 'indian cheese'],
      ['roti', 'flatbread'],
      ['dal', 'lentils']
    ];
    
    for (const [food1, food2] of pairs) {
      const similarity = cosineSimilarity(embeddings[food1], embeddings[food2]);
      console.log(`Similarity between "${food1}" and "${food2}": ${similarity.toFixed(4)}`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEmbeddings().catch(console.error);

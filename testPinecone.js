import dotenv from 'dotenv';
import { findStandardFoodName, initializeFoodMappings, loadLocalMappings } from './utils/foodMapping.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testFoodMapping() {
  console.log('Testing Food Mapping Functionality...');
  
  // Check if required environment variables are set
  const missingVars = [];
  if (!process.env.PINECONE_API_KEY) {
    console.warn('⚠️  PINECONE_API_KEY is not set in .env file - Pinecone features will be disabled');
    missingVars.push('PINECONE_API_KEY');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY is not set in .env file - Semantic search will be limited');
    missingVars.push('OPENAI_API_KEY');
  }

  try {
    // Test if we can access local mappings
    console.log('\n🔍 Loading local food mappings...');
    const localMappings = loadLocalMappings();
    console.log(`✅ Found ${Object.keys(localMappings).length} local food mappings`);
    
    // If no local mappings, try to initialize them
    if (Object.keys(localMappings).length === 0) {
      console.log('\n📝 No local mappings found. Initializing food mappings...');
      try {
        await initializeFoodMappings();
        console.log('✅ Food mappings initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize food mappings:', error.message);
      }
    }
    
    // Test food mapping with some common foods
    console.log('\n🧪 Testing food mapping functionality...');
    const testFoods = [
      'paneer', 
      'roti', 
      'dal', 
      'idli',
      'butter chicken',
      'palak paneer',
      'biryani',
      'samosa',
      'rice',
      'naan'
    ];
    
    let successfulMappings = 0;
    
    for (const food of testFoods) {
      process.stdout.write(`\n🔍 Testing "${food}"... `);
      try {
        const standardName = await findStandardFoodName(food);
        if (standardName && standardName !== food) {
          console.log(`✅ Mapped to: "${standardName}"`);
          successfulMappings++;
        } else if (standardName === food) {
          console.log(`ℹ️  No mapping found, using original`);
        } else {
          console.log(`❌ No mapping found`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`- Total foods tested: ${testFoods.length}`);
    console.log(`- Successful mappings: ${successfulMappings}`);
    console.log(`- Success rate: ${Math.round((successfulMappings / testFoods.length) * 100)}%`);
    
    if (missingVars.length > 0) {
      console.log('\n⚠️  Note: Some features may be limited due to missing environment variables');
      console.log('Please set the following in your .env file:');
      missingVars.forEach(v => console.log(`- ${v}`));
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testFoodMapping().catch(console.error);

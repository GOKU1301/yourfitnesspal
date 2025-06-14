import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config();

// Configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const NEW_INDEX_NAME = 'jiitnutrition-minilm'; // New index name for all-MiniLM-L6-v2

async function createNewIndex() {
  try {
    console.log('🚀 Creating new Pinecone index for all-MiniLM-L6-v2 embeddings...');
    
    if (!PINECONE_API_KEY) {
      console.error('❌ Pinecone API key not found. Please set PINECONE_API_KEY in .env file.');
      return;
    }
    
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    // Check if index already exists
    const indexList = await pinecone.listIndexes();
    console.log('📋 Existing indexes:', indexList);
    
    // Check if the new index already exists in the list
    const indexExists = indexList.indexes && indexList.indexes.some(index => index.name === NEW_INDEX_NAME);
    
    if (indexExists) {
      console.log(`⚠️ Index '${NEW_INDEX_NAME}' already exists. Skipping creation.`);
    } else {
      // Create new index with dimension 384 for all-MiniLM-L6-v2
      console.log(`🔨 Creating new index '${NEW_INDEX_NAME}' with dimension 384...`);
      
      await pinecone.createIndex({
        name: NEW_INDEX_NAME,
        dimension: 384,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1' // Virginia region for free tier
          }
        }
      });
      
      console.log(`✅ Index '${NEW_INDEX_NAME}' created successfully!`);
      console.log('⏳ Waiting for index to be ready...');
      
      // Wait for index to be ready
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const indexDescription = await pinecone.describeIndex(NEW_INDEX_NAME);
          console.log(`📊 Index status: ${indexDescription.status}`);
          
          if (indexDescription.status === 'Ready') {
            isReady = true;
            console.log('✅ Index is ready!');
          }
        } catch (error) {
          console.error(`❌ Error checking index status (attempt ${attempts}/${maxAttempts}):`, error.message);
        }
      }
      
      if (!isReady) {
        console.warn(`⚠️ Index may not be fully ready yet. Please check the Pinecone console.`);
      }
    }
    
    // Update .env file with new index name
    console.log('📝 Please update your .env file with the following line:');
    console.log(`PINECONE_INDEX_NAME=${NEW_INDEX_NAME}`);
    
  } catch (error) {
    console.error('❌ Error creating Pinecone index:', error);
    console.error('Error details:', error);
  }
}

// Run the function
createNewIndex().catch(console.error);

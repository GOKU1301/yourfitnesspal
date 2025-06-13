import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testPineconeConnection() {
  console.log('🔍 Testing Pinecone connection...');
  
  // Check if API key is set
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY is not set in .env file');
    return;
  }

  // Check if index name is set
  if (!process.env.PINECONE_INDEX_NAME) {
    console.error('❌ PINECONE_INDEX_NAME is not set in .env file');
    return;
  }

  const pineconeConfig = {
    apiKey: process.env.PINECONE_API_KEY,
    // Note: In the latest Pinecone client, the environment is not needed in the config
  };

  try {
    // Initialize the client
    console.log('🔄 Initializing Pinecone client...');
    const pinecone = new Pinecone(pineconeConfig);
    
    // List indexes to test the connection
    console.log('📋 Listing indexes...');
    const indexes = await pinecone.listIndexes();
    
    console.log('✅ Successfully connected to Pinecone!');
    console.log('📊 Available indexes:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Check if our index exists
    const indexList = indexes.indexes || [];
    const indexExists = indexList.some(index => index.name === process.env.PINECONE_INDEX_NAME);
    
    if (indexExists) {
      console.log(`✅ Index "${process.env.PINECONE_INDEX_NAME}" exists`);
      
      // Get index stats
      try {
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
        const stats = await index.describeIndexStats();
        console.log('📈 Index Stats:');
        console.log(JSON.stringify(stats, null, 2));
      } catch (error) {
        console.warn('⚠️  Could not get index stats:', error.message);
      }
    } else {
      console.log(`❌ Index "${process.env.PINECONE_INDEX_NAME}" does not exist`);
      console.log('💡 You can create it in the Pinecone console or via the API');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to Pinecone:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Check your Pinecone API key is correct');
    console.error('2. Verify your Pinecone environment is active');
    console.error('3. Check if your IP is whitelisted in Pinecone (if required)');
    console.error('4. Ensure you have internet connectivity');
  }
}

// Run the test
testPineconeConnection().catch(console.error);

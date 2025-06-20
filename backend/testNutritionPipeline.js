import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { processAndStoreNutrition } from './utils/nutritionPipeline.js';

// Load environment variables
dotenv.config();

// Sample food items to test
const TEST_FOOD_ITEMS = [
  'Bread with Jam',
  'Apple',
  'Chicken Curry',
  'Milk',
  'Rice',
  'Arhar Dal',
  'Aloo matar gajar',
  'Custard',
  'Gulab jamun',
  'Peda',
  'Kheer'
];

async function testNutritionPipeline() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');

    console.log('\n🚀 Starting nutrition pipeline test...');
    console.log('----------------------------------------');
    
    // Process each test food item
    for (const foodItem of TEST_FOOD_ITEMS) {
      console.log(`\n🍎 Processing: ${foodItem}`);
      console.log('----------------------------------------');
      
      try {
        const result = await processAndStoreNutrition([foodItem]);
        console.log('✅ Processed successfully');
        console.log('Result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`❌ Error processing "${foodItem}":`, error.message);
      }
      
      console.log('----------------------------------------');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the test
testNutritionPipeline();

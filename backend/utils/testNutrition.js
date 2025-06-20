import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processAndStoreNutrition } from './nutritionPipeline.js';
import Nutrition from '../models/Nutrition.js';
import NutritionixService from './nutritionx.js';

// Sample food items for testing
const TEST_FOOD_ITEMS = [
  'Poha',
  'Paneer Masala',
  'Rajma',
  'Chicken Biryani',
  'Gulab Jamun'
];

// Manual MongoDB connection using .env
async function connectToMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env file');
  }
  console.log('Using MongoDB URI:', mongoUri.replace(/:[^:]*@/, ':***@'));
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ Successfully connected to MongoDB');
}

async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    return false;
  }
}

/**
 * Test Nutritionix API
 */
async function testNutritionix() {
  console.log('\n🧪 Testing Nutritionix API...');
  console.log('='.repeat(60));
  
  if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_APP_KEY) {
    console.warn('⚠️  Nutritionix API credentials not found. Skipping Nutritionix tests.');
    console.warn('   Please set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in your .env file.');
    return;
  }
  
  const nutritionix = new NutritionixService();
  
  for (const foodItem of TEST_FOOD_ITEMS) {
    try {
      console.log(`\n🔍 Testing Nutritionix with: "${foodItem}"`);
      const startTime = Date.now();
      
      const result = await nutritionix.getNutritionInfo(foodItem);
      const timeTaken = Date.now() - startTime;
      
      console.log(`✅ Success! (${timeTaken}ms)`);
      console.log('Name:', result.name);
      console.log('Category:', result.category);
      console.log('Servings:', result.servings.length);
      
      // Log first serving details
      if (result.servings.length > 0) {
        console.log('First serving:', JSON.stringify(result.servings[0], null, 2));
      }
      
    } catch (error) {
      console.error(`❌ Error with "${foodItem}":`, error.message);
    }
  }
}

/**
 * Test the full nutrition pipeline with database storage
 */
async function testFullPipeline() {
  console.log('\n🧪 Testing Full Nutrition Pipeline...');
  console.log('='.repeat(60));
  
  try {
    // Clear existing test data
    await connectDB();
    await Nutrition.deleteMany({ name: { $in: TEST_FOOD_ITEMS } });
    
    // Process the test items
    const result = await processAndStoreNutrition(TEST_FOOD_ITEMS);
    
    // Query the database to verify
    console.log('\n🔍 Checking database for saved items...');
    const savedItems = await Nutrition.find({ name: { $in: TEST_FOOD_ITEMS } });
    
    console.log(`\n✅ Test completed. Found ${savedItems.length} items in database.`);
    
    // Print summary
    savedItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name} (ID: ${item._id})`);
      console.log('   Category:', item.category);
      console.log('   Servings:', item.servings.length);
      if (item.servings.length > 0) {
        const s = item.servings[0];
        console.log(`   First serving: ${s.size} ${s.portion_label} (${s.calories} cal)`);
        console.log(`   Macros: P:${s.protein_g}g C:${s.carbs_g}g F:${s.fat_g}g`);
      }
    });
    
    return {
      success: true,
      itemsProcessed: TEST_FOOD_ITEMS.length,
      itemsSaved: savedItems.length
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function to run all tests
async function runAllTests() {
  try {
 
    
 
    // Run Nutritionix tests
    await testNutritionix();
    
    // Run full pipeline test
    await testFullPipeline();
    
    console.log('\n✨ All tests completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n👋 Database connection closed.');
    }
  }
}

// Run all tests
runAllTests();

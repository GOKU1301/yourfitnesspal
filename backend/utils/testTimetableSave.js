// Test script to validate timetable parsing and meal saving functionality
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import GeminiProcessor from './geminiProcessor.js';
import TimetableParser from './timetableParser.js';
import Meal from '../models/Meal.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Import MenuImage model dynamically (like in timetable.js)
async function getMenuImageModel() {
  try {
    return (await import('../models/MenuImage.js')).default;
  } catch (error) {
    console.error('Error importing MenuImage model:', error);
    throw error;
  }
}

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    return false;
  }
}

// Function to test timetable parsing and meal saving
async function testTimetableSave() {
  try {
    console.log('==== TIMETABLE PROCESSING TEST ====');
    
    // Step 1: Retrieve the timetable image from MongoDB
    console.log('📥 Retrieving timetable image from MongoDB...');
    const MenuImage = await getMenuImageModel();
    
    const latestImage = await MenuImage.findOne({ filename: 'currenttimetable.jpeg' })
      .sort({ uploadedAt: -1 });
      
    if (!latestImage) {
      console.error('❌ Error: No timetable image found in MongoDB');
      console.log('Please upload a timetable image first using the web interface');
      return;
    }
    
    // Extract the image buffer
    let imageBuffer;
    if (Buffer.isBuffer(latestImage.image)) {
      imageBuffer = latestImage.image;
    } else if (latestImage.image.buffer && Buffer.isBuffer(latestImage.image.buffer)) {
      imageBuffer = latestImage.image.buffer;
    } else if (latestImage.image.data) {
      imageBuffer = latestImage.image.data;
    } else {
      try {
        imageBuffer = Buffer.from(latestImage.image);
      } catch (err) {
        console.error('❌ Error: Could not convert image to buffer');
        return;
      }
    }
    
    const mimeType = latestImage.contentType || 'image/jpeg';
    
    console.log(`📂 Retrieved timetable image from MongoDB (${imageBuffer.length} bytes)`);
    
    // Step 2: Process image with OCR
    console.log('🔍 OCR: Extracting text from image using Gemini API...');
    const processor = new GeminiProcessor();
    const extractedText = await processor.extractTextFromImageBuffer(imageBuffer, mimeType);
    console.log(`✅ OCR complete. Extracted ${extractedText.length} characters`);
    console.log(`📄 Sample text: ${extractedText.substring(0, 200)}...`);
    
    // Step 3: Parse the timetable text
    console.log('🧩 Parsing extracted text to structured timetable...');
    const timetableParser = new TimetableParser();
    const parsedTimetable = await timetableParser.parseText(extractedText);
    console.log('✅ Parsing complete. Days found:', Object.keys(parsedTimetable).join(', '));
    
    // Step 4: Show parsed timetable structure
    console.log('📋 PARSED TIMETABLE STRUCTURE:');
    console.log(JSON.stringify(parsedTimetable, null, 2));
    
    // Step 5: Calculate date range for the menu
    const now = new Date();
    
    // Set menu start date to the beginning of the current week (Sunday)
    const menuStartDate = new Date(now);
    menuStartDate.setDate(now.getDate() - now.getDay());
    menuStartDate.setHours(0, 0, 0, 0);
    
    // Set menu end date to the end of next week (Saturday)
    const menuEndDate = new Date(menuStartDate);
    menuEndDate.setDate(menuStartDate.getDate() + 13); // Two weeks
    menuEndDate.setHours(23, 59, 59, 999);
    
    console.log(`📅 MENU PERIOD: ${menuStartDate.toISOString()} to ${menuEndDate.toISOString()}`);
    
    // Step 6: Delete any existing meals for this menu period
    const deleteResult = await Meal.deleteMany({
      menuStartDate: { $gte: menuStartDate },
      menuEndDate: { $lte: menuEndDate }
    });
    
    console.log(`🗑️ Deleted meals: ${JSON.stringify(deleteResult)}`);
    
    // Step 7: Create and save meal documents
    console.log('💾 Saving meals to database...');
    
    // Format for proper case day names
    const formatDayName = (day) => {
      return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    };
    
    for (let [day, meals] of Object.entries(parsedTimetable)) {
      // Format day name correctly
      day = formatDayName(day);
      
      console.log(`🔄 Processing day: ${day}`);
      console.log(`📋 Meals data: ${JSON.stringify(meals, null, 2)}`);
      
      // Calculate the date for this day
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = dayOfWeek.indexOf(day);
      
      if (dayIndex === -1) {
        console.log(`⚠️ Warning: Skipping unknown day: ${day}`);
        continue;
      }
      
      const dayDate = new Date(menuStartDate);
      dayDate.setDate(menuStartDate.getDate() + dayIndex);
      
      // Ensure meals has the correct structure
      const formattedMeals = {
        breakfast: Array.isArray(meals.breakfast) ? meals.breakfast : [],
        lunch: Array.isArray(meals.lunch) ? meals.lunch : [],
        dinner: Array.isArray(meals.dinner) ? meals.dinner : []
      };
      
      // Create a new meal document
      const mealData = {
        menuStartDate,
        menuEndDate,
        day,
        dayDate,
        meals: formattedMeals
      };
      
      console.log(`📝 Saving meal document: ${JSON.stringify(mealData, null, 2)}`);
      
      try {
        const meal = new Meal(mealData);
        const savedMeal = await meal.save();
        console.log(`✅ Saved meal for ${day} with ID: ${savedMeal._id}`);
      } catch (error) {
        console.error(`❌ Error saving meal for ${day}:`, error);
      }
    }
    
    // Step 8: Verify meals were saved
    const savedMeals = await Meal.find({
      menuStartDate: menuStartDate,
      menuEndDate: menuEndDate
    });
    
    console.log(`🔍 VERIFICATION: Found ${savedMeals.length} saved meal documents`);
    for (const meal of savedMeals) {
      console.log(`📌 ${meal.day}: ${meal._id}`);
    }
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the test
console.log('🚀 Starting timetable processing test...');
connectDB().then(success => {
  if (success) {
    testTimetableSave().catch(err => {
      console.error('❌ Failed to run test:', err);
      mongoose.connection.close();
    });
  } else {
    console.error('❌ Cannot run test: Database connection failed');
  }
});

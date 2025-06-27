import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import GeminiProcessor from '../utils/geminiProcessor.js';
import TimetableParser from '../utils/timetableParser.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import axios from 'axios'; // Use axios instead of fetch for Node.js
import Meal from '../models/Meal.js'; // Import Meal model for saving timetable data

const router = express.Router();

// Configure multer for memory storage (not disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Allow only 1 file
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Import the MenuImage model (using dynamic import since we're in ESM)
const getMenuImageModel = async () => {
  try {
    return (await import('../models/MenuImage.js')).default;
  } catch (error) {
    console.error('Error importing MenuImage model:', error);
    throw error;
  }
};

// Upload a new timetable image route (admin only)
router.post('/upload', verifyToken, isAdmin, upload.single('timetable'), async (req, res) => {
  try {
    // Verify MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ MongoDB not connected');
      return res.status(503).json({ 
        success: false, 
        error: 'Database not available' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📸 TIMETABLE UPLOAD: Processing uploaded timetable image...`);
    console.log(`[${timestamp}] 📃 TIMETABLE DETAILS:`, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Get the MenuImage model
    const MenuImage = await getMenuImageModel();
    
    // Remove any existing timetable images
    await MenuImage.deleteMany({ filename: 'currenttimetable.jpeg' });
    
    // Create a new timetable image document
    const menuImage = new MenuImage({
      filename: 'currenttimetable.jpeg',
      image: req.file.buffer,
      contentType: req.file.mimetype
    });
    
    // Save the image to MongoDB
    const savedImage = await menuImage.save();
    
    console.log(`[${new Date().toISOString()}] 💾 MONGODB: Timetable image saved to MongoDB successfully`);
    
    if (!req.file.buffer || req.file.buffer.length === 0) {
      throw new Error('Image buffer is empty');
    }
    
    // Process the image buffer with Gemini API
    console.log(`[${new Date().toISOString()}] 🔍 OCR STARTED: Extracting text from image using Gemini API...`);
    const processor = new GeminiProcessor();
    const extractedText = await processor.extractTextFromImageBuffer(req.file.buffer, req.file.mimetype);
    console.log(`[${new Date().toISOString()}] ✅ OCR COMPLETED: Successfully extracted text from image`);
    console.log(`[${new Date().toISOString()}] 📄 SAMPLE TEXT: ${extractedText.substring(0, 200)}...`);
    
    // Parse the timetable text into structured data
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: Starting timetable data parsing...`);
    
    const timetableParser = new TimetableParser();
    console.log(`[${new Date().toISOString()}] 🧩 PARSING: Converting extracted text to structured timetable...`);
    const parsedTimetable = await timetableParser.parseText(extractedText);
    console.log(`[${new Date().toISOString()}] ✅ PARSING COMPLETED: Successfully parsed timetable structure`);
    
    // DONE: Timetable image uploaded and processed by admin.
    console.log(`[${new Date().toISOString()}] 🎯 FINAL RESULT: Timetable parsing complete`);
    console.log(`[${new Date().toISOString()}] 📋 PARSED TIMETABLE DATA:`);
    console.log(JSON.stringify(parsedTimetable, null, 2));
    
    // === SAVE TO MEALS COLLECTION ===
    console.log(`[${new Date().toISOString()}] 🗄️ SAVING: Storing parsed timetable data to Meals collection...`);
    console.log(`[${new Date().toISOString()}] 📋 PARSED STRUCTURE:`, typeof parsedTimetable, Object.keys(parsedTimetable));
    
    try {
      // Get the current date and parse the menu date range from the timetable
      // For this example, we'll use current date for the menu period (adjust as needed)
      const now = new Date();
      console.log(`[${new Date().toISOString()}] 🕒 CURRENT TIME:`, now.toISOString());
      
      // Set menu start date to the beginning of the current week (Sunday)
      const menuStartDate = new Date(now);
      menuStartDate.setDate(now.getDate() - now.getDay());
      menuStartDate.setHours(0, 0, 0, 0);
      
      // Set menu end date to the end of next week (Saturday)
      const menuEndDate = new Date(menuStartDate);
      menuEndDate.setDate(menuStartDate.getDate() + 13); // Two weeks
      menuEndDate.setHours(23, 59, 59, 999);
      
      console.log(`[${new Date().toISOString()}] 📅 MENU PERIOD: ${menuStartDate.toISOString()} to ${menuEndDate.toISOString()}`);
      
      // Delete any existing meals for this menu period to avoid duplicates
      const deleteResult = await Meal.deleteMany({
        menuStartDate: { $gte: menuStartDate },
        menuEndDate: { $lte: menuEndDate }
      });
      console.log(`[${new Date().toISOString()}] 🗑️ DELETED MEALS:`, deleteResult);
      
      // Create meal entries for each day in the parsed timetable
      const mealSavePromises = [];
      
      console.log(`[${new Date().toISOString()}] 🔄 STARTING MEAL SAVE PROCESS`);
      
      // Format for proper case day names
      const formatDayName = (day) => {
        return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      };
      
      // Convert to proper format if needed
      let formattedParsedTimetable = parsedTimetable;
      if (Object.keys(parsedTimetable).length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ WARNING: Empty parsedTimetable object`);
      } else {
        // Debug the structure
        console.log(`[${new Date().toISOString()}] 🔍 PARSED DAYS:`, Object.keys(parsedTimetable));
        console.log(`[${new Date().toISOString()}] 🔍 SAMPLE DAY:`, JSON.stringify(parsedTimetable[Object.keys(parsedTimetable)[0]], null, 2));
      }
      
      for (let [day, meals] of Object.entries(parsedTimetable)) {
        // Format day name to ensure proper case (Monday, not monday or MONDAY)
        day = formatDayName(day);
        
        console.log(`[${new Date().toISOString()}] 📝 PROCESSING DAY: ${day}`);
        console.log(`[${new Date().toISOString()}] 📝 MEALS DATA:`, JSON.stringify(meals, null, 2));
        
        // Calculate the date for this day of the week
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIndex = dayOfWeek.indexOf(day);
        
        if (dayIndex === -1) {
          console.log(`[${new Date().toISOString()}] ⚠️ WARNING: Skipping unknown day: ${day}`);
          continue;
        }
        
        // Calculate the date for this day
        const dayDate = new Date(menuStartDate);
        dayDate.setDate(menuStartDate.getDate() + dayIndex);
        
        // Ensure meals has the correct structure
        const formattedMeals = {
          breakfast: Array.isArray(meals.breakfast) ? meals.breakfast : [],
          lunch: Array.isArray(meals.lunch) ? meals.lunch : [],
          dinner: Array.isArray(meals.dinner) ? meals.dinner : []
        };
        
        if (!formattedMeals.breakfast.length && 
            !formattedMeals.lunch.length && 
            !formattedMeals.dinner.length) {
          console.log(`[${new Date().toISOString()}] ⚠️ WARNING: No meal data for ${day}, skipping`);  
          continue;
        }
        
        // Create a new meal document
        const mealData = {
          menuStartDate,
          menuEndDate,
          day,
          dayDate,
          meals: formattedMeals
        };
        
        console.log(`[${new Date().toISOString()}] 📋 MEAL DOCUMENT:`, JSON.stringify(mealData, null, 2));
        
        try {
          // Create and save the meal document directly without promises
          const meal = new Meal(mealData);
          const savedMeal = await meal.save();
          console.log(`[${new Date().toISOString()}] ✅ SAVED MEAL for ${day} with ID: ${savedMeal._id}`);
        } catch (saveError) {
          console.error(`[${new Date().toISOString()}] ❌ ERROR SAVING MEAL for ${day}:`, saveError.message);
        }
      }
      
      console.log(`[${new Date().toISOString()}] ✅ MEALS SAVED: Successfully saved parsed timetable to Meals collection`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ERROR SAVING MEALS: ${error.message}`);
    }

    // === NUTRITION EXTRACTION ===
    // Extract food items from parsedTimetable (flatten all meal/section arrays)
    let foodItems = [];
    if (parsedTimetable && typeof parsedTimetable === 'object') {
      for (const day of Object.values(parsedTimetable)) {
        if (day && typeof day === 'object') {
          for (const meal of Object.values(day)) {
            if (Array.isArray(meal)) {
              foodItems.push(...meal);
            }
          }
        }
      }
    }
    foodItems = [...new Set(foodItems.map(f => (f || '').trim()).filter(Boolean))];
    console.log(`[${new Date().toISOString()}] 🍽️ Extracted food items for nutrition:`, foodItems);
    let nutritionResult = null;
    if (foodItems.length > 0) {
      const { processAndStoreNutrition } = await import('../utils/nutritionPipeline.js');
      nutritionResult = await processAndStoreNutrition(foodItems);
      console.log(`[${new Date().toISOString()}] 🍽️ Nutrition extraction result:`, nutritionResult);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ No food items found for nutrition extraction.`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Timetable uploaded and parsed successfully',
      parsedTimetable,
      nutritionResult
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process image' 
    });
  }
});

// Get the current timetable image
router.get('/current', async (req, res) => {
  try {
    // Get the MenuImage model
    const MenuImage = await getMenuImageModel();
    
    // Find the latest timetable image
    const latestImage = await MenuImage.findOne({ filename: 'currenttimetable.jpeg' })
      .sort({ uploadedAt: -1 })
      .lean();
    
    if (!latestImage) {
      return res.status(404).json({ 
        success: false, 
        error: 'Timetable image not found' 
      });
    }
    
    // Set the appropriate content type
    res.setHeader('Content-Type', latestImage.contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Fix for Buffer handling - MongoDB stores the buffer data directly
    // The correct way to access it depends on how it's stored
    if (!latestImage.image) {
      return res.status(404).json({ success: false, error: 'Image data not found' });
    }
    
    // If image is already a Buffer
    if (Buffer.isBuffer(latestImage.image)) {
      return res.send(latestImage.image);
    }
    
    // If image has a buffer property (as returned by .lean())
    if (latestImage.image.buffer && Buffer.isBuffer(latestImage.image.buffer)) {
      return res.send(latestImage.image.buffer);
    }
    
    // If image is stored as Binary data
    if (latestImage.image.data) {
      return res.send(latestImage.image.data);
    }
    
    // Last resort - try to convert to buffer if it's another format
    try {
      const buffer = Buffer.from(latestImage.image);
      return res.send(buffer);
    } catch (err) {
      console.error('Error converting image to buffer:', err);
      return res.status(500).json({ success: false, error: 'Invalid image data format' });
    }
  } catch (error) {
    console.error('Error retrieving timetable image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to retrieve timetable image' 
    });
  }
});

export default router;

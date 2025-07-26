import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import GeminiProcessor from './utils/geminiProcessor.js';
import { findBestNutritionixMatch } from './utils/nutritionixSearch.js';
import { processAndStoreNutrition } from './utils/nutritionPipeline.js';
import TimetableParser from './utils/timetableParser.js';
import moment from 'moment-timezone';
import { verifyToken, isAdmin } from './middleware/auth.js';
import mongoose from 'mongoose';
import Meal from './models/Meal.js';

// MongoDB connection will be handled in startServer()

/**
 * Extract food items from text
 * @param {string} text - Raw text from the timetable
 * @returns {Array<string>} - Array of unique food items
 */
function extractFoodItems(text) {
  if (!text) return [];
  
  // Split by common delimiters and clean up
  const items = text
    .split(/[\n\r,;|]+/)
    .map(item => item.trim())
    .filter(item => {
      // Filter out empty strings and very short items
      if (!item || item.length < 3) return false;
      
      // Filter out common non-food items
      const nonFoodTerms = [
        'breakfast', 'lunch', 'dinner', 'meal', 'day', 'monday', 'tuesday', 
        'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'time', 'menu'
      ];
      
      const lowerItem = item.toLowerCase();
      return !nonFoodTerms.some(term => lowerItem.includes(term));
    });
  
  // Remove duplicates
  return [...new Set(items)];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if(!origin) return callback(null, true);
    
    // Define allowed origins with exact matching
    const allowedOrigins = [
      'http://localhost:3000',              // Local development
      'https://yourfitnesspal.vercel.app',  // Production frontend
      'https://yourfitnesspal-git-branch3-goku1301s-projects.vercel.app', // Branch3 frontend
      'https://yourfitnesspal.onrender.com', // Render deployment
      'https://yourfitnesspal-git-render-goku1301s-projects.vercel.app', // Vercel preview (render branch)
    ];
    
    // Add environment-specific frontend URL if set
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    // For debugging
    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if(allowedOrigins.includes(origin) || !origin) {
      // Set the specific origin as allowed rather than '*'
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Log info about MongoDB-based image storage
console.log('Using MongoDB for timetable image storage');

// Redirect legacy timetable image route to MongoDB-based endpoint
app.get('/timetable-image', (req, res) => {
  console.log('Legacy timetable image route accessed, redirecting to MongoDB endpoint');
  res.redirect('/api/timetable/current');
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API routes
import timetableRoutes from './routes/timetable.js';
import authRoutes from './routes/auth.js';

app.use('/api/timetable', timetableRoutes);
app.use('/api/auth', authRoutes);

/**
 * Save or update a meal plan
 */
app.post('/api/meals', verifyToken, isAdmin, async (req, res) => {
  try {
    const { menuStartDate, menuEndDate, day, dayDate, meals } = req.body;

    // Validate required fields
    if (!menuStartDate || !menuEndDate || !day || !dayDate || !meals) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: menuStartDate, menuEndDate, day, dayDate, and meals are required'
      });
    }

    // Check if a meal plan already exists for this day and date range
    const existingMeal = await Meal.findOne({
      day,
      menuStartDate: new Date(menuStartDate),
      menuEndDate: new Date(menuEndDate)
    });

    let savedMeal;

    if (existingMeal) {
      // Update existing meal plan
      existingMeal.meals = meals;
      existingMeal.updatedAt = new Date();
      savedMeal = await existingMeal.save();
    } else {
      // Create new meal plan
      const newMeal = new Meal({
        menuStartDate: new Date(menuStartDate),
        menuEndDate: new Date(menuEndDate),
        day,
        dayDate: new Date(dayDate),
        meals
      });
      savedMeal = await newMeal.save();
    }

    res.status(200).json({
      success: true,
      message: 'Meal plan saved successfully',
      data: savedMeal
    });
  } catch (error) {
    console.error('Error saving meal plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save meal plan'
    });
  }
});

/**
 * Get next meal information regardless of current time
 * 
 * This route always returns the next meal whether it's currently meal time or time between meals
 * If it's Sunday dinner and the next week's timetable isn't uploaded, it falls back to using
 * Monday breakfast from the previous week as the next meal
 */
app.get('/api/meals/next', async (req, res) => {
  const requestId = Math.random().toString(36).substring(2, 8);
  const log = (...args) => console.log(`[${requestId}]`, ...args);
  
  log('=== Next Meal Request ===');
  
  try {
    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDayIndex];
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    log(`Current time: ${now.toISOString()}, Day: ${currentDay}, Time: ${hours}:${minutes}`);
    
    // Define meal times (in minutes since midnight)
    const isWeekend = currentDayIndex === 0 || currentDayIndex === 6;
    const breakfastStart = 7 * 60;                           // 7:00 AM
    const breakfastEnd = isWeekend ? 9.5 * 60 : 9 * 60;      // 9:30 AM on weekends, 9:00 AM on weekdays
    const lunchStart = 12 * 60;                              // 12:00 PM
    const lunchEnd = isWeekend ? 14.5 * 60 : 14 * 60;        // 2:30 PM on weekends, 2:00 PM on weekdays
    const dinnerStart = 19.5 * 60;                           // 7:30 PM
    const dinnerEnd = 21.5 * 60;                             // 9:30 PM
    
    // Determine next meal
    let nextMealType, nextMealTime, nextMealDay, nextMealDate;
    
    // If it's before breakfast end time, next meal is lunch
    if (currentTime < breakfastEnd) {
      nextMealType = 'lunch';
      nextMealTime = '12:00 PM';
      nextMealDay = currentDay;
      nextMealDate = now;
    } 
    // If it's between breakfast and lunch, next meal is lunch
    else if (currentTime < lunchStart) {
      nextMealType = 'lunch';
      nextMealTime = '12:00 PM';
      nextMealDay = currentDay;
      nextMealDate = now;
    } 
    // If it's lunch time, next meal is dinner
    else if (currentTime < lunchEnd) {
      nextMealType = 'dinner';
      nextMealTime = '7:30 PM';
      nextMealDay = currentDay;
      nextMealDate = now;
    } 
    // If it's between lunch and dinner, next meal is dinner
    else if (currentTime < dinnerStart) {
      nextMealType = 'dinner';
      nextMealTime = '7:30 PM';
      nextMealDay = currentDay;
      nextMealDate = now;
    } 
    // If it's dinner time or after, next meal is breakfast tomorrow
    else {
      nextMealType = 'breakfast';
      nextMealTime = '7:00 AM';
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      nextMealDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][tomorrow.getDay()];
      nextMealDate = tomorrow;
    }
    
    // Format date as YYYY-MM-DD for database query
    const dateString = nextMealDate.toISOString().split('T')[0];
    
    log(`Looking for ${nextMealDay} ${nextMealType} for date ${dateString}`);
    
    // Find the meal in the database by day only, ignoring date constraints
    // Get the most recent entry for the specified day
    let meal = await Meal.findOne({
      day: nextMealDay.toLowerCase()
    }).sort({ menuStartDate: -1 }); // Sort by most recent menu start date
    
    if (meal) {
      log(`Found meal data for ${nextMealDay}`);
    } else {
      log(`No meal found for ${nextMealDay}`);
    }
    
    // Special case: Sunday dinner to Monday breakfast transition when next week's timetable isn't available
    if (!meal && currentDayIndex === 0 && nextMealDay.toLowerCase() === 'monday') {
      log('No meal plan found for next Monday. Trying to find previous week Monday breakfast as fallback.');
      
      // Get last week's Monday date
      const lastMonday = new Date(nextMealDate);
      lastMonday.setDate(lastMonday.getDate() - 7); // Go back one week
      
      // Try to find the previous week's Monday menu
      meal = await Meal.findOne({
        day: 'monday',
        menuStartDate: { $lte: lastMonday },
        menuEndDate: { $gte: lastMonday }
      });
      
      if (meal) {
        log('Found previous week\'s Monday menu as fallback');
      }
    }
    
    if (!meal) {
      log('No meal plan found for next meal');
      return res.status(404).json({
        status: 'success',
        message: 'No meal plan found for next meal',
        data: {
          mealType: nextMealType,
          mealTime: nextMealTime,
          mealDay: nextMealDay,
          mealDate: dateString,
          items: []
        }
      });
    }
    
    // Get the items for the next meal
    const mealItems = meal.meals.find(m => m.mealType === nextMealType)?.items || [];
    
    log(`Found ${mealItems.length} items for next meal (${nextMealType})`);
    
    res.status(200).json({
      status: 'success',
      data: {
        mealType: nextMealType,
        mealTime: nextMealTime,
        mealDay: nextMealDay,
        mealDate: dateString,
        items: mealItems,
        isFallbackData: meal.menuEndDate < now && nextMealDay.toLowerCase() === 'monday'
      }
    });
    
  } catch (error) {
    console.error('Error getting next meal:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get next meal information',
      error: error.message
    });
  }
});

/**
 * Get current meal items based on day and time
 */
app.get('/api/meals/current', async (req, res) => {
  const requestId = Math.random().toString(36).substring(2, 8);
  const log = (...args) => console.log(`[${requestId}]`, ...args);
  
  log('=== New Request ===');
  // log('Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    // Use IST timezone for consistent behavior in local and deployed environments
    const now = moment().tz('Asia/Kolkata');
    const day = now.format('dddd').toLowerCase(); // 'sunday', 'monday', etc.
    const hours = now.hours();
    const minutes = now.minutes();
    
    // Calculate current time in minutes since midnight
    const currentTime = hours * 60 + minutes;
    
    log(`Current time (IST): ${now.format()}, Day: ${day}, Time: ${hours}:${minutes}`);
    
    // Define meal times (in minutes since midnight)
    const isSunday = day === 'sunday'; // Use the day string directly instead of getDay()
    const breakfastStart = 7 * 60; // 7:00 AM for all days
    const breakfastEnd = isSunday ? 9.5 * 60 : 9 * 60;      // 9:30 AM Sunday, 9:00 AM Mon-Sat
    const lunchStart = 12 * 60;                             // 12:00 PM all days
    const lunchEnd = isSunday ? 14.5 * 60 : 14 * 60;        // 2:30 PM Sunday, 2:00 PM Mon-Sat
    const dinnerStart = 19.5 * 60;                          // 7:30 PM all days
    const dinnerEnd = 21.5 * 60;                            // 9:30 PM all days
    
    // Format times for logging
    const formatTime = (mins) => `${Math.floor(mins/60)}:${mins%60 < 10 ? '0' + mins%60 : mins%60}`;
    
    log('Meal times:', JSON.stringify({
      isSunday,
      breakfastStart: formatTime(breakfastStart),
      breakfastEnd: formatTime(breakfastEnd),
      lunchStart: formatTime(lunchStart),
      lunchEnd: formatTime(lunchEnd),
      dinnerStart: formatTime(dinnerStart),
      dinnerEnd: formatTime(dinnerEnd),
      currentTime: formatTime(currentTime)
    }, null, 2));
    
    // --- Enhanced logic for next meal and next day rollover ---
    const mealOrder = ['breakfast', 'lunch', 'dinner'];
    let mealType = null;
    let nextMealType = null;
    let nextMealTime = null;
    let nextMealDay = day;

    log('Determining meal type...');
    if (currentTime >= breakfastStart && currentTime < breakfastEnd) {
      mealType = 'breakfast';
      nextMealType = 'lunch';
      nextMealTime = '12:00';
      nextMealDay = day;
      log('Meal determined: Breakfast (current)');
    } else if (currentTime >= lunchStart && currentTime < lunchEnd) {
      mealType = 'lunch';
      nextMealType = 'dinner';
      nextMealTime = '19:30';
      nextMealDay = day;
      log('Meal determined: Lunch (current)');
    } else if (currentTime >= dinnerStart && currentTime < dinnerEnd) {
      mealType = 'dinner';
      nextMealType = 'breakfast';
      nextMealTime = '07:00'; // breakfast always starts at 7:00 AM
      // Next meal is on the next day
      const daysOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const todayIdx = daysOfWeek.indexOf(day.toLowerCase());
      nextMealDay = daysOfWeek[(todayIdx + 1) % 7];
      log('Meal determined: Dinner (current)');
    } else if (currentTime < breakfastStart) {
      // Before breakfast
      mealType = null;
      nextMealType = 'breakfast';
      nextMealTime = '07:00';
      nextMealDay = day;
      log('No current meal. Next meal: Breakfast at 07:00');
    } else if (currentTime >= breakfastEnd && currentTime < lunchStart) {
      // Between breakfast and lunch
      mealType = null;
      nextMealType = 'lunch';
      nextMealTime = '12:00';
      nextMealDay = day;
      log('No current meal. Next meal: Lunch at 12:00');
    } else if (currentTime >= lunchEnd && currentTime < dinnerStart) {
      // Between lunch and dinner
      mealType = null;
      nextMealType = 'dinner';
      nextMealTime = '19:30';
      nextMealDay = day;
      log('No current meal. Next meal: Dinner at 19:30');
    } else {
      // After dinner time, next meal is tomorrow's breakfast
      mealType = null;
      nextMealType = 'breakfast';
      nextMealTime = '07:00';
      const daysOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const todayIdx = daysOfWeek.indexOf(day.toLowerCase());
      nextMealDay = daysOfWeek[(todayIdx + 1) % 7];
      log('No current meal. Next meal: Breakfast at 07:00 (next day)');
    }

    log(`Final meal type: ${mealType}`);
    log(`Next meal: ${nextMealType} at ${nextMealTime} on ${nextMealDay}`);
    log(`Current time: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`);
    log(`Current time in minutes: ${currentTime}`);
    console.log("Devansh is saying current meal is ", mealType);

    // --- End enhanced logic ---

    // Find the most recent menu that includes today (in IST)
    const today = moment().tz('Asia/Kolkata').startOf('day').toDate();
    
    const queryDay = day.charAt(0).toUpperCase() + day.slice(1);
    log(`Querying database for menu on ${queryDay}...`);
    
    // Find the most recent menu period that includes today
    const menuPeriod = await Meal.findOne({
      menuStartDate: { $lte: today },
      menuEndDate: { $gte: today }
    }).sort({ menuStartDate: -1 });
    
    if (!menuPeriod) {
      log('No active menu period found');
      const response = {
        status: 'success',
        data: {
          currentMeal: null,
          message: 'No active menu period found'
        }
      };
      console.log('[api/meals/current] Response:', JSON.stringify(response, null, 2));
      return res.status(404).json(response);
    }
    
    console.log('Looking for meals with day:', queryDay);
    console.log('Current date:', today);
    
    // Find today's meal - get the most recent entry by day only
    // Using queryDay (properly capitalized) instead of day
    // And NOT filtering by menuPeriod dates to ensure we find something
    let meal = await Meal.findOne({
      day: queryDay  // Use the correctly capitalized day name that matches the enum
    }).sort({ menuStartDate: -1 }); // Sort by most recent menu start date
    console.log('[api/meals/current] Raw DB meal result:', JSON.stringify(meal, null, 2));
    log('Database query:', {
      day: day.toLowerCase(),
      sort: "menuStartDate: descending"
    });
    
    if (meal) {
      log(`Found meal data for ${day}`);
    } else {
      log(`No meal found for ${day}`);
    }
    
    if (!meal) {
      log(`No menu found for ${queryDay} in the current menu period`);
      const response = {
        status: 'success',
        data: {
          currentMeal: null,
          message: `No menu found for ${queryDay}`
        }
      };
      console.log('[api/meals/current] Response:', JSON.stringify(response, null, 2));
      return res.status(404).json(response);
    }
    
    log(`Found menu with ${meal.meals ? Object.keys(meal.meals).length : 0} meal types`);
    
    // Log available meal types in the menu
    if (meal.meals) {
      Object.entries(meal.meals).forEach(([type, items]) => {
        log(`- ${type}: ${items.length} items`);
      });
    }
    
    // --- Prepare next meal document and items ---
    let nextMealDoc = meal;
    if (nextMealDay !== day) {
      // Query for the next day's meal document
      const nextDayQuery = nextMealDay.charAt(0).toUpperCase() + nextMealDay.slice(1);
      nextMealDoc = await Meal.findOne({ day: nextDayQuery }).sort({ menuStartDate: -1 });
      log(`Looking for next day meal: ${nextDayQuery}, found: ${nextMealDoc ? 'yes' : 'no'}`);
    }
    
    // Handle case where next day's meal document isn't found
    let nextMealItems = [];
    if (nextMealDoc && nextMealDoc.meals && nextMealDoc.meals[nextMealType]) {
      nextMealItems = nextMealDoc.meals[nextMealType];
      log(`Found ${nextMealItems.length} items for next meal (${nextMealType}) on ${nextMealDay}`);
    } else {
      log(`No menu items found for ${nextMealType} on ${nextMealDay}`);
    }

    // --- Prepare response ---
    const response = {
      status: 'success',
      data: {
        currentMeal: mealType ? {
          type: mealType,
          items: meal.meals[mealType] || []
        } : null,
        nextMeal: {
          type: nextMealType,
          time: nextMealTime,
          day: nextMealDay,
          items: nextMealItems
        },
        day: day,
        currentTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }
    };
    
    log('Sending response:', JSON.stringify(response, null, 2));
    console.log('[api/meals/current] Response:', JSON.stringify(response, null, 2));
    return res.json(response);
  } catch (error) {
    console.error('Error fetching current meal:', error);
    const response = {
      status: 'error',
      message: 'Failed to fetch current meal',
      error: error.message
    };
    console.log('[api/meals/current] Response:', JSON.stringify(response, null, 2));
    return res.status(500).json(response);
  }
});

/**
 * Get nutrition data for specific food items
 */
app.get('/api/nutrition', async (req, res) => {
  console.log('==========================================');
  console.log('BASIC LOG: Entered /api/nutrition route handler');
  console.log('BASIC LOG: Query params:', req.query);
  
  try {
    console.log('Handling /api/nutrition request with query:', req.query);
    const { items } = req.query;
    console.log('Items received:', items);
    
    if (!items) {
      return res.status(400).json({
        success: false,
        message: 'No food items specified. Please provide comma-separated items in the query parameter.'
      });
    }
    
    // Parse the comma-separated food items
    const foodItems = items.split(',').map(item => item.trim()).filter(Boolean);
    
    if (foodItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid food items provided.'
      });
    }
    
    // Import the Nutrition model
    let Nutrition;
    try {
      // Check if model is already registered
      Nutrition = mongoose.model('Nutrition');
      console.log('Nutrition model retrieved successfully');
    } catch (modelError) {
      console.error('Error getting Nutrition model:', modelError.message);
      
      // Define the model if it doesn't exist
      console.log('Attempting to define Nutrition model...');
      const nutritionSchema = new mongoose.Schema({
        name: String,
        aliases: [String],
        category: String,
        servings: [{
          size: String,
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number
        }]
      });
      
      Nutrition = mongoose.model('Nutrition', nutritionSchema);
      console.log('Nutrition model defined successfully');
    }
    
    // Log all collections in the database
    console.log('Available collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(collection => console.log('- ' + collection.name));
    
    // Count documents in the Nutrition collection
    const count = await Nutrition.countDocuments();
    console.log(`Total documents in Nutrition collection: ${count}`);
    
    // Get a sample document to verify structure
    const sampleDoc = await Nutrition.findOne();
    console.log('Sample nutrition document:', JSON.stringify(sampleDoc, null, 2));
    
    // Find nutrition data for each food item
    const nutritionData = {};
    
    for (const item of foodItems) {
      console.log(`Searching for nutrition data for item: "${item}"`);
      
      // Create the query
      const query = {
        $or: [
          { name: { $regex: new RegExp('^' + item + '$', 'i') } },
          { aliases: { $elemMatch: { $regex: new RegExp('^' + item + '$', 'i') } } }
        ]
      };
      
      console.log('Query:', JSON.stringify(query));
      
      // Try a more flexible search first to see what's available
      const similarItems = await Nutrition.find({ 
        $or: [
          { name: { $regex: new RegExp(item, 'i') } },
          { aliases: { $elemMatch: { $regex: new RegExp(item, 'i') } } }
        ]
      }).limit(5);
      
      if (similarItems.length > 0) {
        console.log(`Found ${similarItems.length} similar items:`);
        similarItems.forEach(doc => console.log(`- ${doc.name}`));
      } else {
        console.log('No similar items found');
      }
      
      // Execute the exact match query
      const result = await Nutrition.findOne(query);
      
      if (result) {
        console.log(`Found exact match for "${item}": ${result.name}`);
        nutritionData[item] = result;
      } else {
        console.log(`No exact match found for "${item}"`);
        nutritionData[item] = null;
      }
    }
    
    res.status(200).json({
      success: true,
      data: nutritionData
    });
  } catch (error) {
    console.error('Error fetching nutrition data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutrition data',
      error: error.message
    });
  }
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message || 'Server error' });
});

// Get MenuImage model
const getMenuImageModel = async () => {
  return (await import('./models/MenuImage.js')).default;
};

// Configure multer for memory storage (for MongoDB)
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

// Legacy route for backward compatibility
// Redirects to the new timetable upload endpoint
app.post('/api/timetable/upload', isAdmin, upload.single('image'), async (req, res) => {
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
    
    // Save the extracted text to a MongoDB document if needed in the future
    // For now we just log it
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: Starting timetable data parsing...`);
    
    // Parse the timetable text into structured data
    const timetableParser = new TimetableParser();
    console.log(`[${new Date().toISOString()}] 🧩 PARSING: Converting extracted text to structured timetable...`);
    const parsedTimetable = await timetableParser.parseText(extractedText);
    console.log(`[${new Date().toISOString()}] ✅ PARSING COMPLETED: Successfully parsed timetable structure`);
    
    // DONE: Timetable image uploaded and processed by admin.
    // Only log the parsed timetable, do not save or process further.
    console.log(`[${new Date().toISOString()}] 🎯 FINAL RESULT: Timetable parsing complete`);
    console.log(`[${new Date().toISOString()}] 📋 PARSED TIMETABLE DATA:`);
    console.log(JSON.stringify(parsedTimetable, null, 2));
    res.status(200).json({
      success: true,
      message: 'Timetable uploaded and parsed successfully',
      parsedTimetable
    });
    // END of handler. No further processing.
  } catch (error) {
    console.error('❌ Error in timetable upload:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process timetable' 
    });
  }
});

// Meal plans endpoint removed - functionality moved to dedicated routes

const PORT = process.env.PORT || 5000;

// Listen on all network interfaces for mobile access
const HOST = '0.0.0.0';

async function startServer() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000 // 10 seconds timeout
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('   Database name:', mongoose.connection.name);
    console.log('   Database host:', mongoose.connection.host);
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API URL: http://localhost:${PORT}/api`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

const GeminiProcessor = require('./utils/geminiProcessor');
const TimetableParser = require('./utils/timetableParser');
const mongoose = require('mongoose');
const Meal = require('./models/Meal');
require('dotenv').config();

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    // Simple validation
    if (!mongoUri.startsWith('mongodb+srv://') && !mongoUri.startsWith('mongodb://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb+srv:// or mongodb://');
    }

    // Connect directly with the URI from .env
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function saveMealsToMongoDB(meals, menuDates) {
  try {
    const { startDate, endDate } = menuDates;
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Process each day's meals one by one to avoid parallel array issues
    const savedMeals = [];
    
    for (const [day, dayMeals] of Object.entries(meals)) {
      try {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + daysOfWeek.indexOf(day));
        
        // Prepare the update object
        const updateData = {
          $set: {
            dayDate: dayDate,
            'meals': {
              breakfast: Array.isArray(dayMeals.breakfast) ? dayMeals.breakfast : [],
              lunch: Array.isArray(dayMeals.lunch) ? dayMeals.lunch : [],
              dinner: Array.isArray(dayMeals.dinner) ? dayMeals.dinner : []
            },
            updatedAt: new Date()
          },
          $setOnInsert: {
            menuStartDate: startDate,
            menuEndDate: endDate,
            day: day,
            createdAt: new Date()
          }
        };
        
        // Update or insert the document
        const result = await Meal.findOneAndUpdate(
          {
            day: day,
            menuStartDate: startDate,
            menuEndDate: endDate
          },
          updateData,
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
          }
        );
        
        savedMeals.push(result);
        console.log(`Processed ${day}'s meals`);
        
      } catch (error) {
        console.error(`Error processing ${day}'s meals:`, error.message);
        throw error; // Re-throw to be caught by the outer try-catch
      }
    }
    
    // Fetch and log all saved meals for the period
    const allSavedMeals = await Meal.find({
      menuStartDate: startDate,
      menuEndDate: endDate
    }).sort({ dayDate: 1 });
    
    console.log('\nAll saved meals:');
    allSavedMeals.forEach(doc => {
      console.log(`\n${doc.day} (${doc.dayDate.toLocaleDateString()}):`);
      console.log('  Breakfast:', doc.meals.breakfast.join(', '));
      console.log('  Lunch:', doc.meals.lunch.join(', '));
      console.log('  Dinner:', doc.meals.dinner.join(', '));
    });
    
    return allSavedMeals;
  } catch (error) {
    console.error('Error saving meals to MongoDB:', error);
    throw error;
  }
}

async function extractAndProcessTimetable(imagePath, options = {}) {
  try {
    // Process image with Gemini
    console.log('Starting timetable extraction process...');
    const geminiProcessor = new GeminiProcessor();
    const { text, filePath } = await geminiProcessor.processTimetableImage(imagePath);
    
    console.log('\nExtracted text from image:');
    console.log('-'.repeat(50));
    console.log(text);
    console.log('-'.repeat(50));

    // Parse the extracted text
    console.log('\nParsing timetable data...');
    const parser = new TimetableParser();
    const parsedData = await parser.parseText(text);
    
    console.log('\nParsed timetable data:');
    console.log(JSON.stringify(parsedData, null, 2));
    
    // Extract menu dates from the text or use default dates
    const menuDates = extractMenuDates(text) || {
      startDate: new Date(), // Default to current week
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // One week from now
    };
    
    // Validate parsed data
    const validationResults = parser.validateParsedData(parsedData);
    console.log('\nValidation results:');
    console.log(JSON.stringify(validationResults, null, 2));

    // Save to MongoDB if requested
    if (options.saveToMongoDB) {
      console.log('\nSaving to MongoDB...');
      await connectToDatabase();
      await saveMealsToMongoDB(parsedData, menuDates);
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }

    return { text, parsedData, validationResults, menuDates };
  } catch (error) {
    console.error('Error in extractAndProcessTimetable:', error);
    throw error;
  }
}

// Helper function to extract menu dates from text
function extractMenuDates(text) {
  try {
    // Look for date pattern like "Menu (12.05.25 TO 18.05.25)"
    const datePattern = /Menu\s*\((\d{2}\.\d{2}\.\d{2})\s*TO\s*(\d{2}\.\d{2}\.\d{2})\)/i;
    const match = text.match(datePattern);
    
    if (match) {
      const [_, startDateStr, endDateStr] = match;
      
      // Parse dates (assuming format DD.MM.YY)
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split('.');
        return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
      };
      
      return {
        startDate: parseDate(startDateStr),
        endDate: parseDate(endDateStr)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing menu dates:', error);
    return null;
  }
}

// Handle command line arguments
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node extract-timetable-gemini.js [image-path] [--save]');
    console.log('Options:');
    console.log('  image-path  Path to the timetable image (default: images/timetable.jpg)');
    console.log('  --save      Save the extracted data to MongoDB');
    process.exit(1);
  }

  // Use provided image path or default to images/timetable.jpg
  const imagePath = args[0].startsWith('--') ? 'images/timetable.jpg' : args[0];
  const saveToMongoDB = args.includes('--save');

  try {
    await extractAndProcessTimetable(imagePath, { saveToMongoDB });
    console.log('\nTimetable extraction completed successfully!');
  } catch (error) {
    console.error('\nTimetable extraction failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  extractAndProcessTimetable,
  connectToDatabase,
  saveMealsToMongoDB
};

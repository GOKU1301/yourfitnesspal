const fs = require('fs');
const path = require('path');
const { createWorker, createScheduler } = require('tesseract.js');
const Meal = require('../models/Meal');

/**
 * Parse timetable image and extract meal information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.parseTimetable = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No timetable image uploaded' });
    }

    console.log('Processing timetable image:', req.file.path);

    // Create Tesseract worker for OCR
    const scheduler = createScheduler();
    const worker = await createWorker('eng');
    scheduler.addWorker(worker);

    // Process the image with Tesseract
    const { data: { text } } = await worker.recognize(req.file.path);
    console.log('Raw OCR output:', text);

    // Parse the extracted text
    const timetableData = parseTimetableText(text);
    console.log('Parsed timetable data:', JSON.stringify(timetableData, null, 2));

    // Terminate worker
    await scheduler.terminate();

    // Save the parsed data to MongoDB (optional at this stage)
    // await saveTimetableToDatabase(timetableData);

    // Return the parsed data
    return res.status(200).json({
      success: true,
      data: timetableData
    });

  } catch (error) {
    console.error('Error parsing timetable:', error);
    return res.status(500).json({
      error: 'Failed to parse timetable',
      details: error.message
    });
  }
};

/**
 * Parse the raw OCR text into structured timetable data
 * @param {string} text - Raw OCR text
 * @returns {Object} Structured timetable data
 */
function parseTimetableText(text) {
  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize result object
  const result = {};
  
  // Find the header line to determine column positions
  const headerIndex = lines.findIndex(line => 
    line.includes('Breakfast') && line.includes('Lunch') && line.includes('Dinner'));
  
  if (headerIndex === -1) {
    console.warn('Could not find header line in timetable');
    return {};
  }
  
  // Process each day's data
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Try to extract day information
    const dayMatch = line.match(/^([A-Za-z]+)/);
    if (!dayMatch) continue;
    
    const day = dayMatch[1];
    
    // Check if we have the next few lines for meals
    if (i + 2 < lines.length) {
      // Extract meal information
      // This is a simplified approach - in reality, we need more robust parsing
      const dayLine = line;
      const breakfastLine = lines[i + 1] || '';
      const lunchLine = lines[i + 2] || '';
      const dinnerLine = lines[i + 3] || '';
      
      // Parse food items (comma-separated)
      const breakfastItems = extractFoodItems(breakfastLine);
      const lunchItems = extractFoodItems(lunchLine);
      const dinnerItems = extractFoodItems(dinnerLine);
      
      // Store in result dictionary
      result[day] = {
        breakfast: breakfastItems,
        lunch: lunchItems,
        dinner: dinnerItems
      };
      
      // Skip processed lines
      i += 3;
    }
  }
  
  // If the simple parsing didn't work, try an alternative approach
  if (Object.keys(result).length === 0) {
    return parseAlternative(text);
  }
  
  return result;
}

/**
 * Alternative parsing method for timetable text
 * @param {string} text - Raw OCR text
 * @returns {Object} Structured timetable data
 */
function parseAlternative(text) {
  const result = {};
  
  // Regular expressions to identify days and meals
  const dayRegex = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
  
  // Split by day mentions
  const dayMatches = [...text.matchAll(new RegExp(dayRegex, 'gi'))];
  
  for (let i = 0; i < dayMatches.length; i++) {
    const dayMatch = dayMatches[i];
    const day = dayMatch[0];
    
    // Get text until next day or end
    const startPos = dayMatch.index;
    const endPos = (i < dayMatches.length - 1) ? dayMatches[i + 1].index : text.length;
    const dayText = text.substring(startPos, endPos);
    
    // Try to identify meals
    // This is a very simplified approach - in reality, we need more robust parsing
    const breakfastMatch = dayText.match(/Breakfast[^a-zA-Z]+(.*?)(?:Lunch|$)/s);
    const lunchMatch = dayText.match(/Lunch[^a-zA-Z]+(.*?)(?:Dinner|$)/s);
    const dinnerMatch = dayText.match(/Dinner[^a-zA-Z]+(.*?)(?:$)/s);
    
    const breakfast = breakfastMatch ? breakfastMatch[1].trim() : '';
    const lunch = lunchMatch ? lunchMatch[1].trim() : '';
    const dinner = dinnerMatch ? dinnerMatch[1].trim() : '';
    
    result[day] = {
      breakfast: extractFoodItems(breakfast),
      lunch: extractFoodItems(lunch),
      dinner: extractFoodItems(dinner)
    };
  }
  
  return result;
}

/**
 * Extract food items from a comma-separated text
 * @param {string} text - Text containing food items
 * @returns {Array} Array of food items
 */
function extractFoodItems(text) {
  if (!text) return [];
  
  // Split by commas and clean up
  return text.split(',')
    .map(item => item.trim())
    .filter(item => item !== '' && !item.match(/^\d+\.\d+\.\d+$/)); // Filter out dates
}

/**
 * Save timetable data to MongoDB
 * @param {Object} timetableData - Parsed timetable data
 */
async function saveTimetableToDatabase(timetableData) {
  try {
    // For each day in the timetable
    for (const [day, meals] of Object.entries(timetableData)) {
      // For each meal type (breakfast, lunch, dinner)
      for (const [mealType, foodItems] of Object.entries(meals)) {
        // Create or update meal document
        await Meal.findOneAndUpdate(
          { day, mealType },
          { 
            day,
            mealType,
            foodItems,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
    
    console.log('Timetable data saved to database');
  } catch (error) {
    console.error('Error saving timetable to database:', error);
    throw error;
  }
}

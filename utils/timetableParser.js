const { createWorker, createScheduler } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

/**
 * TimetableParser class for extracting meal information from timetable images
 */
class TimetableParser {
  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Parse a timetable image and extract meal information
   * @param {string} imagePath - Path to the timetable image
   * @returns {Promise<Object>} - Parsed timetable data
   */
  async parseImage(imagePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`File not found: ${imagePath}`);
      }

      if (this.debug) {
        console.log(`Processing timetable image: ${imagePath}`);
      }

      // Create Tesseract worker with non-SIMD options
      const worker = await createWorker({
        logger: this.debug ? console.log : () => {},
        errorHandler: e => console.error(e),
        workerPath: require('tesseract.js/dist/worker.min.js').workerPath,
        corePath: require('tesseract.js-core').workerBlobURL,
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });

      // Recognize text from image
      if (this.debug) {
        console.log('Starting OCR processing...');
      }
      
      const { data: { text } } = await worker.recognize(imagePath);
      
      if (this.debug) {
        console.log('\nRaw OCR output:');
        console.log('-'.repeat(50));
        console.log(text);
        console.log('-'.repeat(50));
      }

      // Parse the extracted text into structured data
      const timetableData = this.parseText(text);
      
      if (this.debug) {
        console.log('\nParsed timetable data:');
        console.log(JSON.stringify(timetableData, null, 2));
      }

      // Terminate worker
      await worker.terminate();

      return timetableData;
    } catch (error) {
      console.error('Error parsing timetable:', error);
      throw error;
    }
  }

  /**
   * Parse OCR text into structured meal data
   * @param {string} text - OCR text from timetable image
   * @returns {Object} - Structured timetable data
   */
  parseText(text) {
    // Split text into lines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Initialize result object
    const result = {};
    
    // Find the header line that contains "Breakfast", "Lunch", and "Dinner"
    const headerIndex = lines.findIndex(line => 
      line.includes('Breakfast') && line.includes('Lunch') && line.includes('Dinner'));
    
    if (headerIndex === -1) {
      if (this.debug) {
        console.warn('Could not find header line in timetable, trying alternative parsing');
      }
      return this.parseTextAlternative(text);
    }
    
    // Process each day's data
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Try to extract day information (Monday, Tuesday, etc.)
      const dayMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (!dayMatch) continue;
      
      const day = dayMatch[1];
      if (this.debug) {
        console.log(`Found day: ${day}`);
      }
      
      // For this specific timetable format, we need to find the meal data
      // which might span multiple lines
      
      // Find the next day's index or end of text
      const nextDayIndex = lines.findIndex((l, idx) => 
        idx > i && l.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i));
      
      const endIndex = nextDayIndex !== -1 ? nextDayIndex : lines.length;
      
      // Extract all lines for this day
      const dayLines = lines.slice(i, endIndex);
      const dayText = dayLines.join(' ');
      
      // Extract meal information using regex patterns
      const breakfastMatch = dayText.match(/Breakfast[^a-zA-Z]+(.*?)(?=Lunch|$)/i);
      const lunchMatch = dayText.match(/Lunch[^a-zA-Z]+(.*?)(?=Dinner|$)/i);
      const dinnerMatch = dayText.match(/Dinner[^a-zA-Z]+(.*?)(?=$)/i);
      
      const breakfast = breakfastMatch ? breakfastMatch[1].trim() : '';
      const lunch = lunchMatch ? lunchMatch[1].trim() : '';
      const dinner = dinnerMatch ? dinnerMatch[1].trim() : '';
      
      result[day] = {
        breakfast: this.extractFoodItems(breakfast),
        lunch: this.extractFoodItems(lunch),
        dinner: this.extractFoodItems(dinner)
      };
      
      // Skip to the next day
      i = endIndex - 1;
    }
    
    // If we couldn't parse any days, try alternative method
    if (Object.keys(result).length === 0) {
      if (this.debug) {
        console.warn('Could not parse any days, trying alternative method');
      }
      return this.parseTextAlternative(text);
    }
    
    return result;
  }

  /**
   * Alternative parsing method for timetable text
   * @param {string} text - OCR text from timetable image
   * @returns {Object} - Structured timetable data
   */
  parseTextAlternative(text) {
    const result = {};
    
    // Define days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // For each day, try to find its section in the text
    for (const day of days) {
      // Look for the day pattern in the text
      const dayRegex = new RegExp(`${day}[\\s\\S]*?((?=${days.filter(d => d !== day).join('|')})|$)`, 'i');
      const dayMatch = text.match(dayRegex);
      
      if (dayMatch) {
        const dayText = dayMatch[0];
        
        // Try to identify the three columns (breakfast, lunch, dinner)
        // This is a simplified approach for the specific timetable format
        
        // Split the day text into lines
        const dayLines = dayText.split('\n').filter(line => line.trim() !== '');
        
        // First line usually contains the day and date
        // Following lines might contain meal information
        
        let breakfastItems = [];
        let lunchItems = [];
        let dinnerItems = [];
        
        // Look for specific meal indicators
        for (const line of dayLines) {
          if (line.toLowerCase().includes('breakfast')) {
            const items = line.replace(/breakfast/i, '').trim();
            breakfastItems = this.extractFoodItems(items);
          } else if (line.toLowerCase().includes('lunch')) {
            const items = line.replace(/lunch/i, '').trim();
            lunchItems = this.extractFoodItems(items);
          } else if (line.toLowerCase().includes('dinner')) {
            const items = line.replace(/dinner/i, '').trim();
            dinnerItems = this.extractFoodItems(items);
          } else {
            // If no meal indicator, try to determine based on position
            // For the specific timetable format, we know the order is day, breakfast, lunch, dinner
            if (breakfastItems.length === 0) {
              breakfastItems = this.extractFoodItems(line);
            } else if (lunchItems.length === 0) {
              lunchItems = this.extractFoodItems(line);
            } else if (dinnerItems.length === 0) {
              dinnerItems = this.extractFoodItems(line);
            }
          }
        }
        
        result[day] = {
          breakfast: breakfastItems,
          lunch: lunchItems,
          dinner: dinnerItems
        };
      }
    }
    
    // If still no results, try a more aggressive approach
    if (Object.keys(result).length === 0) {
      // Split the text into chunks that might correspond to days
      const chunks = text.split(/\d+\.\d+\.\d+/).filter(chunk => chunk.trim() !== '');
      
      // Try to assign each chunk to a day
      for (let i = 0; i < Math.min(chunks.length, days.length); i++) {
        const chunk = chunks[i];
        const day = days[i];
        
        // Split the chunk into parts that might correspond to meals
        const parts = chunk.split(/\s{2,}/).filter(part => part.trim() !== '');
        
        let breakfast = '';
        let lunch = '';
        let dinner = '';
        
        if (parts.length >= 1) breakfast = parts[0];
        if (parts.length >= 2) lunch = parts[1];
        if (parts.length >= 3) dinner = parts[2];
        
        result[day] = {
          breakfast: this.extractFoodItems(breakfast),
          lunch: this.extractFoodItems(lunch),
          dinner: this.extractFoodItems(dinner)
        };
      }
    }
    
    return result;
  }

  /**
   * Extract food items from text
   * @param {string} text - Text containing food items
   * @returns {Array} - Array of food items
   */
  extractFoodItems(text) {
    if (!text) return [];
    
    // Split by commas and clean up
    return text.split(',')
      .map(item => item.trim())
      .filter(item => item !== '' && !item.match(/^\d+\.\d+\.\d+$/)); // Filter out dates
  }

  /**
   * Validate the parsed timetable data
   * @param {Object} timetableData - Parsed timetable data
   * @returns {Object} - Validation results
   */
  validateParsedData(timetableData) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const parsedDays = Object.keys(timetableData);
    
    // Check if all days are parsed
    const missingDays = days.filter(day => !parsedDays.includes(day));
    const allDaysParsed = missingDays.length === 0;
    
    // Check if each day has breakfast, lunch, and dinner
    let mealTypesComplete = true;
    const missingMeals = [];
    
    for (const day of parsedDays) {
      const dayData = timetableData[day];
      if (!dayData.breakfast || dayData.breakfast.length === 0) {
        missingMeals.push(`breakfast for ${day}`);
        mealTypesComplete = false;
      }
      if (!dayData.lunch || dayData.lunch.length === 0) {
        missingMeals.push(`lunch for ${day}`);
        mealTypesComplete = false;
      }
      if (!dayData.dinner || dayData.dinner.length === 0) {
        missingMeals.push(`dinner for ${day}`);
        mealTypesComplete = false;
      }
    }
    
    // Check if we have food items for each meal
    let foodItemsPresent = true;
    const emptyMeals = [];
    
    for (const day of parsedDays) {
      const dayData = timetableData[day];
      
      if (dayData.breakfast && dayData.breakfast.length === 0) {
        emptyMeals.push(`breakfast on ${day}`);
        foodItemsPresent = false;
      }
      
      if (dayData.lunch && dayData.lunch.length === 0) {
        emptyMeals.push(`lunch on ${day}`);
        foodItemsPresent = false;
      }
      
      if (dayData.dinner && dayData.dinner.length === 0) {
        emptyMeals.push(`dinner on ${day}`);
        foodItemsPresent = false;
      }
    }
    
    // Overall validation
    const isValid = allDaysParsed && mealTypesComplete && foodItemsPresent;
    
    return {
      isValid,
      allDaysParsed,
      mealTypesComplete,
      foodItemsPresent,
      missingDays,
      missingMeals,
      emptyMeals
    };
  }
}

module.exports = TimetableParser;

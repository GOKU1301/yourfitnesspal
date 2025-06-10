const fs = require('fs');
const path = require('path');

// Function to parse timetable from text file
function parseTimetableFromText(filePath) {
  console.log(`Processing timetable text from: ${filePath}`);
  
  try {
    // Read the file
    const text = fs.readFileSync(filePath, 'utf8');
    console.log('Raw timetable text:');
    console.log('-'.repeat(50));
    console.log(text);
    console.log('-'.repeat(50));
    
    // Parse the text
    const timetableData = parseTimetableText(text);
    console.log('\nParsed timetable data:');
    console.log(JSON.stringify(timetableData, null, 2));
    
    return timetableData;
  } catch (error) {
    console.error('Error parsing timetable:', error);
    return null;
  }
}

// Parse the text into structured meal data
function parseTimetableText(text) {
  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize result object
  const result = {};
  
  // Skip the header lines (first two lines)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    
    // Split the line by commas
    const parts = line.split(',');
    
    if (parts.length >= 4) {
      // Extract day name (remove date)
      const dayWithDate = parts[0];
      const dayMatch = dayWithDate.match(/^([A-Za-z]+)/);
      const day = dayMatch ? dayMatch[1] : dayWithDate;
      
      // Extract meal information
      const breakfast = parts[1];
      const lunch = parts[2];
      const dinner = parts[3];
      
      // Store in result dictionary
      result[day] = {
        breakfast: extractFoodItems(breakfast),
        lunch: extractFoodItems(lunch),
        dinner: extractFoodItems(dinner)
      };
      
      console.log(`Processed day: ${day}`);
    }
  }
  
  return result;
}

// Helper function to extract food items from text
function extractFoodItems(text) {
  if (!text) return [];
  
  // Split by spaces followed by capital letters (assuming each food item starts with a capital letter)
  return text.split(/\s(?=[A-Z])/)
    .map(item => item.trim())
    .filter(item => item !== '' && !item.match(/^\d+\.\d+\.\d+$/)); // Filter out dates
}

// Main function
function main() {
  const filePath = path.join(__dirname, 'sample-timetable.txt');
  
  console.log('Starting timetable parser test with text file');
  
  // Parse the timetable
  const timetableData = parseTimetableFromText(filePath);
  
  // Check if we have data for all days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const parsedDays = Object.keys(timetableData);
  
  console.log('\nValidation results:');
  console.log('-'.repeat(50));
  
  // Check if all days are parsed
  const missingDays = days.filter(day => !parsedDays.includes(day));
  if (missingDays.length > 0) {
    console.log(`❌ Missing days: ${missingDays.join(', ')}`);
  } else {
    console.log('✅ All days of the week are parsed');
  }
  
  // Check if each day has breakfast, lunch, and dinner
  let mealTypesComplete = true;
  for (const day of parsedDays) {
    const dayData = timetableData[day];
    if (!dayData.breakfast || dayData.breakfast.length === 0) {
      console.log(`❌ Missing breakfast for ${day}`);
      mealTypesComplete = false;
    }
    if (!dayData.lunch || dayData.lunch.length === 0) {
      console.log(`❌ Missing lunch for ${day}`);
      mealTypesComplete = false;
    }
    if (!dayData.dinner || dayData.dinner.length === 0) {
      console.log(`❌ Missing dinner for ${day}`);
      mealTypesComplete = false;
    }
  }
  
  if (mealTypesComplete) {
    console.log('✅ All meal types (breakfast, lunch, dinner) are present for each day');
  }
  
  // Check if we have food items for each meal
  let foodItemsPresent = true;
  for (const day of parsedDays) {
    const dayData = timetableData[day];
    
    if (dayData.breakfast.length === 0) {
      console.log(`❌ No food items for breakfast on ${day}`);
      foodItemsPresent = false;
    }
    
    if (dayData.lunch.length === 0) {
      console.log(`❌ No food items for lunch on ${day}`);
      foodItemsPresent = false;
    }
    
    if (dayData.dinner.length === 0) {
      console.log(`❌ No food items for dinner on ${day}`);
      foodItemsPresent = false;
    }
  }
  
  if (foodItemsPresent) {
    console.log('✅ Food items are present for all meals');
  }
  
  // Overall validation
  if (missingDays.length === 0 && mealTypesComplete && foodItemsPresent) {
    console.log('\n✅ Parser is working correctly!');
  } else {
    console.log('\n❌ Parser needs improvement');
  }
}

// Run the main function
main();

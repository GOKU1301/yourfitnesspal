const { processFoodItemsForMappings } = require('./utils/nutritionixSearch');
const { reinitializePineconeVectors } = require('./utils/foodMapping');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Extract unique food items from a timetable file
 * @param {string} extractedFilePath - Path to extracted timetable text file
 * @returns {Promise<Array<string>>} - Unique food items
 */
async function extractUniqueFoodItems(extractedFilePath) {
  try {
    const content = await fs.readFile(extractedFilePath, 'utf8');
    
    // Parse the timetable content (assuming each food item is on a separate line)
    // This parsing logic may need adjustment based on your timetable format
    const lines = content.split('\n').map(line => line.trim());
    
    // Extract food items (simple version - you may need more complex logic)
    const foodItems = lines.filter(line => 
      line && 
      line.length > 2 && 
      !line.startsWith('Date:') && 
      !line.startsWith('Day:') &&
      !line.includes('Breakfast:') &&
      !line.includes('Lunch:') &&
      !line.includes('Dinner:') &&
      !line.includes('Snacks:')
    );
    
    // Remove duplicates
    const uniqueFoods = [...new Set(foodItems)];
    console.log(`🔍 Found ${uniqueFoods.length} unique food items`);
    
    return uniqueFoods;
  } catch (error) {
    console.error('❌ Error extracting food items:', error.message);
    return [];
  }
}

/**
 * Main function to process timetable and generate mappings
 * @param {string} timetablePath - Path to extracted timetable text
 */
async function processTimetableForMappings(timetablePath) {
  try {
    console.log(`🚀 Processing timetable: ${timetablePath}`);
    
    // 1. Extract unique food items
    const foodItems = await extractUniqueFoodItems(timetablePath);
    
    if (foodItems.length === 0) {
      console.log('⚠️ No food items found in the timetable');
      return;
    }
    
    // Show the first 10 items
    console.log('📋 Sample food items:');
    foodItems.slice(0, 10).forEach(item => console.log(`   - ${item}`));
    console.log('...');
    
    // 2. Process food items and create mappings
    const results = await processFoodItemsForMappings(foodItems);
    
    // 3. Report results
    const added = results.filter(r => r.added).length;
    console.log(`\n✅ Results: Added ${added} new mappings out of ${results.length} items`);
    
    // 4. Reinitialize Pinecone with the updated mappings
    console.log('\n🔄 Reinitializing Pinecone vectors with updated mappings...');
    await reinitializePineconeVectors();
    
    console.log('\n🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error processing timetable:', error);
  }
}

// If run directly from command line
if (require.main === module) {
  // Check if a file was provided
  const timetablePath = process.argv[2];
  
  if (!timetablePath) {
    console.error('❌ Please provide a path to the extracted timetable text file');
    console.error('Usage: node generateMappings.js path/to/extracted_timetable.txt');
    process.exit(1);
  }
  
  processTimetableForMappings(timetablePath)
    .catch(console.error);
}

module.exports = {
  processTimetableForMappings,
  extractUniqueFoodItems
};

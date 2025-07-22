import { findBestNutritionixMatch } from './utils/nutritionixSearch.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testSingleFoodItem(foodItem) {
  console.log(`\n🔍 Testing with: "${foodItem}"`);
  
  // 1. Find the best match in Nutritionix
  const match = await findBestNutritionixMatch(foodItem);
  console.log(`✅ Best match: "${match.standardName}" (similarity: ${match.similarity?.toFixed(3) || 'N/A'})`);
  
  // 2. Add to mappings if it's a good match
  if (match.found && match.similarity > 0.6) {
      console.log('Match found:');
      console.log(match);
  } else {
    console.log('⚠️ No good match found or similarity too low');
  }
  
  return match;
}

// Test with some sample food items
const testItems = ['paneer tikka', 'butter roti', 'dal makhni','aloo ka paratha' ,'egg curry', 'Coleslaw Sandwich'];

async function runTests() {
  console.log('🚀 Starting Nutritionix API test...');
  console.log('----------------------------------');
  
  for (const item of testItems) {
    await testSingleFoodItem(item);
    // Add a small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Test completed! Check the results above.');
  console.log('   You can view your updated mappings in data/foodMappings.json');
}

// Run the tests if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTests().catch(console.error);
}

export { testSingleFoodItem };

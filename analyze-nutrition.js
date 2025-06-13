import { analyzeTimetableNutrition } from './utils/nutritionAnalyzer.js';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the most recent timetable file from the extracted data directory
function getMostRecentTimetableFile() {
  const extractedDir = path.join(__dirname, 'data', 'extracted');
  
  try {
    const files = fs.readdirSync(extractedDir)
      .filter(file => file.startsWith('timetable-') && file.endsWith('.txt'))
      .map(file => ({
        name: file,
        path: path.join(extractedDir, file),
        mtime: fs.statSync(path.join(extractedDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) {
      console.error(chalk.red('❌ No timetable files found in data/extracted directory'));
      return null;
    }
    
    return files[0].path;
  } catch (error) {
    console.error(chalk.red('❌ Error finding timetable files:'), error.message);
    return null;
  }
}

function formatNutritionInfo(nutrition, indent = false) {
  if (!nutrition) return '';
  
  const { calories, protein, carbs, fat, fiber } = nutrition;
  const indentStr = indent ? '  ' : '';
  return `${indentStr}Calories: ${Math.round(calories)} | Protein: ${protein.toFixed(1)}g | Carbs: ${carbs.toFixed(1)}g | Fat: ${fat.toFixed(1)}g | Fiber: ${fiber.toFixed(1)}g`;
}

function formatFoodItem(item, index) {
  if (!item) return '';
  
  const errorMsg = item.error ? chalk.red(` (${item.error})`) : '';
  const noteMsg = item.note ? chalk.yellow(` (${item.note})`) : '';
  const servingInfo = item.serving_qty ? ` (${item.serving_qty} ${item.serving_unit})` : '';
  
  return `  • ${item.foodItem}${servingInfo}${errorMsg}${noteMsg}`;
}

function formatMealItems(mealName, items, colorFn) {
  if (!items || items.length === 0) return;
  
  console.log(colorFn(`\n${mealName}`));
  
  // Group similar items together
  const itemCounts = {};
  items.forEach(item => {
    const key = item.foodItem.toLowerCase();
    if (!itemCounts[key]) {
      itemCounts[key] = {
        ...item,
        count: 1,
        displayName: item.foodItem
      };
    } else {
      itemCounts[key].count++;
      // Add up the nutrition values for duplicate items
      Object.keys(item).forEach(prop => {
        if (typeof item[prop] === 'number') {
          itemCounts[key][prop] = (itemCounts[key][prop] || 0) + item[prop];
        }
      });
    }
  });
  
  const uniqueItems = Object.values(itemCounts);
  
  // Display each unique item with its count and nutrition info
  uniqueItems.forEach((item, index) => {
    const countStr = item.count > 1 ? ` (x${item.count})` : '';
    console.log(`  • ${item.displayName}${countStr}`);
    if (item.calories > 0) {
      console.log(`    ${formatNutritionInfo(item, true)}`);
    } else if (item.error) {
      console.log(`    ${chalk.red(item.error)}`);
    }
  });
  
  // Calculate and display totals
  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
    fiber: acc.fiber + (item.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  
  console.log(chalk.bold('  Total:'), formatNutritionInfo(totals));
  
  return totals;
}

async function displayNutritionResults(results) {
  if (!results) return;
  
  console.log('\n' + chalk.bold.underline('NUTRITION ANALYSIS RESULTS') + '\n');
  
  for (const [day, data] of Object.entries(results)) {
    console.log(chalk.bold.blue(`\n📅 ${day.toUpperCase()}`));
    
    // Process and display each meal
    const breakfastTotals = formatMealItems('🍳 BREAKFAST', data.breakfast.items, chalk.green);
    const lunchTotals = formatMealItems('🍲 LUNCH', data.lunch.items, chalk.yellow);
    const dinnerTotals = formatMealItems('🍽️  DINNER', data.dinner.items, chalk.magenta);
    
    // Calculate daily totals
    const dailyTotals = [breakfastTotals, lunchTotals, dinnerTotals]
      .filter(Boolean)
      .reduce((acc, meal) => ({
        calories: acc.calories + (meal?.calories || 0),
        protein: acc.protein + (meal?.protein || 0),
        carbs: acc.carbs + (meal?.carbs || 0),
        fat: acc.fat + (meal?.fat || 0),
        fiber: acc.fiber + (meal?.fiber || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    // Display daily totals
    console.log(chalk.bold.cyan('\n📊 DAILY TOTALS'));
    console.log(formatNutritionInfo(dailyTotals));
    
    console.log('\n' + '='.repeat(80));
  }
}

async function main() {
  console.log(chalk.bold('🍎 Starting nutrition analysis...'));
  
  // Get the file path from command line args or use the most recent file
  const filePath = process.argv[2] || getMostRecentTimetableFile();
  
  if (!filePath) {
    console.error(chalk.red('❌ No timetable file specified and no recent files found'));
    process.exit(1);
  }
  
  console.log(chalk.blue(`📂 Using timetable file: ${filePath}`));
  
  try {
    // Check for API credentials
    if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_APP_KEY) {
      console.log(chalk.yellow('\n⚠️  WARNING: Nutritionix API credentials not found in environment variables'));
      console.log('To get accurate nutrition data, please set:');
      console.log('NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in your .env file');
      console.log('\nAttempting to continue with limited functionality...\n');
    }
    
    // Run the nutrition analysis
    console.log(chalk.blue('🔍 Analyzing nutrition data...'));
    const results = await analyzeTimetableNutrition(filePath);
    
    // Display results
    await displayNutritionResults(results);
    
    console.log(chalk.green.bold('\n✅ Nutrition analysis complete!'));
  } catch (error) {
    console.error(chalk.red('❌ Error running nutrition analysis:'), error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

// Run the main function
main().catch(console.error);
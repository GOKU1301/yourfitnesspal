import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { processTimetableImage } from './utils/geminiProcessor.js';
import { findBestNutritionixMatch, addFoodMappingIfNew } from './utils/nutritionixSearch.js';

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
app.use(express.static('public'));

// Create images directory if it doesn't exist
if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

// Configure multer to save files with a specific name
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/');
  },
  filename: (req, file, cb) => {
    // Always save as timetable.jpg
    cb(null, 'timetable.jpg');
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve the upload form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle file upload and processing
app.post('/upload', upload.single('timetable'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    
    console.log('Processing uploaded image...');
    const imagePath = path.join('images', 'timetable.jpg');
    
    // Process the image to extract text
    const extractedText = await processTimetableImage(imagePath);
    
    // Save the extracted text
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join('data', 'extracted', `timetable-${timestamp}.txt`);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, extractedText);
    
    console.log('Extracted text saved to:', outputPath);
    
    // Extract food items from the text
    const foodItems = extractFoodItems(extractedText);
    console.log(`Found ${foodItems.length} food items in the timetable`);
    
    // Process each food item to update mappings
    let addedCount = 0;
    for (const item of foodItems) {
      console.log(`\n🔍 Processing: "${item}"`);
      
      try {
        // Find best match in Nutritionix
        const match = await findBestNutritionixMatch(item);
        
        if (match.found && match.similarity > 0.6) {
          console.log(`✅ Found match: "${match.standardName}" (similarity: ${match.similarity.toFixed(3)})`);
          
          // Add to mappings
          const { added } = await addFoodMappingIfNew(match.originalName, match.standardName);
          if (added) {
            console.log(`📝 Added mapping: "${match.originalName}" → "${match.standardName}"`);
            addedCount++;
          } else {
            console.log(`ℹ️ Mapping already exists for "${match.originalName}"`);
          }
        } else {
          console.log(`⚠️ No good match found for "${item}"`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Error processing "${item}":`, error.message);
      }
    }
    
    res.send(`
      <h1>Processing Complete!</h1>
      <p>Image processed and food items extracted.</p>
      <p>Found ${foodItems.length} food items, added ${addedCount} new mappings.</p>
      <a href="/">Upload another image</a>
    `);
    
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send(`Error processing image: ${error.message}`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Upload form available at http://localhost:5000');
});

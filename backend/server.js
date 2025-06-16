import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import GeminiProcessor from './utils/geminiProcessor.js';
import { findBestNutritionixMatch, addFoodMappingIfNew } from './utils/nutritionixSearch.js';
import authRoutes from './routes/auth.js';
import { verifyToken, isAdmin } from './middleware/auth.js';
import mongoose from 'mongoose';

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    return false;
  }
}

// Get the default connection
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('MongoDB connection ready');
});

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
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);

// Create images directory if it doesn't exist
if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'timetable-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

// Supported image MIME types
const SUPPORTED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Protected admin route for file upload
app.post('/api/upload', verifyToken, isAdmin, upload.single('timetable'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing uploaded image...');
    console.log('Uploaded file details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // The file is already saved by multer.diskStorage
    const imagePath = req.file.path;
    
    // Verify file was written correctly
    if (!fs.existsSync(imagePath)) {
      throw new Error('Failed to save image file');
    }
    
    const stats = fs.statSync(imagePath);
    console.log(`Saved image file size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('Image file is empty after save');
    }
    
    // Process the image to extract text using Gemini API
    console.log('Extracting text from image...');
    const processor = new GeminiProcessor();
    const extractedText = await processor.extractTextFromImage(imagePath);
    console.log('Text extraction completed');
    
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
    
    res.json({ 
      success: true, 
      message: `Processed ${foodItems.length} items, added ${addedCount} new mappings` 
    });
    
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process image' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  const isDBConnected = await connectDB();
  if (!isDBConnected) {
    console.error('❌ Failed to connect to MongoDB. Exiting...');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('Database name:', mongoose.connection.name);
    console.log('Database host:', mongoose.connection.host);
  });
}

startServer().catch(console.error);

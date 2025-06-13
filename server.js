import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeTimetableNutrition } from './utils/nutritionAnalyzer.js';
import { processTimetableImage } from './utils/geminiProcessor.js';

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
    
    // Now analyze the nutrition from the extracted text
    console.log('Analyzing nutrition information...');
    await analyzeTimetableNutrition(outputPath);
    
    res.send(`
      <h1>Processing Complete!</h1>
      <p>Image processed and nutrition analysis started.</p>
      <p>Check the server console for detailed nutrition information.</p>
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

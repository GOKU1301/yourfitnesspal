import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GeminiProcessor {
  constructor() {
    // Initialize with your Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using flash model for faster response times
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
      },
    });
  }

  /**
   * Extract text from an image using Gemini
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromImage(imagePath) {
    try {
      console.log('Processing image with Gemini...');
      
      // Convert to absolute path if it's not already
      const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
      
      console.log(`Looking for image at: ${absolutePath}`);
      
      // Check if file exists and is accessible
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Image file not found at: ${absolutePath}. Current working directory: ${process.cwd()}`);
      }

      // Get file stats for logging
      const stats = fs.statSync(absolutePath);
      if (stats.size === 0) {
        throw new Error('Image file is empty');
      }
      console.log(`Image file size: ${stats.size} bytes`);
      console.log(`Image path: ${absolutePath}`);

      // Read image directly as buffer
      const imageBuffer = fs.readFileSync(absolutePath);
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Failed to read image file or file is empty');
      }
      
      // Get file extension to determine MIME type
      const ext = path.extname(absolutePath).toLowerCase().substring(1);
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      console.log(`Using MIME type: ${mimeType}`);
      
      // Simple prompt
      const prompt = "Extract the meal timetable from this image as a CSV table with Day, Breakfast, Lunch, Dinner columns.";
      
      // Convert to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare the request
      const imageParts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ];

      try {
        console.log('Sending request to Gemini API...');
        
        // Use the class-level model
        const result = await this.model.generateContent(imageParts);
        
        // Get response text
        const response = await result.response;
        const text = response.text();
        
        console.log('Raw Gemini response:', text.substring(0, 200) + '...');
        
        // Extract the CSV data
        const csvData = this.extractCSVFromResponse(text);
        console.log('Extracted CSV data:', csvData);
        
        return csvData;
      } catch (apiError) {
        // Detailed error logging
        console.error('Gemini API error details:');
        console.error(JSON.stringify({
          message: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText,
          stack: apiError.stack
        }, null, 2));
        
        throw apiError; // Rethrow for proper error handling upstream
      }
    } catch (error) {
      console.error('Error extracting text with Gemini:', error);
      throw error;
    }
  }

  /**
   * Get MIME type based on file extension and content
   * @private
   */
  getMimeType(filePath) {
    // First try to get from file extension
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    // Map of common image extensions to their MIME types
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff'
    };
    
    // Return the MIME type if found, otherwise return octet-stream
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Extract CSV data from Gemini's response
   * @private
   */
  extractCSVFromResponse(text) {
    try {
      // First try to find a well-formatted CSV table
      let match = text.match(/Day\s*,\s*Breakfast\s*,\s*Lunch\s*,\s*Dinner[\s\S]*?(?:\n\n|$)/i);
      
      if (!match) {
        // If no table found, try to find any CSV-like data
        match = text.match(/(?:Monday|Mon)[\s\S]*?(?:\n\n|$)/i);
      }
      
      if (!match) {
        console.warn('No CSV data found in response, returning full text');
        return text;
      }
      
      const result = match[0].trim();
      // Clean up any markdown code blocks
      return result.replace(/```[\s\S]*?\n|```/g, '').trim();
    } catch (error) {
      console.error('Error extracting CSV from response:', error);
      return text; // Return original text if parsing fails
    }
  }

  /**
   * Process timetable image and save extracted text
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<{text: string, filePath: string}>}
   */
  async processTimetableImage(imagePath) {
    try {
      const text = await this.extractTextFromImage(imagePath);
      const filePath = this.saveExtractedText(text);
      return { text, filePath };
    } catch (error) {
      console.error('Error processing timetable image with Gemini:', error);
      throw error;
    }
  }

  /**
   * Save extracted text to a file
   * @private
   */
  saveExtractedText(text, outputDir = 'data/extracted') {
    try {
      // Create directory if it doesn't exist
      const fullOutputDir = path.join(process.cwd(), outputDir);
      if (!fs.existsSync(fullOutputDir)) {
        fs.mkdirSync(fullOutputDir, { recursive: true });
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(fullOutputDir, `timetable-${timestamp}.txt`);
      
      // Write to file
      fs.writeFileSync(outputPath, text);
      console.log(`Text saved to ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      console.error('Error saving extracted text:', error);
      throw error;
    }
  }
}

// Process a timetable image and return the extracted text
export async function processTimetableImage(imagePath) {
  try {
    const processor = new GeminiProcessor();
    const extractedText = await processor.extractTextFromImage(imagePath);
    return extractedText;
  } catch (error) {
    console.error('Error in processTimetableImage:', error);
    throw error;
  }
}

export default GeminiProcessor;
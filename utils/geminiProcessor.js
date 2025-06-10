const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiProcessor {
  constructor() {
    // Initialize with your Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
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
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Read the image file
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // Prepare the prompt with strict formatting instructions
      const prompt = `Extract the weekly college meal timetable from this image. Follow these instructions carefully:

1. FORMAT: Return ONLY a CSV (Comma-Separated Values) table with exactly 4 columns: Day, Breakfast, Lunch, Dinner
2. DAYS: Include all 7 days of the week in order (Monday through Sunday)
3. MEALS: Include all 3 meals for each day (Breakfast, Lunch, Dinner)
4. SEPARATORS: Use ONLY commas (,) to separate columns
5. TEXT: Preserve all text exactly as shown in the image
6. MISSING: If a meal is not listed, write 'Not Available'
7. NO EXTRA TEXT: Do not include any explanations, notes, or additional text

Here's the exact format to follow:

Day,Breakfast,Lunch,Dinner
Monday,Idli Sambar,Vegetable Pulao,Dal Chawal
Tuesday,Poha,Chole Bhature,Rajma Chawal
Wednesday,Upma,Vegetable Biryani,Kadhi Chawal
Thursday,Dosa,Jeera Rice,Chana Masala
Friday,Aloo Paratha,Vegetable Pulao,Dal Makhani
Saturday,Chole Bhature,Aloo Paratha,Paneer Butter Masala
Sunday,Special Thali,Special Thali,Special Thali

IMPORTANT: Your ENTIRE response should be JUST the CSV data with NO additional text before or after.`;

      // Generate content with image
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: this.getMimeType(imagePath),
        },
      };

      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              imagePart,
            ],
          },
        ],
      });

      // Get the response text
      const response = await result.response;
      let text = '';
      
      // Handle different response formats
      if (response.text) {
        text = response.text();
      } else if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      } else {
        console.log('Unexpected response format:', JSON.stringify(response, null, 2));
        throw new Error('Unexpected response format from Gemini API');
      }
      
      console.log('Raw Gemini response:', text);
      
      // Clean up the response to get just the CSV data
      const csvData = this.extractCSVFromResponse(text);
      console.log('Extracted CSV data:', csvData);
      return csvData;
    } catch (error) {
      console.error('Error extracting text with Gemini:', error);
      throw error;
    }
  }

  /**
   * Get MIME type based on file extension
   * @private
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
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

module.exports = GeminiProcessor;

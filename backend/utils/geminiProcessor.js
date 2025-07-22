import { GoogleGenerativeAI } from '@google/generative-ai';

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
   * Extract text from an image buffer using Gemini
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromImageBuffer(imageBuffer, mimeType) {
    try {
      console.log('🖼️ [GEMINI_PROCESSOR] Starting image buffer processing with Gemini...');
      console.log('🖼️ [GEMINI_PROCESSOR] Processing timestamp:', new Date().toISOString());
      
      // Verify buffer exists and has content
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Image buffer is empty or invalid');
      }
      
      console.log(`🖼️ [GEMINI_PROCESSOR] Image buffer size: ${imageBuffer.length} bytes`);
      console.log(`🖼️ [GEMINI_PROCESSOR] Using MIME type: ${mimeType}`);
      console.log(`🖼️ [GEMINI_PROCESSOR] Image hash: ${Buffer.from(imageBuffer.slice(0, 100)).toString('hex').substring(0, 20)}...`); // Log partial hash for image identification
      
      // Simple prompt
      const prompt = "Extract the meal timetable from this image as a CSV table with Day, Breakfast, Lunch, Dinner columns.";
      console.log(`🖼️ [GEMINI_PROCESSOR] Using prompt: "${prompt}"`);
      
      // Convert to base64
      const base64Image = imageBuffer.toString('base64');
      console.log(`🖼️ [GEMINI_PROCESSOR] Converted image to base64 (length: ${base64Image.length} characters)`); 
      
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

      console.log('🖼️ [GEMINI_PROCESSOR] Sending request to Gemini API...');
      console.log('🖼️ [GEMINI_PROCESSOR] Request timestamp:', new Date().toISOString());
      
      // Use the class-level model
      const result = await this.model.generateContent(imageParts);
      
      // Get response text
      const response = await result.response;
      const text = response.text();
      
      console.log('🖼️ [GEMINI_PROCESSOR] Received Gemini response at:', new Date().toISOString());
      console.log('🖼️ [GEMINI_PROCESSOR] Response length:', text.length, 'characters');
      console.log('🖼️ [GEMINI_PROCESSOR] Raw Gemini response (first 200 chars):', text.substring(0, 200) + '...');
      
      // Extract the CSV data
      const csvData = this.extractCSVFromResponse(text);
      console.log('🖼️ [GEMINI_PROCESSOR] Extracted CSV data:');
      console.log(csvData);
      console.log('🖼️ [GEMINI_PROCESSOR] CSV data length:', csvData.length, 'characters');
      
      return csvData;
    } catch (error) {
      console.error('❌ [GEMINI_PROCESSOR] Error in extractTextFromImageBuffer:', error);
      console.error('❌ [GEMINI_PROCESSOR] Error timestamp:', new Date().toISOString());
      throw error;
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
  async processTimetableImage(imageBuffer, mimeType = 'image/jpeg') {
    try {
      const text = await this.extractTextFromImageBuffer(imageBuffer, mimeType);
      return { text };
    } catch (error) {
      console.error('Error processing timetable image with Gemini:', error);
      throw error;
    }
  }


}
export default GeminiProcessor;
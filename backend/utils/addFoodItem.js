import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yourfitnesspal')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Food Schema
const servingSchema = new mongoose.Schema({
  size: String,
  portion_label: String,
  diameter_cm: Number,
  weight_g: Number,
  volume_ml: Number,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number
});

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  aliases: [String],
  category: String,
  servings: [servingSchema]
});

// Create or get Nutrition model
let Nutrition;
try {
  // Try to get existing model first
  Nutrition = mongoose.model('nutrition');
} catch {
  // If model doesn't exist, create it
  Nutrition = mongoose.model('nutrition', foodSchema, 'nutritions');
}

// Food document to insert
const fruitDocument = {
  name: "Fruit",
  aliases: [],
  category: "snack",
  servings: [
    {
      size: "small",
      portion_label: "Sliced Papaya",
      diameter_cm: null,
      weight_g: 145,
      volume_ml: null,
      calories: 62,
      protein: 0.7,
      carbs: 16,
      fat: 0.4
    },
    {
      size: "medium",
      portion_label: "1 Large Banana (120g)",
      diameter_cm: null,
      weight_g: 120,
      volume_ml: null,
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0.2
    },
    {
      size: "large",
      portion_label: "Fruit Salad",
      diameter_cm: null,
      weight_g: 162,
      volume_ml: null,
      calories: 97,
      protein: 1.4,
      carbs: 24,
      fat: 0.5
    }
  ]
};

// Insert the document
async function addFoodItem() {
  try {
    // Check if food with same name already exists
    const existing = await Nutrition.findOne({ name: fruitDocument.name });
    
    if (existing) {
      console.log(`Food item "${fruitDocument.name}" already exists. Updating...`);
      const updated = await Nutrition.findOneAndUpdate(
        { name: fruitDocument.name },
        fruitDocument,
        { new: true }
      );
      console.log('Food item updated successfully:', updated);
    } else {
      const newFood = new Nutrition(fruitDocument);
      const saved = await newFood.save();
      console.log('Food item added successfully:', saved);
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error adding food item:', error);
    mongoose.connection.close();
  }
}

// Run the function
addFoodItem().catch(err => {
  console.error('Error in main execution:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Meal model
const Meal = require('./models/Meal');

/**
 * Retrieve and display all meals from the database
 */
async function retrieveMeals() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    
    // Fix MongoDB URI if it contains @ character in password
    const mongoURI = process.env.MONGODB_URI.replace('messhead@222', 'messhead%40222');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Retrieve all meals from the database
    const meals = await Meal.find().sort({ day: 1, mealType: 1 });
    
    console.log(`\nRetrieved ${meals.length} meals from the database:`);
    console.log('-'.repeat(50));
    
    // Group meals by day
    const mealsByDay = {};
    
    for (const meal of meals) {
      if (!mealsByDay[meal.day]) {
        mealsByDay[meal.day] = {};
      }
      
      mealsByDay[meal.day][meal.mealType] = meal.foodItems;
    }
    
    // Display meals by day and meal type
    for (const [day, mealTypes] of Object.entries(mealsByDay)) {
      console.log(`\n${day}:`);
      
      for (const [mealType, foodItems] of Object.entries(mealTypes)) {
        console.log(`  ${mealType}: ${foodItems.join(', ')}`);
      }
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error retrieving meals:', error);
  }
}

// Run the function
retrieveMeals();

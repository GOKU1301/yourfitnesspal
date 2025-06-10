const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  mealType: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner']
  },
  foodItems: [{
    type: String,
    required: true
  }],
  date: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index on day and mealType for faster queries
MealSchema.index({ day: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('Meal', MealSchema);

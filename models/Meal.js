const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
  // Menu period information
  menuStartDate: {
    type: Date,
    required: true
  },
  menuEndDate: {
    type: Date,
    required: true
  },
  // Day information
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  dayDate: {
    type: Date,
    required: true
  },
  // Meal information
  meals: {
    breakfast: {
      type: [String],
      required: true,
      default: []
    },
    lunch: {
      type: [String],
      required: true,
      default: []
    },
    dinner: {
      type: [String],
      required: true,
      default: []
    }
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
MealSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create compound indexes for efficient querying
MealSchema.index({ menuStartDate: 1, menuEndDate: 1 });
MealSchema.index({ dayDate: 1, 'meals.breakfast': 1, 'meals.lunch': 1, 'meals.dinner': 1 });

// Create a compound unique index for day and menu period
MealSchema.index(
  { day: 1, menuStartDate: 1, menuEndDate: 1 },
  { unique: true }
);

module.exports = mongoose.model('Meal', MealSchema);

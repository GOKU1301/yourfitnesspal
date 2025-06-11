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
    type: {
      breakfast: [String],
      lunch: [String],
      dinner: [String]
    },
    default: () => ({
      breakfast: [],
      lunch: [],
      dinner: []
    })
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
}, { timestamps: true });

// Create a compound unique index for day and menu period
MealSchema.index(
  { day: 1, menuStartDate: 1, menuEndDate: 1 },
  { unique: true }
);

// Index for date-based queries
MealSchema.index({ dayDate: 1 });
MealSchema.index({ menuStartDate: 1, menuEndDate: 1 });

module.exports = mongoose.model('Meal', MealSchema);

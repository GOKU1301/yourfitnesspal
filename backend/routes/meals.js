const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');

/**
 * @route   GET api/meals
 * @desc    Get all meals
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const meals = await Meal.find().sort({ day: 1 });
    res.json(meals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/meals/:day/:mealType
 * @desc    Get meal by day and type
 * @access  Public
 */
router.get('/:day/:mealType', async (req, res) => {
  try {
    const { day, mealType } = req.params;
    
    // Validate day and mealType
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const validMealTypes = ['breakfast', 'lunch', 'dinner'];
    
    if (!validDays.includes(day) || !validMealTypes.includes(mealType)) {
      return res.status(400).json({ msg: 'Invalid day or meal type' });
    }
    
    const meal = await Meal.findOne({ day, mealType });
    
    if (!meal) {
      return res.status(404).json({ msg: 'Meal not found' });
    }
    
    res.json(meal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST api/meals
 * @desc    Add or update a meal
 * @access  Private (would require auth middleware in production)
 */
router.post('/', async (req, res) => {
  try {
    const { day, mealType, foodItems } = req.body;
    
    // Validate inputs
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const validMealTypes = ['breakfast', 'lunch', 'dinner'];
    
    if (!validDays.includes(day) || !validMealTypes.includes(mealType)) {
      return res.status(400).json({ msg: 'Invalid day or meal type' });
    }
    
    if (!Array.isArray(foodItems) || foodItems.length === 0) {
      return res.status(400).json({ msg: 'Food items must be a non-empty array' });
    }
    
    // Create or update meal
    const meal = await Meal.findOneAndUpdate(
      { day, mealType },
      { day, mealType, foodItems, updatedAt: Date.now() },
      { new: true, upsert: true }
    );
    
    res.json(meal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   DELETE api/meals/:day/:mealType
 * @desc    Delete a meal
 * @access  Private (would require auth middleware in production)
 */
router.delete('/:day/:mealType', async (req, res) => {
  try {
    const { day, mealType } = req.params;
    
    // Find and delete meal
    const meal = await Meal.findOneAndDelete({ day, mealType });
    
    if (!meal) {
      return res.status(404).json({ msg: 'Meal not found' });
    }
    
    res.json({ msg: 'Meal deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

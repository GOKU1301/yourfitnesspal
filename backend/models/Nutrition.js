import mongoose from 'mongoose';

const NutritionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Roti"
  aliases: [String], // e.g. ["Chapati", "Phulka"]
  category: { type: String }, // e.g. "bread", "sabzi", "dairy", "beverage"
  servings: [
    {
      size: { type: String, required: true }, // e.g. "half-cup", "full-cup", "small", "medium"
      portion_label: String, // e.g. "Half Cup", "Full Cup", "Katori"
      diameter_cm: Number, // for breads
      weight_g: Number, // for solids
      volume_ml: Number, // for liquids/cups
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }
  ]
});

export default mongoose.model('Nutrition', NutritionSchema);

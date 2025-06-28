// overwriteNutritionData.js
// Script to overwrite or insert nutrition data for food items.

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Nutrition from '../models/Nutrition.js'; // Use the Nutrition model

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const data = [
  {
    _id: "685d2f7455242956ff410b20",
    name: "Fruit",
    aliases: ["Fruit plate", "Fruit bowl"],
    category: "fruit",
    servings: [
      {
        _id: "685d2f7455242956ff410b21",
        size: "small",
        portion_label: "Sliced papaya (100g)",
        diameter_cm: null,
        weight_g: 100,
        volume_ml: null,
        calories: 43,
        protein: 0.5,
        carbs: 11,
        fat: 0.2
      },
      {
        _id: "685d2f7455242956ff410b22",
        size: "medium",
        portion_label: "1 medium banana (120g)",
        diameter_cm: null,
        weight_g: 120,
        volume_ml: null,
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.3
      },
      {
        _id: "685d2f7455242956ff410b23",
        size: "large",
        portion_label: "Mixed fruits bowl (200g)",
        diameter_cm: null,
        weight_g: 200,
        volume_ml: null,
        calories: 120,
        protein: 1.5,
        carbs: 30,
        fat: 0.5
      }
    ]
  },

  { _id: "685d2f7455242956ff410a33", name: "Roti", aliases: [], category: "roti", servings: [ { _id: "685d2f7455242956ff410a34", size: "small", portion_label: "1 small roti (12 cm)", diameter_cm: 12, weight_g: 30, volume_ml: null, calories: 90, protein: 2.5, carbs: 15, fat: 2 }, { _id: "685d2f7455242956ff410a35", size: "medium", portion_label: "1 medium roti (15 cm)", diameter_cm: 15, weight_g: 40, volume_ml: null, calories: 120, protein: 3.2, carbs: 20, fat: 2.8 }, { _id: "685d2f7455242956ff410a36", size: "large", portion_label: "1 large roti (18 cm)", diameter_cm: 18, weight_g: 50, volume_ml: null, calories: 150, protein: 4.1, carbs: 25, fat: 3.5 } ] },
  { _id: "685d2f7455242956ff410a40", name: "Tea", aliases: [], category: "tea", servings: [ { _id: "685d2f7455242956ff410a41", size: "small", portion_label: "100ml glass", diameter_cm: null, weight_g: null, volume_ml: 100, calories: 40, protein: 1, carbs: 5, fat: 2 }, { _id: "685d2f7455242956ff410a42", size: "medium", portion_label: "200ml glass", diameter_cm: null, weight_g: null, volume_ml: 200, calories: 80, protein: 2, carbs: 10, fat: 4 }, { _id: "685d2f7455242956ff410a43", size: "large", portion_label: "300ml glass", diameter_cm: null, weight_g: null, volume_ml: 300, calories: 120, protein: 3, carbs: 15, fat: 6 } ] },
  { _id: "685d2f7455242956ff410a50", name: "Milk", aliases: [], category: "milk", servings: [ { _id: "685d2f7455242956ff410a51", size: "small", portion_label: "100ml glass", diameter_cm: null, weight_g: null, volume_ml: 100, calories: 67, protein: 3.2, carbs: 5, fat: 4 }, { _id: "685d2f7455242956ff410a52", size: "medium", portion_label: "200ml glass", diameter_cm: null, weight_g: null, volume_ml: 200, calories: 134, protein: 6.4, carbs: 10, fat: 8 }, { _id: "685d2f7455242956ff410a53", size: "large", portion_label: "300ml glass", diameter_cm: null, weight_g: null, volume_ml: 300, calories: 201, protein: 9.6, carbs: 15, fat: 12 } ] },
  { _id: "685d2f7455242956ff410a60", name: "Kachori", aliases: [], category: "kachori", servings: [ { _id: "685d2f7455242956ff410a61", size: "small", portion_label: "1 small kachori (5 cm)", diameter_cm: 5, weight_g: 40, volume_ml: null, calories: 140, protein: 2.5, carbs: 15, fat: 8 }, { _id: "685d2f7455242956ff410a62", size: "medium", portion_label: "1 medium kachori (7 cm)", diameter_cm: 7, weight_g: 60, volume_ml: null, calories: 210, protein: 4, carbs: 22, fat: 12 }, { _id: "685d2f7455242956ff410a63", size: "large", portion_label: "1 large kachori (9 cm)", diameter_cm: 9, weight_g: 80, volume_ml: null, calories: 280, protein: 5.5, carbs: 30, fat: 16 } ] },
  { _id: "685d2f7455242956ff410a70", name: "Jalebi", aliases: [], category: "jalebi", servings: [ { _id: "685d2f7455242956ff410a71", size: "small", portion_label: "1 small jalebi (25g)", diameter_cm: null, weight_g: 25, volume_ml: null, calories: 100, protein: 0.5, carbs: 20, fat: 3 }, { _id: "685d2f7455242956ff410a72", size: "medium", portion_label: "1 medium jalebi (40g)", diameter_cm: null, weight_g: 40, volume_ml: null, calories: 160, protein: 0.8, carbs: 32, fat: 5 }, { _id: "685d2f7455242956ff410a73", size: "large", portion_label: "1 large jalebi (60g)", diameter_cm: null, weight_g: 60, volume_ml: null, calories: 240, protein: 1.2, carbs: 48, fat: 7.5 } ] },
  { _id: "685d2f7455242956ff410a80", name: "Egg Curry", aliases: [], category: "egg curry", servings: [ { _id: "685d2f7455242956ff410a81", size: "small", portion_label: "1 egg curry (small)", diameter_cm: null, weight_g: null, volume_ml: null, calories: 130, protein: 7, carbs: 4, fat: 10 }, { _id: "685d2f7455242956ff410a82", size: "medium", portion_label: "2 egg curry (medium)", diameter_cm: null, weight_g: null, volume_ml: null, calories: 260, protein: 14, carbs: 8, fat: 20 }, { _id: "685d2f7455242956ff410a83", size: "large", portion_label: "3 egg curry (large)", diameter_cm: null, weight_g: null, volume_ml: null, calories: 390, protein: 21, carbs: 12, fat: 30 } ] },
  { _id: "685d2f7455242956ff410a90", name: "Bread Jam", aliases: [], category: "bread jam", servings: [ { _id: "685d2f7455242956ff410a91", size: "small", portion_label: "1 small slice bread jam (35g)", diameter_cm: null, weight_g: 35, volume_ml: null, calories: 95, protein: 2, carbs: 18, fat: 1.2 }, { _id: "685d2f7455242956ff410a92", size: "medium", portion_label: "1 medium slice bread jam (45g)", diameter_cm: null, weight_g: 45, volume_ml: null, calories: 120, protein: 2.5, carbs: 22, fat: 1.6 }, { _id: "685d2f7455242956ff410a93", size: "large", portion_label: "1 large slice bread jam (55g)", diameter_cm: null, weight_g: 55, volume_ml: null, calories: 145, protein: 3, carbs: 27, fat: 2 } ] },
  { _id: "685d2f7455242956ff410aa0", name: "Poori", aliases: [], category: "poori", servings: [ { _id: "685d2f7455242956ff410aa1", size: "small", portion_label: "1 small poori (7 cm)", diameter_cm: 7, weight_g: 25, volume_ml: null, calories: 90, protein: 1.5, carbs: 10, fat: 5 }, { _id: "685d2f7455242956ff410aa2", size: "medium", portion_label: "1 medium poori (9 cm)", diameter_cm: 9, weight_g: 35, volume_ml: null, calories: 125, protein: 2.2, carbs: 14, fat: 7 }, { _id: "685d2f7455242956ff410aa3", size: "large", portion_label: "1 large poori (11 cm)", diameter_cm: 11, weight_g: 45, volume_ml: null, calories: 160, protein: 2.8, carbs: 18, fat: 9 } ] },
  { _id: "685d2f7455242956ff410ab0", name: "Buttermilk", aliases: ["chaas"], category: "buttermilk", servings: [ { _id: "685d2f7455242956ff410ab1", size: "small", portion_label: "100ml glass", diameter_cm: null, weight_g: null, volume_ml: 100, calories: 30, protein: 1, carbs: 2.5, fat: 1.2 }, { _id: "685d2f7455242956ff410ab2", size: "medium", portion_label: "200ml glass", diameter_cm: null, weight_g: null, volume_ml: 200, calories: 60, protein: 2, carbs: 5, fat: 2.4 }, { _id: "685d2f7455242956ff410ab3", size: "large", portion_label: "300ml glass", diameter_cm: null, weight_g: null, volume_ml: 300, calories: 90, protein: 3, carbs: 7.5, fat: 3.6 } ] },
  { _id: "685d2f7455242956ff410ac0", name: "Boondi ka Ladoo", aliases: ["Boondi Laddu", "Laddu"], category: "sweet", servings: [ { _id: "685d2f7455242956ff410ac1", size: "small", portion_label: "1 small boondi ladoo (30g)", diameter_cm: null, weight_g: 30, volume_ml: null, calories: 140, protein: 1.5, carbs: 22, fat: 5.5 }, { _id: "685d2f7455242956ff410ac2", size: "medium", portion_label: "1 medium boondi ladoo (45g)", diameter_cm: null, weight_g: 45, volume_ml: null, calories: 210, protein: 2.2, carbs: 33, fat: 8 }, { _id: "685d2f7455242956ff410ac3", size: "large", portion_label: "1 large boondi ladoo (60g)", diameter_cm: null, weight_g: 60, volume_ml: null, calories: 280, protein: 3, carbs: 44, fat: 11 } ] },
  { _id: "685d2f7455242956ff410ad0", name: "Stuffed Paratha", aliases: ["aloo paratha", "paneer paratha", "veg paratha"], category: "paratha", servings: [ { _id: "685d2f7455242956ff410ad1", size: "small", portion_label: "1 small paratha", diameter_cm: 12, weight_g: 80, volume_ml: null, calories: 190, protein: 4, carbs: 25, fat: 8 }, { _id: "685d2f7455242956ff410ad2", size: "medium", portion_label: "1 medium paratha", diameter_cm: 15, weight_g: 100, volume_ml: null, calories: 240, protein: 5.5, carbs: 32, fat: 10 }, { _id: "685d2f7455242956ff410ad3", size: "large", portion_label: "1 large paratha", diameter_cm: 18, weight_g: 130, volume_ml: null, calories: 310, protein: 7, carbs: 42, fat: 13 } ] },
  { _id: "685d2f7455242956ff410ae0", name: "Aloo Sandwich", aliases: ["potato sandwich"], category: "sandwich", servings: [ { _id: "685d2f7455242956ff410ae1", size: "small", portion_label: "1 small aloo sandwich", diameter_cm: null, weight_g: 80, volume_ml: null, calories: 180, protein: 4, carbs: 28, fat: 5.5 }, { _id: "685d2f7455242956ff410ae2", size: "medium", portion_label: "1 medium aloo sandwich", diameter_cm: null, weight_g: 120, volume_ml: null, calories: 270, protein: 6, carbs: 42, fat: 8 }, { _id: "685d2f7455242956ff410ae3", size: "large", portion_label: "1 large aloo sandwich", diameter_cm: null, weight_g: 160, volume_ml: null, calories: 360, protein: 8, carbs: 56, fat: 11 } ] },
  { _id: "685d2f7455242956ff410af0", name: "Sabji-Poori", aliases: ["Aloo Poori", "Poori Bhaji"], category: "combo meal", servings: [ { _id: "685d2f7455242956ff410af1", size: "small", portion_label: "2 poori with sabji (small)", diameter_cm: null, weight_g: 120, volume_ml: null, calories: 280, protein: 4, carbs: 30, fat: 16 }, { _id: "685d2f7455242956ff410af2", size: "medium", portion_label: "3 poori with sabji (medium)", diameter_cm: null, weight_g: 180, volume_ml: null, calories: 420, protein: 6, carbs: 45, fat: 24 }, { _id: "685d2f7455242956ff410af3", size: "large", portion_label: "4 poori with sabji (large)", diameter_cm: null, weight_g: 240, volume_ml: null, calories: 560, protein: 8, carbs: 60, fat: 32 } ] },
  { _id: "685d2f7455242956ff410b00", name: "Bread Omelette", aliases: ["Egg Bread", "Bread with Omelette"], category: "sandwich", servings: [ { _id: "685d2f7455242956ff410b01", size: "small", portion_label: "1 omelette bread", diameter_cm: null, weight_g: 90, volume_ml: null, calories: 180, protein: 7, carbs: 15, fat: 10 }, { _id: "685d2f7455242956ff410b02", size: "medium", portion_label: "2 omelette bread", diameter_cm: null, weight_g: 180, volume_ml: null, calories: 360, protein: 14, carbs: 30, fat: 20 }, { _id: "685d2f7455242956ff410b03", size: "large", portion_label: "3 omelette bread", diameter_cm: null, weight_g: 270, volume_ml: null, calories: 540, protein: 21, carbs: 45, fat: 30 } ] },
  { _id: "685d2f7455242956ff410b10", name: "Papad (Fried)", aliases: ["Fried Papad", "Papadam", "Appalam"], category: "papad", servings: [ { _id: "685d2f7455242956ff410b11", size: "small", portion_label: "1 small fried papad (7 cm)", diameter_cm: 7, weight_g: 7, volume_ml: null, calories: 45, protein: 1.2, carbs: 5, fat: 2.5 }, { _id: "685d2f7455242956ff410b12", size: "medium", portion_label: "1 medium fried papad (9 cm)", diameter_cm: 9, weight_g: 10, volume_ml: null, calories: 65, protein: 1.7, carbs: 7, fat: 4 }, { _id: "685d2f7455242956ff410b13", size: "large", portion_label: "1 large fried papad (11 cm)", diameter_cm: 11, weight_g: 13, volume_ml: null, calories: 85, protein: 2.2, carbs: 9, fat: 5.5 } ] }
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const ops = data.map(item => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: item },
        upsert: true,
      }
    }));

    const result = await Nutrition.bulkWrite(ops);
    console.log('Bulk operation complete.');
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);
    console.log('Upserted:', result.upsertedCount);

    // Detailed log for each item
    data.forEach(item => {
      if (result.upsertedIds && Object.values(result.upsertedIds).find(id => id.toString() === item._id)) {
        console.log(`Created new: ${item.name} (${item._id})`);
      } else {
        console.log(`Updated: ${item.name} (${item._id})`);
      }
    });
  } catch (err) {
    console.error('Error during bulk update:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();

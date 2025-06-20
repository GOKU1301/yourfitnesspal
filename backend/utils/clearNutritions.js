import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function clearNutritionCollection() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Get the collection
    const db = mongoose.connection;
    const result = await db.collection('nutritions').deleteMany({});
    
    console.log(`🧹 Deleted ${result.deletedCount} documents from the nutritions collection.`);
    console.log('✅ Collection cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing the collection:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// Execute the function
clearNutritionCollection();

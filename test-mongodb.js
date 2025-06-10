const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDBConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    console.log('Using MongoDB URI:', mongoUri.replace(/:[^:]*@/, ':***@')); // Hide password in logs

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log('✅ Successfully connected to MongoDB');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);

  } catch (error) {
    console.error('❌ MongoDB connection error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('Network error: Could not resolve the hostname');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused: Check if MongoDB is running and the port is correct');
    } else if (error.code === 'MONGODB_DUPLICATED_KEYS') {
      console.error('Duplicate key error: A document with the same _id already exists');
    }
  } finally {
    // Close the connection after testing
    if (mongoose.connection.readyState === 1) { // 1 = connected
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the test
testMongoDBConnection();

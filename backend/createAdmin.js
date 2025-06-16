import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';

// Load environment variables
dotenv.config();

// Log environment variables (be careful with sensitive data in production)
console.log('Environment Variables:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '*** MongoDB URI is set ***' : 'MONGODB_URI is not set');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

const ADMIN_EMAIL = 'debu1301@gmail.com';
const ADMIN_PASSWORD = 'devansh123'; // In production, use a stronger password

console.log('\n=== Admin Creation Script ===');
console.log(`Attempting to create/verify admin with email: ${ADMIN_EMAIL}`);

async function createAdmin() {
  try {
    console.log('\n1. Attempting to connect to MongoDB...');
    
    // Add connection event listeners
    mongoose.connection.on('connecting', () => {
      console.log('   - Connecting to MongoDB...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('   - Successfully connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('   - MongoDB connection error:', err.message);
    });

    // Connect with timeout and options
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds
    };

    console.log('   - Connection options:', JSON.stringify(connectionOptions, null, 2));
    
    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log('   - MongoDB Connected successfully!');
    console.log('   - MongoDB Host:', mongoose.connection.host);
    console.log('   - MongoDB Database:', mongoose.connection.name);

    // Check if admin already exists
    console.log('\n2. Checking if admin user already exists...');
    console.log('   - Searching for user with email:', ADMIN_EMAIL);
    
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('\n   - Admin user already exists with details:');
      console.log('     - ID:', adminExists._id);
      console.log('     - Email:', adminExists.email);
      console.log('     - Is Admin:', adminExists.isAdmin);
      console.log('     - Created At:', adminExists.date);
      console.log('\n   No action needed. Exiting...');
      process.exit(0);
    }

    console.log('   - No existing admin found. Creating new admin user...');

    // Hash password
    console.log('\n3. Hashing password...');
    const saltRounds = 10;
    console.log('   - Generating salt with', saltRounds, 'rounds...');
    const salt = await bcrypt.genSalt(saltRounds);
    console.log('   - Salt generated successfully');
    
    console.log('   - Hashing password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    console.log('   - Password hashed successfully');

    // Create admin user
    console.log('\n4. Creating admin user in database...');
    const admin = new User({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      isAdmin: true
    });

    console.log('   - User object created, attempting to save...');
    await admin.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('==================================');
    console.log('Admin Credentials:');
    console.log('------------------');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('==================================');
    console.log('\n✅ Script completed successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error creating admin user:');
    console.error('----------------------------------');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    
    if (err.code) {
      console.error('Error Code:', err.code);
    }
    
    if (err.keyPattern) {
      console.error('Key Pattern:', err.keyPattern);
    }
    
    if (err.keyValue) {
      console.error('Key Value:', err.keyValue);
    }
    
    console.error('\nStack Trace:');
    console.error('------------');
    console.error(err.stack);
    
    process.exit(1);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) { // 1 = connected
      console.log('\nClosing MongoDB connection...');
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
console.log('\nStarting admin creation process...');
createAdmin();


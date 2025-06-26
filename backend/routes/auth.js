import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// CORS is now handled at the application level in server.js
// No need for route-specific CORS handling

/**
 * @route   POST api/auth/register
 * @desc    Register a user
 * @access  Public
 */
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Create new user
      user = new User({
        name,
        email,
        password
      });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save user to database
      await user.save();

      // Generate JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    console.log('\n=== Login Request ===');
    console.log('Headers:', req.headers);
    console.log('Body:', { email: req.body.email, password: '***' });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log(`Attempting login for user: ${email}`);

    try {
      // Check if user exists
      console.log('Looking up user in database...');
      console.log('Mongoose connection state:', mongoose.connection.readyState); // 1 = connected
      console.log('Available collections:', await mongoose.connection.db.listCollections().toArray());
      
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log('User not found');
        return res.status(400).json({ 
          errors: [{ 
            msg: 'Invalid credentials',
            type: 'email'
          }] 
        });
      }

      console.log('User found:', {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin
      });

      // Check if password matches
      console.log('Verifying password...');
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log('Password does not match');
        return res.status(400).json({ 
          errors: [{ 
            msg: 'Invalid credentials',
            type: 'password'
          }] 
        });
      }

      console.log('Password verified successfully');

      // Generate JWT token
      const payload = {
        user: {
          id: user.id,
          isAdmin: user.isAdmin || false
        }
      };

      console.log('Generating JWT token...');
      
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('NEXTAUTH_SECRET is not set');
        return res.status(500).json({ 
          errors: [{ msg: 'Server configuration error' }] 
        });
      }

      jwt.sign(
        payload,
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) {
            console.error('JWT Error:', err);
            return res.status(500).json({ errors: [{ msg: 'Error generating token' }] });
          }
          console.log('Login successful, token generated');
          res.json({ 
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              isAdmin: user.isAdmin || false
            }
          });
        }
      );
    } catch (err) {
      console.error('Login Error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      res.status(500).json({ 
        errors: [{ 
          msg: 'Server error',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        }] 
      });
    }
  }
);

/**
 * @route   GET api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    console.log('User from token:', req.user);
    // Get user from database (excluding password)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

export default router;

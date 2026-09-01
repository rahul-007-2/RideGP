const User = require('../models/User');
const Streak = require('../models/Streak');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = '7d';

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      name,
      password_hash: password // Will be hashed by pre-save hook
    });

    await user.save();

    // Create streak record
    const streak = new Streak({
      user_id: user._id
    });
    await streak.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.getPublicProfile(),
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      message: 'Login successful',
      user: user.getPublicProfile(),
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.getPublicProfile() });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { name, phone_number, bike_model, bike_details, home_location, office_location, commute_route, fuel_efficiency_kmpl, fuel_price_per_liter, profile_picture_url } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user info
    if (name) user.name = name;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (bike_model) user.bike_model = bike_model;
    if (home_location) user.home_location = home_location;
    if (office_location) user.office_location = office_location;
    if (commute_route) user.commute_route = commute_route;
    if (fuel_efficiency_kmpl) user.fuel_efficiency_kmpl = fuel_efficiency_kmpl;
    if (fuel_price_per_liter) user.fuel_price_per_liter = fuel_price_per_liter;
    if (profile_picture_url) user.profile_picture_url = profile_picture_url;

    // Update bike details
    if (bike_details) {
      user.bike_details = {
        ...user.bike_details,
        ...bike_details
      };
      // Sync to legacy fields for backward compatibility
      if (bike_details.fuel_efficiency_kmpl) user.fuel_efficiency_kmpl = bike_details.fuel_efficiency_kmpl;
      if (bike_details.fuel_price_per_liter) user.fuel_price_per_liter = bike_details.fuel_price_per_liter;
    }

    user.updated_at = new Date();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};

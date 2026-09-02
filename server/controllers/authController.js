const User = require('../models/User');
const Streak = require('../models/Streak');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      email,
      name,
      password_hash: password
    });

    await user.save();

    const streak = new Streak({ user_id: user._id });
    await streak.save();

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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Auto-migrate legacy bike_details into bikes array
    await migrateBikeDetails(user);

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
 * Auto-migrate legacy single bike_details into bikes array
 */
async function migrateBikeDetails(user) {
  if (user.bikes && user.bikes.length > 0) return; // Already migrated

  const bd = user.bike_details;
  const hasBikeData = bd && (bd.make || bd.model || bd.registration_number);

  if (hasBikeData) {
    const bikeId = crypto.randomUUID();
    user.bikes = [{
      bike_id: bikeId,
      nickname: bd.model || bd.make || 'My Bike',
      make: bd.make || '',
      model: bd.model || '',
      year: bd.year || null,
      color: bd.color || '',
      registration_number: bd.registration_number || '',
      fuel_efficiency_kmpl: bd.fuel_efficiency_kmpl || user.fuel_efficiency_kmpl || 40,
      fuel_price_per_liter: bd.fuel_price_per_liter || user.fuel_price_per_liter || 90,
      last_service_date: bd.last_service_date || null
    }];
    user.active_bike_id = bikeId;
    await user.save();
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

    // Auto-migrate if needed
    await migrateBikeDetails(user);

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
    const {
      name, phone_number, profile_picture_url,
      // Legacy single-bike fields (backward compat)
      bike_model, bike_details, home_location, office_location, commute_route,
      fuel_efficiency_kmpl, fuel_price_per_liter,
      // New multi-bike fields
      bikes, active_bike_id
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (profile_picture_url) user.profile_picture_url = profile_picture_url;
    if (home_location) user.home_location = home_location;
    if (office_location) user.office_location = office_location;
    if (commute_route) user.commute_route = commute_route;

    // Multi-bike updates
    if (bikes !== undefined) {
      user.bikes = bikes;
    }
    if (active_bike_id !== undefined) {
      user.active_bike_id = active_bike_id;
    }

    // Legacy single-bike updates (kept for backward compat)
    if (bike_model) user.bike_model = bike_model;
    if (fuel_efficiency_kmpl) user.fuel_efficiency_kmpl = fuel_efficiency_kmpl;
    if (fuel_price_per_liter) user.fuel_price_per_liter = fuel_price_per_liter;
    if (bike_details) {
      user.bike_details = { ...user.bike_details, ...bike_details };
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

/**
 * Add a bike to the garage
 */
async function addBike(req, res) {
  try {
    const userId = req.user.userId;
    const { nickname, make, model, year, color, registration_number, fuel_efficiency_kmpl, fuel_price_per_liter, last_service_date } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bikeId = crypto.randomUUID();
    const bike = {
      bike_id: bikeId,
      nickname: nickname || model || make || 'New Bike',
      make: make || '',
      model: model || '',
      year: year || null,
      color: color || '',
      registration_number: registration_number || '',
      fuel_efficiency_kmpl: fuel_efficiency_kmpl || 40,
      fuel_price_per_liter: fuel_price_per_liter || 90,
      last_service_date: last_service_date || null
    };

    user.bikes.push(bike);

    // Auto-select as active if first bike
    if (user.bikes.length === 1 || !user.active_bike_id) {
      user.active_bike_id = bikeId;
    }

    await user.save();

    res.json({
      message: 'Bike added successfully',
      bike,
      active_bike_id: user.active_bike_id,
      bikes: user.bikes
    });
  } catch (err) {
    console.error('Add bike error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update a bike in the garage
 */
async function updateBike(req, res) {
  try {
    const userId = req.user.userId;
    const { bikeId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bikeIndex = user.bikes.findIndex(b => b.bike_id === bikeId);
    if (bikeIndex === -1) return res.status(404).json({ error: 'Bike not found' });

    // Update bike fields
    const allowedFields = ['nickname', 'make', 'model', 'year', 'color', 'registration_number', 'fuel_efficiency_kmpl', 'fuel_price_per_liter', 'last_service_date'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        user.bikes[bikeIndex][field] = updates[field];
      }
    }

    await user.save();

    res.json({
      message: 'Bike updated successfully',
      bike: user.bikes[bikeIndex],
      bikes: user.bikes
    });
  } catch (err) {
    console.error('Update bike error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Remove a bike from the garage
 */
async function removeBike(req, res) {
  try {
    const userId = req.user.userId;
    const { bikeId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.bikes = user.bikes.filter(b => b.bike_id !== bikeId);

    // Re-select active bike if needed
    if (user.active_bike_id === bikeId) {
      user.active_bike_id = user.bikes.length > 0 ? user.bikes[0].bike_id : null;
    }

    await user.save();

    res.json({
      message: 'Bike removed',
      active_bike_id: user.active_bike_id,
      bikes: user.bikes
    });
  } catch (err) {
    console.error('Remove bike error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Set active bike
 */
async function setActiveBike(req, res) {
  try {
    const userId = req.user.userId;
    const { bikeId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bike = user.bikes.find(b => b.bike_id === bikeId);
    if (!bike) return res.status(404).json({ error: 'Bike not found' });

    user.active_bike_id = bikeId;
    await user.save();

    res.json({
      message: 'Active bike updated',
      active_bike_id: bikeId,
      bikes: user.bikes
    });
  } catch (err) {
    console.error('Set active bike error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  addBike,
  updateBike,
  removeBike,
  setActiveBike
};

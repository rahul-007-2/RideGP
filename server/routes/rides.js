const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ridesController = require('../controllers/ridesController');
const SavedRoute = require('../models/SavedRoute');

// All rides routes are protected
router.use(authenticateToken);

// Create a new ride
router.post('/', ridesController.createRide);

// Get a single ride
router.get('/:rideId', ridesController.getRide);

// Get user's rides (with pagination and filtering)
router.get('/', ridesController.getUserRides);

// Get rides by date range
router.get('/history/range', ridesController.getRidesByDateRange);

// Compare rides
router.post('/compare', ridesController.compareRides);

// Update a ride
router.put('/:rideId', ridesController.updateRide);

// ─── Saved Routes ──────────────────────────────────────────────

// Get all saved routes for user
router.get('/saved-routes/list', async (req, res) => {
  try {
    const routes = await SavedRoute.find({ user_id: req.user.userId })
      .sort({ updated_at: -1 });
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a route from a ride
router.post('/saved-routes', async (req, res) => {
  try {
    const { name, ride_id, geo, origin, destination, distance_km } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Route name is required' });
    }
    const route = new SavedRoute({
      user_id: req.user.userId,
      name: name.trim(),
      geo: geo || [],
      origin: origin || null,
      destination: destination || null,
      distance_km: distance_km || 0,
      ride_id: ride_id || undefined,
    });
    await route.save();
    res.status(201).json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a saved route
router.delete('/saved-routes/:routeId', async (req, res) => {
  try {
    await SavedRoute.findOneAndDelete({ _id: req.params.routeId, user_id: req.user.userId });
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

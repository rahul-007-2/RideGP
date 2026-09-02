const Ride = require('../models/Ride');
const User = require('../models/User');
const RouteCohort = require('../models/RouteCohort');
const { computeRideMetrics, computeRideScore, estimateFuelCost, hashCoordinates, isCommuteDay } = require('../config/rideUtils');

/**
 * Create/ingest a new ride
 */
async function createRide(req, res) {
  try {
    const userId = req.user.userId;
    const { metrics, geo, fuel_cost, score, route_name, origin, destination, ride_type, bike_id, bike_name } = req.body;

    if (!geo || geo.length < 2) {
      return res.status(400).json({ error: 'Ride must have at least 2 GPS points' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate metrics if not provided
    let calculatedMetrics = metrics;
    let calculatedScore = score;

    if (!calculatedMetrics) {
      calculatedMetrics = computeRideMetrics(geo);
    }

    if (!calculatedScore) {
      const scoreObj = computeRideScore(calculatedMetrics, {
        fuelEfficiency: user.fuel_efficiency_kmpl
      });
      calculatedScore = scoreObj.total_score;
    }

    // Estimate fuel cost if not provided
    let calculatedFuelCost = fuel_cost;
    if (!calculatedFuelCost && calculatedMetrics.distance_km) {
      calculatedFuelCost = estimateFuelCost(
        calculatedMetrics.distance_km,
        user.fuel_efficiency_kmpl,
        user.fuel_price_per_liter
      );
    }

    const startTime = new Date(geo[0].timestamp);
    const endTime = new Date(geo[geo.length - 1].timestamp);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startTime.getDay()];

    const ride = new Ride({
      user_id: userId,
      metrics: calculatedMetrics,
      geo,
      fuel_cost: calculatedFuelCost,
      score: calculatedScore,
      route_name: route_name || 'Unknown Route',
      origin,
      destination,
      start_time: startTime,
      end_time: endTime,
      day_of_week: dayOfWeek,
      ride_type: ride_type || 'commute',
      is_commute: isCommuteDay(startTime),
      bike_id: bike_id || null,
      bike_name: bike_name || ''
    });

    await ride.save();

    // Update user statistics
    user.total_rides += 1;
    user.total_distance_km += calculatedMetrics.distance_km || 0;
    user.total_ride_time_minutes += calculatedMetrics.duration_minutes || 0;
    user.average_ride_score = (user.average_ride_score * (user.total_rides - 1) + calculatedScore) / user.total_rides;
    await user.save();

    // Update route cohort if origin and destination provided
    if (origin && destination) {
      const originHash = hashCoordinates(origin.latitude, origin.longitude);
      const destHash = hashCoordinates(destination.latitude, destination.longitude);
      
      let cohort = await RouteCohort.findOne({
        origin_hash: originHash,
        destination_hash: destHash
      });

      if (!cohort) {
        cohort = new RouteCohort({
          route_name: route_name || 'Unknown Route',
          origin_hash: originHash,
          destination_hash: destHash,
          user_ids: [userId]
        });
      } else {
        if (!cohort.user_ids.includes(userId)) {
          cohort.user_ids.push(userId);
          cohort.stats.total_riders = cohort.user_ids.length;
        }
      }

      // Update cohort statistics
      cohort.stats.total_rides += 1;
      cohort.stats.average_commute_time_minutes = 
        (cohort.stats.average_commute_time_minutes * (cohort.stats.total_rides - 1) + (calculatedMetrics.duration_minutes || 0)) / cohort.stats.total_rides;
      cohort.stats.average_speed_kmh = 
        (cohort.stats.average_speed_kmh * (cohort.stats.total_rides - 1) + (calculatedMetrics.average_speed_kmh || 0)) / cohort.stats.total_rides;
      cohort.stats.average_distance_km = 
        (cohort.stats.average_distance_km * (cohort.stats.total_rides - 1) + (calculatedMetrics.distance_km || 0)) / cohort.stats.total_rides;
      cohort.stats.average_traffic_stops = 
        (cohort.stats.average_traffic_stops * (cohort.stats.total_rides - 1) + (calculatedMetrics.traffic_stops || 0)) / cohort.stats.total_rides;

      const hour = startTime.getHours();
      if (!cohort.stats.most_common_departure_hour) {
        cohort.stats.most_common_departure_hour = hour;
      }

      cohort.last_updated = new Date();
      await cohort.save();
    }

    res.status(201).json({
      message: 'Ride created successfully',
      ride: ride.toObject()
    });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get a single ride
 */
async function getRide(req, res) {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Verify ownership
    if (ride.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ ride: ride.toObject() });
  } catch (err) {
    console.error('Get ride error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user's rides (with pagination and filtering)
 */
async function getUserRides(req, res) {
  try {
    const userId = req.user.userId;
    const { limit = 20, skip = 0, is_commute } = req.query;

    const query = { user_id: userId };
    if (is_commute !== undefined) {
      query.is_commute = is_commute === 'true';
    }

    const rides = await Ride.find(query)
      .sort({ start_time: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Ride.countDocuments(query);

    res.json({
      rides,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });
  } catch (err) {
    console.error('Get rides error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Compare two or more rides
 */
async function compareRides(req, res) {
  try {
    const userId = req.user.userId;
    const { rideIds } = req.body;

    if (!rideIds || !Array.isArray(rideIds) || rideIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 ride IDs required' });
    }

    const rides = await Ride.find({
      _id: { $in: rideIds },
      user_id: userId
    });

    if (rides.length !== rideIds.length) {
      return res.status(403).json({ error: 'Unauthorized or ride not found' });
    }

    // Calculate comparison metrics
    const comparison = {
      rides: rides.map(r => ({
        id: r._id,
        date: r.start_time,
        distance_km: r.metrics.distance_km,
        duration_minutes: r.metrics.duration_minutes,
        average_speed_kmh: r.metrics.average_speed_kmh,
        top_speed_kmh: r.metrics.top_speed_kmh,
        fuel_cost: r.fuel_cost,
        score: r.score,
        traffic_stops: r.metrics.traffic_stops
      })),
      averages: {
        distance_km: rides.reduce((sum, r) => sum + (r.metrics.distance_km || 0), 0) / rides.length,
        duration_minutes: rides.reduce((sum, r) => sum + (r.metrics.duration_minutes || 0), 0) / rides.length,
        average_speed_kmh: rides.reduce((sum, r) => sum + (r.metrics.average_speed_kmh || 0), 0) / rides.length,
        fuel_cost: rides.reduce((sum, r) => sum + (r.fuel_cost || 0), 0) / rides.length,
        score: rides.reduce((sum, r) => sum + (r.score || 0), 0) / rides.length,
        traffic_stops: rides.reduce((sum, r) => sum + (r.metrics.traffic_stops || 0), 0) / rides.length
      }
    };

    res.json(comparison);
  } catch (err) {
    console.error('Compare rides error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get rides by date range
 */
async function getRidesByDateRange(req, res) {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const rides = await Ride.find({
      user_id: userId,
      start_time: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ start_time: -1 });

    res.json({ rides });
  } catch (err) {
    console.error('Get rides by date range error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createRide,
  getRide,
  getUserRides,
  compareRides,
  getRidesByDateRange
};

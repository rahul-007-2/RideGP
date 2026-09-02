const User = require('../models/User');
const Ride = require('../models/Ride');
const Achievement = require('../models/Achievement');
const Streak = require('../models/Streak');
const { isCommuteDay, getMonthYear } = require('../config/rideUtils');

const ACHIEVEMENT_DEFINITIONS = {
  early_bird: {
    title: 'Early Bird 🌅',
    description: '5 rides before 6 AM',
    check: async (userId) => {
      const rides = await Ride.find({
        user_id: userId,
        start_time: { $exists: true }
      });
      const earlyRides = rides.filter(r => r.start_time.getHours() < 6).length;
      return earlyRides >= 5;
    }
  },
  smooth_operator: {
    title: 'Smooth Operator 🎯',
    description: 'Average ride score > 85 on 10 rides',
    check: async (userId) => {
      const rides = await Ride.find({
        user_id: userId,
        is_completed: true
      }).sort({ created_at: -1 }).limit(10);
      if (rides.length < 10) return false;
      const avgScore = rides.reduce((sum, r) => sum + (r.score || 0), 0) / rides.length;
      return avgScore > 85;
    }
  },
  fuel_saver: {
    title: 'Fuel Saver ⛽',
    description: 'Lowest fuel cost in your route cohort',
    check: async (userId) => {
      const user = await User.findById(userId);
      if (!user) return false;
      // This would require cohort comparison - simplified for now
      return user.average_ride_score > 75;
    }
  },
  route_master: {
    title: 'Route Master 🗺️',
    description: '20 rides on same route',
    check: async (userId) => {
      const rides = await Ride.find({ user_id: userId });
      const routeCounts = {};
      rides.forEach(r => {
        const route = r.route_name || 'Unknown';
        routeCounts[route] = (routeCounts[route] || 0) + 1;
      });
      return Object.values(routeCounts).some(count => count >= 20);
    }
  },
  consistent_commuter: {
    title: 'Consistent Commuter 📅',
    description: '30-day ride streak',
    check: async (userId) => {
      const streak = await Streak.findOne({ user_id: userId });
      return streak && streak.current_streak_count >= 30;
    }
  },
  night_rider: {
    title: 'Night Rider 🌙',
    description: '10 rides after 8 PM',
    check: async (userId) => {
      const rides = await Ride.find({ user_id: userId });
      const nightRides = rides.filter(r => r.start_time && r.start_time.getHours() >= 20).length;
      return nightRides >= 10;
    }
  },
  speed_demon: {
    title: 'Speed Demon 🏍️',
    description: 'Reached top speed > 100 km/h',
    check: async (userId) => {
      const rides = await Ride.find({ user_id: userId });
      return rides.some(r => r.metrics && r.metrics.top_speed_kmh > 100);
    }
  },
  distance_warrior: {
    title: 'Distance Warrior 🛣️',
    description: '500 km in a month',
    check: async (userId) => {
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      const rides = await Ride.find({
        user_id: userId,
        start_time: { $gte: monthAgo }
      });
      const totalDistance = rides.reduce((sum, r) => sum + (r.metrics?.distance_km || 0), 0);
      return totalDistance >= 500;
    }
  },
  environmental_champion: {
    title: 'Environmental Champion ♻️',
    description: 'Saved most fuel in month (lowest fuel cost)',
    check: async (userId) => {
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      const rides = await Ride.find({
        user_id: userId,
        start_time: { $gte: monthAgo }
      });
      const totalFuelCost = rides.reduce((sum, r) => sum + (r.fuel_cost || 0), 0);
      // Simplified: check if user spent less than average
      return totalFuelCost < 5000; // Adjust threshold as needed
    }
  },
  century_club: {
    title: 'Century Club 💯',
    description: '100 total rides',
    check: async (userId) => {
      const user = await User.findById(userId);
      return user && user.total_rides >= 100;
    }
  }
};

/**
 * Check and unlock achievements for user
 */
async function checkAchievements(req, res) {
  try {
    const userId = req.user.userId;
    const unlockedAchievements = [];

    for (const [type, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
      const exists = await Achievement.findOne({
        user_id: userId,
        achievement_type: type
      });

      if (!exists) {
        const isUnlocked = await definition.check(userId);
        if (isUnlocked) {
          const achievement = new Achievement({
            user_id: userId,
            achievement_type: type,
            title: definition.title,
            description: definition.description
          });
          await achievement.save();
          unlockedAchievements.push(achievement.toObject());
        }
      }
    }

    res.json({
      message: 'Achievement check complete',
      newAchievements: unlockedAchievements,
      count: unlockedAchievements.length
    });
  } catch (err) {
    console.error('Check achievements error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user's achievements
 */
async function getAchievements(req, res) {
  try {
    const userId = req.user.userId;
    const achievements = await Achievement.find({ user_id: userId }).sort({ unblocked_at: -1 });

    res.json({
      achievements,
      count: achievements.length,
      total_possible: Object.keys(ACHIEVEMENT_DEFINITIONS).length
    });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update ride streak
 */
async function updateStreak(req, res) {
  try {
    const userId = req.user.userId;
    const { rideDate } = req.body;

    if (!rideDate) {
      return res.status(400).json({ error: 'rideDate is required' });
    }

    const streak = await Streak.findOne({ user_id: userId });
    if (!streak) {
      return res.status(404).json({ error: 'Streak record not found' });
    }

    const lastRide = new Date(rideDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if ride qualifies for streak (commute day)
    if (!isCommuteDay(lastRide)) {
      return res.json({ message: 'Ride does not qualify for commute streak' });
    }

    // Check if streak continues or resets
    if (streak.last_ride_date) {
      const lastRideDate = new Date(streak.last_ride_date);
      lastRideDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - lastRideDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1 || (daysDiff === 3 && lastRideDate.getDay() === 5)) {
        // Streak continues (next day, or Monday after Friday)
        streak.current_streak_count += 1;
      } else if (daysDiff > 1) {
        // Streak resets
        if (streak.current_streak_count > streak.best_streak_count) {
          streak.best_streak_count = streak.current_streak_count;
          streak.best_streak_end_date = streak.last_ride_date;
        }
        streak.current_streak_count = 1;
        streak.streak_start_date = today;
      }
    } else {
      // First ride
      streak.current_streak_count = 1;
      streak.streak_start_date = today;
    }

    // Always ensure best >= current
    if (streak.current_streak_count > streak.best_streak_count) {
      streak.best_streak_count = streak.current_streak_count;
    }
    streak.last_ride_date = lastRide;
    streak.updated_at = new Date();
    await streak.save();

    // Update user streak info
    const user = await User.findById(userId);
    user.current_streak = streak.current_streak_count;
    user.best_streak = streak.best_streak_count;
    await user.save();

    res.json({
      message: 'Streak updated',
      streak: {
        current_streak: streak.current_streak_count,
        best_streak: streak.best_streak_count,
        last_ride_date: streak.last_ride_date
      }
    });
  } catch (err) {
    console.error('Update streak error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user's streak info
 */
async function getStreak(req, res) {
  try {
    const userId = req.user.userId;
    const streak = await Streak.findOne({ user_id: userId });

    if (!streak) {
      return res.status(404).json({ error: 'Streak not found' });
    }

    res.json({ streak: streak.toObject() });
  } catch (err) {
    console.error('Get streak error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  checkAchievements,
  getAchievements,
  updateStreak,
  getStreak
};

const User = require('../models/User');
const Ride = require('../models/Ride');
const RouteCohort = require('../models/RouteCohort');
const MonthlyWrapped = require('../models/MonthlyWrapped');
const { hashCoordinates, getMonthYear } = require('../config/rideUtils');

/**
 * Get community stats for a route
 */
async function getRouteCommunityStats(req, res) {
  try {
    const userId = req.user.userId;
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Origin and destination coordinates required' });
    }

    const originHash = hashCoordinates(parseFloat(originLat), parseFloat(originLng));
    const destHash = hashCoordinates(parseFloat(destLat), parseFloat(destLng));

    let cohort = await RouteCohort.findOne({
      origin_hash: originHash,
      destination_hash: destHash
    });

    if (!cohort) {
      return res.status(404).json({ error: 'No community data for this route yet' });
    }

    res.json({
      route_name: cohort.route_name,
      community_stats: cohort.stats,
      total_riders: cohort.stats.total_riders,
      total_rides: cohort.stats.total_rides
    });
  } catch (err) {
    console.error('Get route community stats error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get all routes for current user (with community stats)
 */
async function getUserRoutes(req, res) {
  try {
    const userId = req.user.userId;

    const rides = await Ride.find({ user_id: userId }).sort({ start_time: -1 });

    const routeMap = {};
    for (const ride of rides) {
      if (ride.route_name) {
        if (!routeMap[ride.route_name]) {
          routeMap[ride.route_name] = {
            route_name: ride.route_name,
            total_rides: 0,
            avg_score: 0,
            last_ridden: ride.start_time,
            origin: ride.origin,
            destination: ride.destination,
            scores: []
          };
        }
        routeMap[ride.route_name].total_rides += 1;
        routeMap[ride.route_name].scores.push(ride.score);
        if (!routeMap[ride.route_name].last_ridden || ride.start_time > routeMap[ride.route_name].last_ridden) {
          routeMap[ride.route_name].last_ridden = ride.start_time;
        }
      }
    }

    // Calculate averages
    const routes = Object.values(routeMap).map(route => ({
      ...route,
      avg_score: route.scores.length > 0 ? (route.scores.reduce((a, b) => a + b, 0) / route.scores.length) : 0,
      scores: undefined // Remove scores array
    })).sort((a, b) => b.last_ridden - a.last_ridden);

    res.json({ routes });
  } catch (err) {
    console.error('Get user routes error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get commute insights
 */
async function getCommuteInsights(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rides = await Ride.find({
      user_id: userId,
      is_commute: true
    }).sort({ start_time: -1 }).limit(30); // Last 30 commute rides

    if (rides.length === 0) {
      return res.json({ insights: { message: 'No commute data yet' } });
    }

    // Detect typical departure time
    const departureTimes = rides.map(r => r.start_time.getHours());
    const avgDepartureHour = Math.round(departureTimes.reduce((a, b) => a + b, 0) / departureTimes.length);

    // Compare today's ride to average (if exists)
    const today = new Date();
    const todayRide = rides.find(r => {
      const rDate = new Date(r.start_time);
      return rDate.getDate() === today.getDate() &&
             rDate.getMonth() === today.getMonth() &&
             rDate.getFullYear() === today.getFullYear();
    });

    let todayComparison = null;
    if (todayRide && rides.length > 1) {
      const otherRides = rides.filter(r => r._id !== todayRide._id);
      const avgSpeed = otherRides.reduce((sum, r) => sum + (r.metrics?.average_speed_kmh || 0), 0) / otherRides.length;
      const avgStops = otherRides.reduce((sum, r) => sum + (r.metrics?.traffic_stops || 0), 0) / otherRides.length;

      todayComparison = {
        speed_diff_percent: ((todayRide.metrics?.average_speed_kmh || 0 - avgSpeed) / avgSpeed * 100).toFixed(1),
        stops_diff: (todayRide.metrics?.traffic_stops || 0) - avgStops,
        fuel_cost_diff: (todayRide.fuel_cost || 0).toFixed(2)
      };
    }

    // Cost savings trend
    const lastRideCost = rides[0]?.fuel_cost || 0;
    const prevRideCost = rides[1]?.fuel_cost || 0;
    const costSavings = prevRideCost - lastRideCost;

    // Route congestion window
    const peakHours = {};
    rides.forEach(r => {
      const hour = r.start_time.getHours();
      peakHours[hour] = (peakHours[hour] || 0) + 1;
    });
    const congestionHour = Object.keys(peakHours).reduce((a, b) => peakHours[a] > peakHours[b] ? a : b, 0);

    res.json({
      insights: {
        typical_departure_time: `${avgDepartureHour}:00`,
        today_comparison: todayComparison,
        cost_savings_vs_last_ride: costSavings.toFixed(2),
        peak_traffic_hour: `${congestionHour}:00 - ${parseInt(congestionHour) + 1}:00`,
        total_commutes_tracked: rides.length
      }
    });
  } catch (err) {
    console.error('Get commute insights error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get smart insights
 */
async function getSmartInsights(req, res) {
  try {
    const userId = req.user.userId;

    const rides = await Ride.find({ user_id: userId }).sort({ start_time: -1 }).limit(100);

    if (rides.length < 5) {
      return res.json({ insights: { message: 'Need more ride data for insights' } });
    }

    // Recommended departure time (find hour with best average score)
    const hourScores = {};
    rides.forEach(r => {
      const hour = r.start_time.getHours();
      if (!hourScores[hour]) hourScores[hour] = [];
      hourScores[hour].push(r.score || 0);
    });

    let bestHour = null;
    let bestAvgScore = 0;
    for (const [hour, scores] of Object.entries(hourScores)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvgScore) {
        bestAvgScore = avg;
        bestHour = hour;
      }
    }

    // Idle time proportion
    const totalIdleTime = rides.reduce((sum, r) => sum + (r.metrics?.idle_time_minutes || 0), 0);
    const totalDuration = rides.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0);
    const idleTimeProportion = totalDuration > 0 ? ((totalIdleTime / totalDuration) * 100).toFixed(1) : 0;

    // Month-over-month improvement
    const now = new Date();
    const thisMonth = rides.filter(r => {
      const rDate = new Date(r.start_time);
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    });
    
    const lastMonth = rides.filter(r => {
      const rDate = new Date(r.start_time);
      const prevMonth = new Date(now);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      return rDate.getMonth() === prevMonth.getMonth() && rDate.getFullYear() === prevMonth.getFullYear();
    });

    let improvement = null;
    if (thisMonth.length > 0 && lastMonth.length > 0) {
      const thisMonthAvg = thisMonth.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0) / thisMonth.length;
      const lastMonthAvg = lastMonth.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0) / lastMonth.length;
      improvement = ((lastMonthAvg - thisMonthAvg) / lastMonthAvg * 100).toFixed(1);
    }

    res.json({
      insights: {
        recommended_departure_time: `${bestHour}:00 (Avg score: ${bestAvgScore.toFixed(1)})`,
        idle_time_percentage: `${idleTimeProportion}% of rides spent idle`,
        month_over_month_improvement: improvement ? `${improvement}% faster commute times` : 'Insufficient data'
      }
    });
  } catch (err) {
    console.error('Get smart insights error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get or generate monthly wrapped
 */
async function getMonthlyWrapped(req, res) {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    const now = new Date();
    const targetMonth = parseInt(month) || now.getMonth() + 1;
    const targetYear = parseInt(year) || now.getFullYear();

    // Check if wrapped already exists
    let wrapped = await MonthlyWrapped.findOne({
      user_id: userId,
      month: targetMonth,
      year: targetYear
    }).populate('best_ride_id average_ride_id longest_ride_id achievements_unlocked');

    if (!wrapped) {
      // Generate wrapped
      const monthStart = new Date(targetYear, targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth, 0);

      const rides = await Ride.find({
        user_id: userId,
        start_time: { $gte: monthStart, $lte: monthEnd }
      }).sort({ score: -1 });

      if (rides.length === 0) {
        return res.status(404).json({ error: 'No rides in this month' });
      }

      const totalDistance = rides.reduce((sum, r) => sum + (r.metrics?.distance_km || 0), 0);
      const totalTime = rides.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0);
      const totalCost = rides.reduce((sum, r) => sum + (r.fuel_cost || 0), 0);
      const avgScore = rides.reduce((sum, r) => sum + (r.score || 0), 0) / rides.length;

      const bestRide = rides[0];
      const sortedByDistance = [...rides].sort((a, b) => (b.metrics?.distance_km || 0) - (a.metrics?.distance_km || 0));
      const longestRide = sortedByDistance[0];

      // Calculate percentiles (simplified)
      const smoothnessPercentile = Math.round((avgScore / 100) * 100);

      wrapped = new MonthlyWrapped({
        user_id: userId,
        month: targetMonth,
        year: targetYear,
        total_distance_km: Math.round(totalDistance * 100) / 100,
        total_riding_time_minutes: Math.round(totalTime * 100) / 100,
        total_fuel_cost: Math.round(totalCost * 100) / 100,
        total_rides: rides.length,
        average_ride_score: Math.round(avgScore * 100) / 100,
        best_ride_id: bestRide._id,
        best_ride_score: bestRide.score,
        longest_ride_id: longestRide._id,
        longest_ride_distance: longestRide.metrics?.distance_km,
        most_used_route: 'Top Route', // Simplified
        smoothness_percentile: smoothnessPercentile
      });

      await wrapped.save();
    }

    res.json({ wrapped: wrapped.toObject() });
  } catch (err) {
    console.error('Get monthly wrapped error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getRouteCommunityStats,
  getUserRoutes,
  getCommuteInsights,
  getSmartInsights,
  getMonthlyWrapped
};

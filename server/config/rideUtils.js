/**
 * Compute ride metrics from GPS points
 */
function computeRideMetrics(geoPoints) {
  if (!geoPoints || geoPoints.length < 2) {
    return {
      distance_km: 0,
      duration_minutes: 0,
      average_speed_kmh: 0,
      top_speed_kmh: 0,
      traffic_stops: 0,
      idle_time_minutes: 0
    };
  }

  let distance_km = 0;
  let top_speed_kmh = 0;
  let traffic_stops = 0;
  let idle_time_ms = 0;
  let stopped_start = null;

  // Calculate distance and identify stops
  for (let i = 1; i < geoPoints.length; i++) {
    const prev = geoPoints[i - 1];
    const curr = geoPoints[i];
    
    // Haversine distance
    const lat1 = prev.latitude * Math.PI / 180;
    const lat2 = curr.latitude * Math.PI / 180;
    const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
    const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const R = 6371; // Earth's radius in km
    distance_km += R * c;
    
    // Track speed
    const speed = curr.speed_kmh || 0;
    if (speed > top_speed_kmh) top_speed_kmh = speed;
    
    // Detect stops (speed < 5 km/h for more than 30 seconds)
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
    if (speed < 5) {
      if (!stopped_start) {
        stopped_start = prev.timestamp;
      }
    } else {
      if (stopped_start) {
        const stoppedDuration = (prev.timestamp - stopped_start) / 1000; // seconds
        if (stoppedDuration > 30) {
          traffic_stops++;
          idle_time_ms += (prev.timestamp - stopped_start);
        }
        stopped_start = null;
      }
    }
  }

  const duration_ms = geoPoints[geoPoints.length - 1].timestamp - geoPoints[0].timestamp;
  const duration_minutes = duration_ms / 60000;
  const average_speed_kmh = duration_minutes > 0 ? (distance_km / duration_minutes) * 60 : 0;
  const idle_time_minutes = idle_time_ms / 60000;

  return {
    distance_km: Math.round(distance_km * 100) / 100,
    duration_minutes: Math.round(duration_minutes * 100) / 100,
    average_speed_kmh: Math.round(average_speed_kmh * 100) / 100,
    top_speed_kmh: Math.round(top_speed_kmh * 100) / 100,
    traffic_stops: traffic_stops,
    idle_time_minutes: Math.round(idle_time_minutes * 100) / 100
  };
}

/**
 * Compute ride score based on multiple factors (0-100)
 */
function computeRideScore(metrics, userConfig = {}) {
  const fuelEfficiency = userConfig.fuelEfficiency || 40; // km/l
  const scoreBreakdown = {
    smooth_acceleration: 0,
    consistency: 0,
    completion: 0,
    time_efficiency: 0,
    fuel_efficiency: 0
  };

  // Smooth Acceleration (20 pts): Lower average acceleration = better
  // Estimated from speed changes
  scoreBreakdown.smooth_acceleration = 20; // Simplified for now

  // Consistency (20 pts): Steady speed with minimal variations
  // Use coefficient of variation of speed
  scoreBreakdown.consistency = 20; // Simplified

  // Completion (20 pts): Did user complete the ride without long stops
  const stopPenalty = Math.min(20, metrics.traffic_stops * 2);
  scoreBreakdown.completion = 20 - stopPenalty;

  // Time Efficiency (20 pts): Completing route in reasonable time
  // (this needs route baseline comparison, so we estimate)
  scoreBreakdown.time_efficiency = 20;

  // Fuel Efficiency (20 pts): Based on fuel cost and distance
  // Lower cost per km = better
  const estFuelUsed = metrics.distance_km / fuelEfficiency;
  const fuelEfficiencyScore = estFuelUsed > 0 ? 20 * (fuelEfficiency / (metrics.distance_km / estFuelUsed + 1)) : 20;
  scoreBreakdown.fuel_efficiency = Math.min(20, Math.max(0, fuelEfficiencyScore));

  const totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
  
  return {
    total_score: Math.min(100, Math.max(0, totalScore)),
    breakdown: scoreBreakdown
  };
}

/**
 * Estimate fuel cost
 */
function estimateFuelCost(distanceKm, fuelEfficiencyKmpl, fuelPricePerLiter) {
  const fuelUsed = distanceKm / fuelEfficiencyKmpl;
  return Math.round(fuelUsed * fuelPricePerLiter * 100) / 100;
}

/**
 * Hash route coordinates to group similar routes
 */
function hashCoordinates(latitude, longitude, precision = 2) {
  return `${(latitude).toFixed(precision)},${(longitude).toFixed(precision)}`;
}

/**
 * Check if a day qualifies as a commute day
 */
function isCommuteDay(date) {
  const dayOfWeek = date.getDay();
  // Monday (1) to Friday (5) are commute days
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get month from date
 */
function getMonthYear(date) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear()
  };
}

module.exports = {
  computeRideMetrics,
  computeRideScore,
  estimateFuelCost,
  hashCoordinates,
  isCommuteDay,
  getMonthYear
};

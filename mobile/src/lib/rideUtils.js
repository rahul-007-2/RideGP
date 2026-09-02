// Utilities for ride calculations
export function haversine(a, b) {
  const toRad = v => v * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDlat = Math.sin(dLat/2);
  const sinDlon = Math.sin(dLon/2);
  const aa = sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDlon*sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c; // km
}

export function computeRideMetrics(points) {
  if (!points || points.length < 2) return null;
  let distance = 0;
  let topSpeed = 0;
  let idleTime = 0;
  let stops = 0;
  let speedSum = 0;
  let speedCount = 0;
  let stopStart = null;

  // Compute per-segment speeds for smoothness analysis
  const speeds = [];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i-1];
    const p1 = points[i];
    const dt = (p1.timestamp - p0.timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversine(p0, p1);
    distance += d;
    const speed = (d / dt) * 3600; // km/h
    speeds.push(speed);
    if (speed > topSpeed) topSpeed = speed;
    speedSum += speed;
    speedCount++;

    // idle detection: speed < 1 km/h
    if (speed < 1) {
      if (!stopStart) stopStart = p0.timestamp;
    } else {
      if (stopStart) {
        const dur = (p0.timestamp - stopStart) / 1000;
        if (dur >= 10) stops += 1;
        idleTime += dur;
        stopStart = null;
      }
    }
  }
  if (stopStart) {
    const dur = (points[points.length-1].timestamp - stopStart) / 1000;
    if (dur >= 10) stops += 1;
    idleTime += dur;
  }

  const duration = (points[points.length-1].timestamp - points[0].timestamp) / 1000;
  const avgSpeed = duration > 0 ? (distance / (duration / 3600)) : 0;

  return {
    distance_km: Number(distance.toFixed(3)),
    duration_s: Math.round(duration),
    avg_speed_kmh: Number(avgSpeed.toFixed(2)),
    top_speed_kmh: Number(topSpeed.toFixed(2)),
    idle_time_s: Math.round(idleTime),
    stops: stops,
  };
}

export function estimateFuelCost(distance_km, kmPerL = 40, pricePerL = 90) {
  if (!distance_km) return 0;
  const liters = distance_km / kmPerL;
  return Number((liters * pricePerL).toFixed(2));
}

export function computeRideScore(metrics) {
  if (!metrics) return { total_score: 0, breakdown: {} };
  const duration = metrics.duration_s || 1;
  const distance = metrics.distance_km || 0;

  // Smooth Acceleration (0-25): penalize proportion of idle time
  const idleRatio = (metrics.idle_time_s || 0) / duration;
  const smoothAccel = Math.max(0, Math.round(25 * (1 - idleRatio * 2)));

  // Consistency (0-25): penalize number of stops
  const stopScore = Math.max(0, 25 - (metrics.stops || 0) * 4);

  // Completion (0-25): based on distance completed (assume 5km is full commute)
  const completionRatio = Math.min(1, distance / 5);
  const completion = Math.round(25 * Math.max(0.3, completionRatio));

  // Time Efficiency (0-25): avg speed near 30 km/h ideal for urban commute
  const idealSpeed = 30;
  const speedDiff = Math.abs((metrics.avg_speed_kmh || 0) - idealSpeed);
  const timeEfficiency = Math.max(0, Math.round(25 * (1 - speedDiff / idealSpeed)));

  const breakdown = {
    smooth_acceleration: smoothAccel,
    consistency: stopScore,
    completion: completion,
    time_efficiency: timeEfficiency,
  };

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    total_score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
  };
}

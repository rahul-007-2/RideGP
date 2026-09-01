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
  // points: [{latitude, longitude, timestamp, speed?}] timestamp ms
  if (!points || points.length < 2) return null;
  let distance = 0; // km
  let topSpeed = 0; // km/h
  let idleTime = 0; // seconds
  let stops = 0;
  let moving = false;
  let stopStart = null;
  for (let i=1;i<points.length;i++){
    const p0 = points[i-1];
    const p1 = points[i];
    const dt = (p1.timestamp - p0.timestamp)/1000; if (dt<=0) continue;
    const d = haversine(p0,p1); distance += d;
    const speed = (d/dt)*3600; // km/h
    if (speed>topSpeed) topSpeed = speed;
    // idle detection: speed threshold 1 km/h
    if (speed < 1) {
      if (!stopStart) stopStart = p0.timestamp;
    } else {
      if (stopStart) {
        const dur = (p0.timestamp - stopStart)/1000; // sec
        if (dur >= 10) stops +=1;
        idleTime += dur;
        stopStart = null;
      }
    }
  }
  // if ended while stopped
  if (stopStart) {
    const dur = (points[points.length-1].timestamp - stopStart)/1000;
    if (dur >= 10) stops +=1;
    idleTime += dur;
  }
  const duration = (points[points.length-1].timestamp - points[0].timestamp)/1000; // sec
  const avgSpeed = duration>0 ? (distance / (duration/3600)) : 0; // km/h

  return {
    distance_km: Number(distance.toFixed(3)),
    duration_s: Math.round(duration),
    avg_speed_kmh: Number(avgSpeed.toFixed(2)),
    top_speed_kmh: Number(topSpeed.toFixed(2)),
    idle_time_s: Math.round(idleTime),
    stops: stops
  };
}

export function estimateFuelCost(distance_km, kmPerL=40, pricePerL=90){
  if (!distance_km) return 0;
  const liters = distance_km / kmPerL;
  return Number((liters * pricePerL).toFixed(2));
}

export function computeRideScore(metrics){
  // Simple rule-based score (0-100) favoring smoothness and completion
  if (!metrics) return 0;
  let score = 100;
  // penalize idle time proportionally
  const idlePenalty = Math.min(30, (metrics.idle_time_s/metrics.duration_s)*50 || 0);
  score -= idlePenalty;
  // penalize excessive stops
  score -= Math.min(20, metrics.stops*3);
  // reward consistency: average speed near typical commuting speed (30-50 km/h)
  const ideal = 40; const speedPenalty = Math.min(20, Math.abs(metrics.avg_speed_kmh - ideal)/ideal*20);
  score -= speedPenalty;
  if (score < 0) score = 0;
  return Math.round(score);
}

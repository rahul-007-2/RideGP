/**
 * One-time migration: recompute metrics for rides that have 0 duration/speed
 * due to the mobile→server field name mismatch.
 *
 * Run: node scripts/fixRideMetrics.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { computeRideMetrics } = require('../config/rideUtils');
const Ride = require('../models/Ride');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Find rides with 0 duration or 0 avg speed (the broken ones)
  const broken = await Ride.find({
    $or: [
      { 'metrics.duration_minutes': 0 },
      { 'metrics.average_speed_kmh': 0 },
      { 'metrics.duration_minutes': { $exists: false } },
    ]
  });

  console.log(`Found ${broken.length} rides to fix`);

  let fixed = 0;
  for (const ride of broken) {
    if (!ride.geo || ride.geo.length < 2) {
      console.log(`  Skipping ride ${ride._id} — no GPS points`);
      continue;
    }

    // Recompute metrics from GPS points
    const newMetrics = computeRideMetrics(ride.geo);
    if (!newMetrics) continue;

    ride.metrics = {
      distance_km: newMetrics.distance_km,
      duration_minutes: Math.round((newMetrics.duration_s / 60) * 100) / 100,
      average_speed_kmh: newMetrics.average_speed_kmh,
      top_speed_kmh: newMetrics.top_speed_kmh,
      traffic_stops: newMetrics.stops,
      idle_time_minutes: Math.round((newMetrics.idle_time_s / 60) * 100) / 100,
      duration_s: newMetrics.duration_s,
    };

    await ride.save();
    fixed++;
    console.log(`  ✓ Fixed ride ${ride._id} — ${ride.metrics.duration_minutes} min, ${ride.metrics.average_speed_kmh} km/h`);
  }

  console.log(`\nDone. Fixed ${fixed}/${broken.length} rides.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RideSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // GPS and Route Data
  geo: [{
    latitude: { type: Number },
    longitude: { type: Number },
    speed_kmh: { type: Number },
    timestamp: { type: Number }
  }],
  
  // Route Information
  route_name: { type: String },
  origin: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  destination: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  
  // Ride Metrics
  metrics: {
    distance_km: { type: Number, default: 0 },
    duration_minutes: { type: Number, default: 0 },
    average_speed_kmh: { type: Number, default: 0 },
    top_speed_kmh: { type: Number, default: 0 },
    traffic_stops: { type: Number, default: 0 },
    idle_time_minutes: { type: Number, default: 0 },
    acceleration_score: { type: Number, default: 0 }, // smoothness
    consistency_score: { type: Number, default: 0 },
    efficiency_score: { type: Number, default: 0 }
  },
  
  // Cost and Gamification
  fuel_cost: { type: Number, default: 0 },
  score: { type: Number, default: 0 }, // 0-100
  score_breakdown: {
    smooth_acceleration: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    time_efficiency: { type: Number, default: 0 },
    fuel_efficiency: { type: Number, default: 0 }
  },
  
  // Time Information
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  day_of_week: { type: String }, // Monday, Tuesday, etc.
  is_commute: { type: Boolean, default: false }, // Regular commute route
  
  // Status
  is_completed: { type: Boolean, default: true },
  ride_type: { type: String, enum: ['commute', 'leisure', 'delivery'], default: 'commute' },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index for efficient querying
RideSchema.index({ user_id: 1, start_time: -1 });
RideSchema.index({ user_id: 1, is_commute: 1 });

module.exports = mongoose.model('Ride', RideSchema);

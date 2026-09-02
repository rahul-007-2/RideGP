const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MonthlyWrappedSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Period
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  
  // Aggregate Data
  total_distance_km: { type: Number, default: 0 },
  total_riding_time_minutes: { type: Number, default: 0 },
  total_fuel_cost: { type: Number, default: 0 },
  total_rides: { type: Number, default: 0 },
  average_ride_score: { type: Number, default: 0 },
  
  // Best/Worst Records
  best_ride_id: { type: Schema.Types.ObjectId, ref: 'Ride' },
  best_ride_score: { type: Number },
  average_ride_id: { type: Schema.Types.ObjectId, ref: 'Ride' },
  longest_ride_id: { type: Schema.Types.ObjectId, ref: 'Ride' },
  longest_ride_distance: { type: Number },
  
  // Route Analysis
  most_used_route: { type: String },
  most_used_route_count: { type: Number },
  most_used_route_avg_score: { type: Number },
  
  // Streaks
  ride_streak: { type: Number, default: 0 },
  
  // Comparison
  smoothness_percentile: { type: Number }, // 0-100, relative to other riders
  fuel_efficiency_percentile: { type: Number },
  consistency_percentile: { type: Number },
  
  // Bike-wise breakdown
  bike_stats: [{
    bike_id: { type: String },
    bike_name: { type: String },
    rides: { type: Number, default: 0 },
    total_distance_km: { type: Number, default: 0 },
    total_time_minutes: { type: Number, default: 0 },
    total_fuel_cost: { type: Number, default: 0 },
    avg_score: { type: Number, default: 0 },
    best_score: { type: Number, default: 0 },
    distance_share: { type: Number, default: 0 } // percentage
  }],
  most_ridden_bike: { type: String },
  best_scoring_bike: { type: String },

  // Achievements unlocked this month
  achievements_unlocked: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
  
  // Generated image
  wrapped_image_url: { type: String },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

MonthlyWrappedSchema.index({ user_id: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyWrapped', MonthlyWrappedSchema);

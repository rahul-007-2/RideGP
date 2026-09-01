const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RouteCohortSchema = new Schema({
  // Route identification
  route_name: { type: String, required: true },
  origin_hash: { type: String, required: true }, // Hash of coordinates to group similar origins
  destination_hash: { type: String, required: true }, // Hash of coordinates to group similar destinations
  
  // Aggregate Statistics
  stats: {
    total_riders: { type: Number, default: 0 },
    total_rides: { type: Number, default: 0 },
    average_commute_time_minutes: { type: Number, default: 0 },
    average_speed_kmh: { type: Number, default: 0 },
    average_distance_km: { type: Number, default: 0 },
    average_fuel_cost: { type: Number, default: 0 },
    most_common_departure_hour: { type: Number }, // 0-23
    common_departure_times: [{
      hour: { type: Number },
      minute: { type: Number },
      frequency: { type: Number }
    }],
    peak_traffic_hour: { type: Number },
    average_traffic_stops: { type: Number, default: 0 },
    best_day_of_week: { type: String }, // Day with best avg score
    worst_day_of_week: { type: String }
  },
  
  // Community data (anonymized)
  user_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users in this cohort
  
  // Recent activity
  last_updated: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

RouteCohortSchema.index({ origin_hash: 1, destination_hash: 1 }, { unique: true });

module.exports = mongoose.model('RouteCohort', RouteCohortSchema);

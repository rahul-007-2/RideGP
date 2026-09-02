const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SavedRouteSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  origin: {
    latitude: Number,
    longitude: Number,
  },
  destination: {
    latitude: Number,
    longitude: Number,
  },
  geo: [{
    latitude: Number,
    longitude: Number,
  }],
  distance_km: { type: Number, default: 0 },
  avg_duration_minutes: { type: Number, default: 0 },
  ride_count: { type: Number, default: 0 },
  color: { type: String, default: '#2563EB' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

SavedRouteSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('SavedRoute', SavedRouteSchema);

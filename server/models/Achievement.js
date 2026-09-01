const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AchievementSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  achievement_type: { 
    type: String,
    enum: [
      'early_bird',      // Rides before 6 AM (5 times)
      'smooth_operator', // Avg score > 85 on 10 rides
      'fuel_saver',      // Lowest fuel cost in cohort
      'route_master',    // 20 rides on same route
      'consistent_commuter', // 30-day streak
      'night_rider',     // 10 rides after 8 PM
      'speed_demon',     // Top speed > 100 km/h
      'distance_warrior', // 500 km in a month
      'environmental_champion', // Saved most fuel in month
      'century_club'     // 100 total rides
    ],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  icon_url: { type: String },
  unblocked_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

AchievementSchema.index({ user_id: 1, achievement_type: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', AchievementSchema);

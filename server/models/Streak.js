const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StreakSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Streak Information
  current_streak_count: { type: Number, default: 0 },
  best_streak_count: { type: Number, default: 0 },
  
  // Dates
  streak_start_date: { type: Date },
  last_ride_date: { type: Date },
  best_streak_start_date: { type: Date },
  best_streak_end_date: { type: Date },
  
  // Streak Rules
  required_rides_per_week: { type: Number, default: 5 }, // Required for commute streak
  
  // Tracking
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Streak', StreakSchema);

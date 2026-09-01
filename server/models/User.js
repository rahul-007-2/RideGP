const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  password_hash: { type: String, required: true },
  
  // Bike Information
  bike_model: { type: String, default: 'Unknown' },
  bike_details: {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: Number, default: null },
    color: { type: String, default: '' },
    fuel_efficiency_kmpl: { type: Number, default: 40 },
    fuel_price_per_liter: { type: Number, default: 90 },
    last_service_date: { type: Date, default: null },
    registration_number: { type: String, default: '' }
  },
  
  // Legacy fields (for backward compatibility)
  fuel_efficiency_kmpl: { type: Number, default: 40 },
  fuel_price_per_liter: { type: Number, default: 90 },
  
  // Locations
  home_location: { 
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  office_location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  commute_route: [{
    latitude: { type: Number },
    longitude: { type: Number }
  }],
  
  // Profile
  profile_picture_url: { type: String },
  phone_number: { type: String, default: '' },
  
  // Statistics
  current_streak: { type: Number, default: 0 },
  best_streak: { type: Number, default: 0 },
  total_rides: { type: Number, default: 0 },
  total_distance_km: { type: Number, default: 0 },
  total_ride_time_minutes: { type: Number, default: 0 },
  average_ride_score: { type: Number, default: 0 },
  
  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password_hash')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  } catch (err) {
    throw err;
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password_hash);
};

// Method to get public profile (without sensitive data)
UserSchema.methods.getPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);

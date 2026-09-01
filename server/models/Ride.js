const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RideSchema = new Schema({
  user_id: { type: String },
  metrics: { type: Schema.Types.Mixed },
  geo: { type: Schema.Types.Mixed },
  fuel_cost: { type: Number },
  score: { type: Number },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', RideSchema);

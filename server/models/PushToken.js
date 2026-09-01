const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PushTokenSchema = new Schema({
  user_id: { type: String, unique: true },
  token: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PushToken', PushTokenSchema);

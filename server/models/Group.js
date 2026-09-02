const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  avatar_emoji: { type: String, default: '🏍️' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

GroupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', GroupSchema);

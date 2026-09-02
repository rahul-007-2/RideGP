const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sender_name: { type: String, default: '' },
  text: { type: String, default: '' },
  media_url: { type: String, default: null },
  media_type: { type: String, enum: ['image', 'video', null], default: null },
  created_at: { type: Date, default: Date.now }
});

MessageSchema.index({ group_id: 1, created_at: -1 });

module.exports = mongoose.model('Message', MessageSchema);

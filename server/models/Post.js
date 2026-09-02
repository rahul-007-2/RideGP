const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user_name: { type: String, default: '' },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  image_url: { type: String, default: null },
  likes: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

PostSchema.index({ created_at: -1 });

module.exports = mongoose.model('Post', PostSchema);

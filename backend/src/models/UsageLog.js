import mongoose from 'mongoose';

const UsageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: String,
  action: {
    type: String,
    required: true // e.g., 'render_video', 'regenerate_scene'
  },
  cost: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

export default mongoose.model('UsageLog', UsageLogSchema);

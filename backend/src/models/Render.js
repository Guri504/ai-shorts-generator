import mongoose from 'mongoose';

const RenderSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['full', 'voice_only', 'single'],
    default: 'full'
  },
  status: {
    type: String,
    enum: ['queued', 'rendering', 'completed', 'failed'],
    default: 'queued'
  },
  progress: {
    type: Number,
    default: 0
  },
  eta: {
    type: Number,
    default: 0
  },
  error: String
}, {
  timestamps: true
});

export default mongoose.model('Render', RenderSchema);

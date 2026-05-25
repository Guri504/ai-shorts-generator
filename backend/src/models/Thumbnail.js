import mongoose from 'mongoose';

const TextOverlaySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  fontSize: {
    type: Number,
    default: 50
  },
  fontColor: {
    type: String,
    default: '#ffffff'
  },
  positionX: {
    type: Number,
    default: 50 // Percentage coordinate (0-100)
  },
  positionY: {
    type: Number,
    default: 50 // Percentage coordinate (0-100)
  },
  glowColor: {
    type: String,
    default: '#000000'
  },
  glowRadius: {
    type: Number,
    default: 8
  }
}, { _id: false });

const ThumbnailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  prompt: {
    type: String,
    required: true
  },
  style: {
    type: String,
    enum: ['documentary', 'horror', 'cyberpunk', 'MrBeast', 'cinematic', 'funny'],
    required: true
  },
  aspectRatio: {
    type: String,
    enum: ['9:16', '16:9'],
    default: '9:16'
  },
  originalUrl: {
    type: String,
    required: true
  },
  editedUrl: {
    type: String,
    required: true
  },
  textOverlays: {
    type: [TextOverlaySchema],
    default: []
  },
  glow: {
    enabled: { type: Boolean, default: false },
    color: { type: String, default: '#8b5cf6' },
    radius: { type: Number, default: 15 }
  },
  blur: {
    enabled: { type: Boolean, default: false },
    radius: { type: Number, default: 5 }
  },
  overlay: {
    type: { type: String, enum: ['none', 'vignette', 'warm', 'cool', 'neon-pink', 'neon-cyan'], default: 'none' },
    opacity: { type: Number, default: 0.5 }
  },
  adjustments: {
    brightness: { type: Number, default: 1.0 },
    contrast: { type: Number, default: 1.0 },
    saturation: { type: Number, default: 1.0 },
    sharpness: { type: Number, default: 0 }
  },
  historySteps: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('Thumbnail', ThumbnailSchema);

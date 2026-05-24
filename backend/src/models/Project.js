import mongoose from 'mongoose';

const SceneSchema = new mongoose.Schema({
  sceneNumber: Number,
  narration: String,
  visualPrompt: String,
  clipType: {
    type: String,
    enum: ['AI', 'Stock'],
    default: 'AI'
  },
  stockSearchKeyword: String,
  voiceAudioPath: String,
  videoPath: String,
  thumbnailPath: String,
  wordTimings: [mongoose.Schema.Types.Mixed],
  duration: Number
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true
  },
  voiceLanguage: {
    type: String,
    default: 'hinglish'
  },
  voiceGender: {
    type: String,
    default: 'male'
  },
  voiceName: String,
  voiceSpeed: {
    type: Number,
    default: 1.0
  },
  voicePitch: {
    type: String,
    default: '+0Hz'
  },
  voiceVolume: {
    type: String,
    default: '+0%'
  },
  musicGenre: {
    type: String,
    default: 'cinematic'
  },
  bgMusicGenre: String,
  status: {
    type: String,
    enum: ['draft', 'queued', 'rendering', 'completed', 'failed'],
    default: 'draft'
  },
  progress: {
    type: Number,
    default: 0
  },
  stepStatus: String,
  metadata: {
    title: String,
    description: String,
    hashtags: [String]
  },
  youtubeUpload: {
    status: { type: String, enum: ['idle', 'uploading', 'success', 'failed'], default: 'idle' },
    progress: { type: Number, default: 0 },
    message: { type: String, default: '' },
    videoId: String,
    channelName: String,
    uploadedAt: Date,
    error: String,
    privacyStatus: String,
    uploadType: String
  },
  scenes: [SceneSchema],
  ctaSettings: {
    enabled: { type: Boolean, default: true },
    language: String,
    style: String,
    duration: { type: Number, default: 5 },
    intensity: { type: String, default: 'energetic' }
  },
  ctaScene: SceneSchema,
  outputPath: String,
  error: String
}, {
  timestamps: true
});

export default mongoose.model('Project', ProjectSchema);

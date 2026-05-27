import mongoose from 'mongoose';

const LinkedInAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  profileName: {
    type: String,
    required: true
  },
  linkedinId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: false
  },
  tokenExpiry: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('LinkedInAccount', LinkedInAccountSchema);

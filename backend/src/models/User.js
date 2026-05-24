import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false
  },
  name: {
    type: String,
    trim: true
  },
  googleId: {
    type: String
  },
  picture: {
    type: String
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  credits: {
    type: Number,
    default: 3 // Start with 3 free rendering credits
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password
UserSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return validator.isEmail(email) && email.endsWith('@sinhgad.edu');
      },
      message: 'Please provide a valid @sinhgad.edu email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Computer', 'IT', 'Mechanical', 'Civil', 'Electronics', 'Electrical']
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    enum: ['FE', 'SE', 'TE', 'BE']
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });
  
  // Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
  
  const User = mongoose.model('User', userSchema);
  module.exports = User;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Test user details
const testUser = {
  name: 'Test User',
  email: 'test@sinhgad.edu',
  password: 'password123',
  department: 'Computer',
  year: 'BE'
};

async function createTestUser() {
  try {
    console.log('Starting test user creation...');
    
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB Atlas...');
    const mongoUri = 'mongodb+srv://vitthalpkwam22_db_user:iu0mCCsHqeoQmkmx@cluster0.f74rjgh.mongodb.net/sinhgadconnect?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    let user = await User.findOne({ email: testUser.email });
    
    if (user) {
      console.log('ℹ️ User already exists, updating...');
      // Update existing user
      user.password = testUser.password;
      user.name = testUser.name;
      user.department = testUser.department;
      user.year = testUser.year;
    } else {
      console.log('ℹ️ Creating new test user...');
      // Create new user
      user = new User(testUser);
    }
    
    // Save the user (this will trigger the pre-save hook to hash the password)
    await user.save();
    console.log('✅ User saved successfully');

    // Verify the user was saved correctly
    const savedUser = await User.findOne({ email: testUser.email });
    console.log('\n🔍 User Details:');
    console.log('----------------');
    console.log(`Name: ${savedUser.name}`);
    console.log(`Email: ${savedUser.email}`);
    console.log(`Department: ${savedUser.department}`);
    console.log(`Year: ${savedUser.year}`);
    console.log(`Password Hash: ${savedUser.password.substring(0, 20)}...`);
    console.log('\n✅ Test user setup complete!');
    console.log('You can now login with:');
    console.log(`Email: ${testUser.email}`);
    console.log(`Password: ${testUser.password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    if (error.errors) {
      console.error('Validation errors:', Object.values(error.errors).map(e => e.message).join(', '));
    }
    process.exit(1);
  }
}

// Run the script
createTestUser();

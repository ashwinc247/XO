const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['guest', 'player', 'admin'], default: 'player' },
  status: { type: String, default: 'active' },
  isEmailVerified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xo_arena');
    
    const adminEmail = 'admin@xo.com';
    let admin = await User.findOne({ email: adminEmail });
    
    if (admin) {
      console.log('Admin user already exists. Email: admin@xo.com');
      process.exit(0);
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    admin = new User({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });
    
    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email/Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();

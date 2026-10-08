const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    //const conn = await mongoose.connect('mongodb://localhost:27017/xo_arena?retryWrites=false');
    const conn = await mongoose.connect("mongodb+srv://xo:New12345@cluster0.lrmsp2p.mongodb.net/?appName=Cluster0");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xo-arena', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const Transaction = require('../models/Transaction');
const BonusTransaction = require('../models/BonusTransaction');
const MatchSettlement = require('../models/MatchSettlement');
const Session = require('../models/Session');
const Settings = require('../models/Settings');

async function cleanup() {
  console.log('Starting Production Database Cleanup...');
  
  try {
    // 1. Find Admin accounts
    const admins = await User.find({ role: 'admin' });
    if (admins.length === 0) {
      console.warn('No Admin accounts found! Proceeding with caution.');
    } else {
      console.log(`Found ${admins.length} Admin account(s). These will be protected.`);
    }

    const adminIds = admins.map(admin => admin._id);

    // 2. Delete non-admin users
    const deletedUsers = await User.deleteMany({ _id: { $nin: adminIds } });
    console.log(`Deleted ${deletedUsers.deletedCount} non-admin Users.`);

    // 3. Delete non-admin profiles
    const deletedProfiles = await Profile.deleteMany({ user: { $nin: adminIds } });
    console.log(`Deleted ${deletedProfiles.deletedCount} non-admin Profiles.`);

    // 4. Delete non-admin settings
    const deletedSettings = await Settings.deleteMany({ user: { $nin: adminIds } });
    console.log(`Deleted ${deletedSettings.deletedCount} non-admin Settings.`);

    // 5. Delete non-admin sessions
    const deletedSessions = await Session.deleteMany({ user: { $nin: adminIds } });
    console.log(`Deleted ${deletedSessions.deletedCount} non-admin Sessions.`);

    // 6. Truncate matches and gameplay logs (all of them)
    const deletedMatches = await Match.deleteMany({});
    console.log(`Deleted ${deletedMatches.deletedCount} Matches.`);

    const deletedSettlements = await MatchSettlement.deleteMany({});
    console.log(`Deleted ${deletedSettlements.deletedCount} Match Settlements.`);

    const deletedTransactions = await Transaction.deleteMany({});
    console.log(`Deleted ${deletedTransactions.deletedCount} Transactions.`);

    const deletedBonusTransactions = await BonusTransaction.deleteMany({});
    console.log(`Deleted ${deletedBonusTransactions.deletedCount} Bonus Transactions.`);

    console.log('Cleanup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();

const Profile = require('../models/Profile');
const BonusTransaction = require('../models/BonusTransaction');
const Transaction = require('../models/Transaction');

exports.getRewardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    // Get direct referrals
    const level1Transactions = await BonusTransaction.find({ user: userId, level: 1 }).populate('sourceUser', 'username createdAt');
    // Get indirect referrals
    const level2Transactions = await BonusTransaction.find({ user: userId, level: 2 }).populate('sourceUser', 'username createdAt');

    let level1Earnings = 0;
    level1Transactions.forEach(t => level1Earnings += t.amount);

    let level2Earnings = 0;
    level2Transactions.forEach(t => level2Earnings += t.amount);

    // Get betting commissions
    const bettingCommissionsL1 = await Transaction.find({ user: userId, type: 'REFERRAL_COMMISSION_L1' });
    const bettingCommissionsL2 = await Transaction.find({ user: userId, type: 'REFERRAL_COMMISSION_L2' });

    let l1BettingEarnings = 0;
    bettingCommissionsL1.forEach(t => l1BettingEarnings += t.amount);

    let l2BettingEarnings = 0;
    bettingCommissionsL2.forEach(t => l2BettingEarnings += t.amount);

    res.status(200).json({
      success: true,
      data: {
        bonusRewardBalance: profile.bonusRewardBalance,
        lastBonusClaimedAt: profile.lastBonusClaimedAt,
        referralCode: profile.referralCode,
        level1: {
          count: level1Transactions.length,
          earnings: level1Earnings,
          referrals: level1Transactions.map(t => ({
            username: t.sourceUser?.username || 'Unknown',
            joinedAt: t.createdAt,
            amount: t.amount
          }))
        },
        level2: {
          count: level2Transactions.length,
          earnings: level2Earnings,
          referrals: level2Transactions.map(t => ({
            username: t.sourceUser?.username || 'Unknown',
            joinedAt: t.createdAt,
            amount: t.amount
          }))
        },
        history: [...level1Transactions, ...level2Transactions].sort((a, b) => b.createdAt - a.createdAt),
        summary: {
          referralSignupBonuses: level1Earnings + level2Earnings,
          bettingCommissionL1: l1BettingEarnings,
          bettingCommissionL2: l2BettingEarnings,
          totalEarned: level1Earnings + level2Earnings + l1BettingEarnings + l2BettingEarnings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.claimBonus = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (profile.bonusRewardBalance <= 0) {
      return res.status(400).json({ success: false, message: 'No bonus balance available to claim' });
    }

    // Check 24 hours
    if (profile.lastBonusClaimedAt) {
      const now = new Date();
      const lastClaim = new Date(profile.lastBonusClaimedAt);
      const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);

      if (hoursSinceLastClaim < 24) {
        const remainingHours = Math.ceil(24 - hoursSinceLastClaim);
        return res.status(400).json({ 
          success: false, 
          message: `You can only claim once every 24 hours. Please wait ${remainingHours} more hours.`
        });
      }
    }

    const claimAmount = profile.bonusRewardBalance;

    // Move to main wallet
    profile.walletBalance += claimAmount;
    profile.bonusRewardBalance = 0;
    profile.lastBonusClaimedAt = new Date();

    await profile.save();

    // Log the transaction in Main Transactions
    await Transaction.create({
      user: userId,
      type: 'Bonus Claim',
      amount: claimAmount,
      description: 'Claimed referral bonus to main wallet'
    });

    res.status(200).json({
      success: true,
      message: `Successfully claimed ₹${claimAmount} to main wallet!`,
      data: {
        bonusRewardBalance: profile.bonusRewardBalance,
        walletBalance: profile.walletBalance,
        lastBonusClaimedAt: profile.lastBonusClaimedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

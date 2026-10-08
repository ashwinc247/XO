const Profile = require('../models/Profile');
const Transaction = require('../models/Transaction');
const RechargeRequest = require('../models/RechargeRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const PlatformSettings = require('../models/PlatformSettings');
const auditService = require('../services/auditService');

exports.getWalletDetails = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const transactions = await Transaction.find({ 
      user: req.user._id,
      type: { $nin: [
        'REFERRAL_COMMISSION_L1', 
        'REFERRAL_COMMISSION_L2', 
        'Match Loss', 
        'BET_WIN_PAYOUT',
        'Match Win' // in case there are legacy ones
      ] }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const recharges = await RechargeRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const allHistory = [
      ...transactions.map(t => ({
        id: t._id,
        type: t.type === 'Match Win' || t.type === 'Deposit' || t.type === 'Refund' || t.type === 'Recharge' ? 'credit' : 'debit',
        transactionType: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status || 'completed',
        date: t.createdAt
      })),
      ...recharges.filter(r => r.status !== 'APPROVED').map(r => ({
        id: r._id,
        type: 'credit',
        transactionType: 'Recharge',
        amount: r.amount,
        description: `UPI Recharge (${r.requestId})`,
        status: r.status,
        date: r.createdAt,
        utr: r.utr,
        reference: r.requestId
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 50);

    res.status(200).json({
      success: true,
      data: {
        balance: profile.walletBalance || 0,
        withdrawalUpiId: profile.withdrawalUpiId || '',
        transactions: allHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.depositFunds = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    profile.walletBalance = (profile.walletBalance || 0) + parseFloat(amount);
    await profile.save();

    await Transaction.create({
      user: req.user._id,
      type: 'Deposit',
      amount: parseFloat(amount),
      description: 'User initiated deposit'
    });

    await auditService.log('wallet_deposit', req.user._id, req.user.role, req.ip || '', '', 'success', { amount });

    res.status(200).json({
      success: true,
      message: 'Funds deposited successfully',
      data: {
        balance: profile.walletBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.withdrawFunds = async (req, res, next) => {
  try {
    const { amount, upiId, saveUpi } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
    }

    if (!upiId || upiId.trim() === '') {
      return res.status(400).json({ success: false, message: 'UPI ID is required' });
    }

    // Atomic deduction to prevent double spend
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id, walletBalance: { $gte: withdrawAmount } },
      { $inc: { walletBalance: -withdrawAmount } },
      { new: true }
    );

    if (!profile) {
      return res.status(400).json({ success: false, message: 'Insufficient available balance' });
    }

    if (saveUpi) {
      profile.withdrawalUpiId = upiId.trim();
      await profile.save();
    }

    const requestId = 'WDL-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8) + '-' + Math.floor(100000 + Math.random() * 900000);

    const withdrawalRequest = await WithdrawalRequest.create({
      user: req.user._id,
      amount: withdrawAmount,
      requestId,
      upiId: upiId.trim(),
      status: 'PENDING'
    });

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'Withdrawal',
      amount: withdrawAmount,
      status: 'pending',
      description: `Withdrawal Request (${requestId})`
    });

    await auditService.log('wallet_withdrawal_requested', req.user._id, req.user.role, req.ip || '', '', 'success', { amount: withdrawAmount, requestId });

    // Emit real-time wallet update to the user
    if (req.app.get('io')) {
      req.app.get('io').of('/game').to(`user_${req.user._id.toString()}`).emit('wallet_updated', {
        balance: profile.walletBalance,
        reason: 'WITHDRAWAL_REQUESTED',
        transactionId: requestId,
        timestamp: new Date()
      });
      
      req.app.get('io').of('/game').to(`user_${req.user._id.toString()}`).emit('notification', {
        type: 'info',
        message: `Your ₹${withdrawAmount} withdrawal request has been submitted.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        balance: profile.walletBalance,
        withdrawal: withdrawalRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.saveUpiId = async (req, res, next) => {
  try {
    const { upiId } = req.body;
    if (!upiId || upiId.trim() === '') {
      return res.status(400).json({ success: false, message: 'UPI ID is required' });
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { withdrawalUpiId: upiId.trim() } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({
      success: true,
      message: 'UPI ID saved successfully',
      data: {
        withdrawalUpiId: profile.withdrawalUpiId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createRecharge = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount < 100 || amount > 1000) {
      return res.status(400).json({ success: false, message: 'Invalid recharge amount. Must be between ₹100 and ₹1000.' });
    }

    let settings = await PlatformSettings.findOne();
    if (!settings || !settings.upiIds || settings.upiIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Recharge is temporarily unavailable. No active UPI IDs configured.' });
    }

    const activeUpis = settings.upiIds.filter(u => u.isActive);
    if (activeUpis.length === 0) {
      return res.status(400).json({ success: false, message: 'Recharge is temporarily unavailable. No active UPI IDs.' });
    }

    const randomUpi = activeUpis[Math.floor(Math.random() * activeUpis.length)].upi;

    const requestId = 'RCH-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8) + '-' + Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const recharge = await RechargeRequest.create({
      user: req.user._id,
      amount,
      requestId,
      assignedUpiId: randomUpi,
      expiresAt
    });

    res.status(201).json({
      success: true,
      data: {
        recharge,
        upiId: randomUpi
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.submitRechargeProof = async (req, res, next) => {
  try {
    const { utr } = req.body;
    const { id } = req.params;

    if (!utr || utr.trim() === '') {
      return res.status(400).json({ success: false, message: 'UTR is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Screenshot is required' });
    }

    const recharge = await RechargeRequest.findOne({ _id: id, user: req.user._id });
    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Recharge request not found' });
    }

    if (recharge.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ success: false, message: `Cannot submit proof. Current status: ${recharge.status}` });
    }

    if (new Date() > recharge.expiresAt) {
      recharge.status = 'EXPIRED';
      await recharge.save();
      return res.status(400).json({ success: false, message: 'Recharge request has expired.' });
    }

    const existingUtr = await RechargeRequest.findOne({ utr });
    if (existingUtr) {
      return res.status(400).json({ success: false, message: 'This UTR has already been submitted for another request.' });
    }

    recharge.utr = utr;
    recharge.screenshot = req.file.filename;
    recharge.status = 'PROOF_SUBMITTED';
    recharge.proofSubmittedAt = new Date();

    await recharge.save();

    await auditService.log('recharge_proof_submitted', req.user._id, req.user.role, req.ip || '', '', 'success', { requestId: recharge.requestId });

    res.status(200).json({
      success: true,
      message: 'Proof submitted successfully',
      data: recharge
    });
  } catch (error) {
    next(error);
  }
};

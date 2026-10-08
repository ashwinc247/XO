const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const MatchSettlement = require('../models/MatchSettlement');
const Announcement = require('../models/Announcement');
const RechargeRequest = require('../models/RechargeRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const PlatformSettings = require('../models/PlatformSettings');
const Transaction = require('../models/Transaction');
const auditService = require('../services/auditService');
const maintenanceService = require('../services/maintenanceService');
const matchRepository = require('../repositories/matchRepository');
const path = require('path');
const fs = require('fs');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'player' });
    const totalMatches = await Match.countDocuments({ status: 'finished' });
    const activeMatches = await Match.countDocuments({ status: 'active' });
    
    // Average duration
    const matches = await Match.find({ status: 'finished' });
    const totalDuration = matches.reduce((sum, match) => sum + (match.duration || 0), 0);
    const avgDuration = matches.length ? Math.round(totalDuration / matches.length) : 0;

    // Recharge Stats
    const rechargeStatsList = await RechargeRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    let rechargesTotal = 0;
    let pendingVerification = 0;
    let approvedRecharges = 0;
    let rejectedRecharges = 0;
    let expiredRecharges = 0;
    let totalCreditedAmount = 0;

    rechargeStatsList.forEach(stat => {
      rechargesTotal += stat.count;
      if (stat._id === 'PROOF_SUBMITTED' || stat._id === 'UNDER_REVIEW') {
        pendingVerification += stat.count;
      } else if (stat._id === 'APPROVED') {
        approvedRecharges += stat.count;
        totalCreditedAmount += stat.totalAmount;
      } else if (stat._id === 'REJECTED') {
        rejectedRecharges += stat.count;
      } else if (stat._id === 'EXPIRED') {
        expiredRecharges += stat.count;
      }
    });

    const maintenanceStatus = await maintenanceService.getStatus();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalMatches,
        activeMatches,
        avgDuration,
        maintenanceMode: maintenanceStatus.enabled,
        rechargesTotal,
        pendingVerification,
        approvedRecharges,
        rejectedRecharges,
        expiredRecharges,
        totalCreditedAmount
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = { role: { $ne: 'admin' } };
    
    // Search filter
    if (req.query.search) {
      filter.username = { $regex: req.query.search, $options: 'i' };
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    // Get profiles for these users
    const userListWithProfiles = [];
    for (const u of users) {
      const profile = await Profile.findOne({ user: u._id });
      userListWithProfiles.push({
        _id: u._id,
        username: u.username,
        email: u.email,
        isEmailVerified: u.isEmailVerified,
        status: u.status,
        createdAt: u.createdAt,
        profile
      });
    }

    res.status(200).json({
      success: true,
      data: {
        users: userListWithProfiles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = await Profile.findOne({ user: userId });
    const matches = await matchRepository.getMatchHistory(userId, 10, 0);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          status: user.status,
          createdAt: user.createdAt
        },
        profile,
        recentMatches: matches
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { status } = req.body; // 'active' or 'suspended'

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend admin accounts' });
    }

    user.status = status;
    await user.save();

    await auditService.log('toggle_user_status', req.user._id, 'admin', req.ip, '', 'success', { targetUserId: userId, newStatus: status });

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      data: user
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getMatchesList = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const matches = await matchRepository.getAllMatches(filter, limit, skip);
    const total = await matchRepository.getAllMatchesCount(filter);

    res.status(200).json({
      success: true,
      data: {
        matches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getMatchSettlements = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const settlements = await MatchSettlement.find({})
      .populate('winnerId', 'username')
      .populate('level1UserId', 'username')
      .populate('level2UserId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MatchSettlement.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        settlements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }

    const logs = await auditService.getLogs(filter, limit, skip);
    const total = await auditService.getLogsCount(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.toggleMaintenanceMode = async (req, res, next) => {
  try {
    const { enabled, title, description } = req.body;
    const mode = await maintenanceService.setStatus(enabled, title, description, null, null, req.user._id);

    // Notify all connected normal users
    if (req.app.get('io')) {
      req.app.get('io').of('/game').to('role_player').emit('maintenance_enabled', {
        enabled,
        title,
        description
      });
    }

    res.status(200).json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      data: mode
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getAnnouncements = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Announcement.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        announcements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, isActive } = req.body;

    const announcement = await Announcement.create({
      title,
      message,
      isActive: isActive !== undefined ? isActive : true
    });

    // Notify connected clients via Socket.IO
    if (announcement.isActive && req.app.get('io')) {
      req.app.get('io').of('/game').emit('new_announcement', announcement);
    }

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecharges = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const recharges = await RechargeRequest.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await RechargeRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: recharges,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRecharge = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Atomic update to lock the record and prevent double-approval
    // This removes the need for MongoDB replica-set transactions.
    const recharge = await RechargeRequest.findOneAndUpdate(
      { _id: id, status: { $in: ['PROOF_SUBMITTED', 'UNDER_REVIEW'] } },
      { 
        $set: { 
          status: 'APPROVED', 
          approvedBy: req.user._id, 
          approvedAt: new Date() 
        } 
      },
      { new: true }
    );

    if (!recharge) {
      return res.status(400).json({ success: false, message: 'Recharge request not found or already verified.' });
    }

    const profile = await Profile.findOne({ user: recharge.user });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    profile.walletBalance = (profile.walletBalance || 0) + recharge.amount;
    await profile.save();

    await Transaction.create({
      user: recharge.user,
      type: 'Recharge',
      amount: recharge.amount,
      description: `UPI Recharge Approved (${recharge.requestId})`
    });

    await auditService.log('admin_approve_recharge', req.user._id, req.user.role, req.ip || '', '', 'success', { requestId: recharge.requestId });

    // Emit real-time wallet update to the user
    if (req.app.get('io')) {
      req.app.get('io').of('/game').to(`user_${recharge.user.toString()}`).emit('wallet_updated', {
        balance: profile.walletBalance,
        reason: 'RECHARGE_APPROVED',
        transactionId: recharge.requestId,
        timestamp: new Date()
      });
      
      req.app.get('io').of('/game').to(`user_${recharge.user.toString()}`).emit('notification', {
        type: 'success',
        message: `Your ₹${recharge.amount} recharge has been approved and added to your wallet.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recharge approved successfully',
      data: recharge
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectRecharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const recharge = await RechargeRequest.findById(id);
    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Recharge request not found' });
    }

    if (recharge.status !== 'PROOF_SUBMITTED' && recharge.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ success: false, message: 'Recharge is not in a verifiable state' });
    }

    recharge.status = 'REJECTED';
    recharge.rejectedBy = req.user._id;
    recharge.rejectedAt = new Date();
    recharge.rejectionReason = reason || 'No reason provided';
    await recharge.save();

    await auditService.log('admin_reject_recharge', req.user._id, req.user.role, req.ip || '', '', 'success', { requestId: recharge.requestId, reason });

    res.status(200).json({
      success: true,
      message: 'Recharge rejected successfully',
      data: recharge
    });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentProof = (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../secure_uploads/payments', filename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
};

exports.getUpiSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({ upiIds: [] });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateUpiSettings = async (req, res, next) => {
  try {
    const { upiIds } = req.body;
    if (!upiIds || !Array.isArray(upiIds) || upiIds.length > 5) {
      return res.status(400).json({ success: false, message: 'Invalid UPI IDs provided. Maximum of 5 allowed.' });
    }
    
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({ upiIds });
    } else {
      settings.upiIds = upiIds;
      await settings.save();
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.getWithdrawals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const matchStage = {};
    if (status) matchStage.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Using aggregation to fetch withdrawal requests and compute user totals in one go
    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'user',
          foreignField: 'user',
          as: 'profileInfo'
        }
      },
      { $unwind: { path: '$profileInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'rechargerequests',
          let: { userId: '$user' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$user', '$$userId'] }, { $eq: ['$status', 'APPROVED'] }] } } },
            { $group: { _id: null, totalRecharged: { $sum: '$amount' } } }
          ],
          as: 'rechargeStats'
        }
      },
      {
        $lookup: {
          from: 'withdrawalrequests',
          let: { userId: '$user' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$user', '$$userId'] }, { $eq: ['$status', 'PAID'] }] } } },
            { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } }
          ],
          as: 'withdrawalStats'
        }
      },
      {
        $addFields: {
          totalRecharged: { $ifNull: [{ $arrayElemAt: ['$rechargeStats.totalRecharged', 0] }, 0] },
          totalWithdrawn: { $ifNull: [{ $arrayElemAt: ['$withdrawalStats.totalWithdrawn', 0] }, 0] }
        }
      },
      {
        $project: {
          rechargeStats: 0,
          withdrawalStats: 0
        }
      }
    ];

    const withdrawals = await WithdrawalRequest.aggregate(pipeline);
    const total = await WithdrawalRequest.countDocuments(matchStage);

    res.status(200).json({
      success: true,
      data: withdrawals,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.approveWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Atomic update to lock the record
    const withdrawal = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { 
        $set: { 
          status: 'PAID', 
          processedBy: req.user._id, 
          processedAt: new Date() 
        } 
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(400).json({ success: false, message: 'Withdrawal request not found or already processed.' });
    }

    // Update Transaction
    await Transaction.findOneAndUpdate(
      { user: withdrawal.user, type: 'Withdrawal', amount: withdrawal.amount, status: 'pending', description: { $regex: withdrawal.requestId } },
      { $set: { status: 'completed' } }
    );

    await auditService.log('admin_approve_withdrawal', req.user._id, req.user.role, req.ip || '', '', 'success', { requestId: withdrawal.requestId });

    // Emit real-time update to the user
    if (req.app.get('io')) {
      req.app.get('io').of('/game').to(`user_${withdrawal.user.toString()}`).emit('notification', {
        type: 'success',
        message: `Your ₹${withdrawal.amount} withdrawal has been processed successfully.`
      });
      // Also emit a wallet sync event so they fetch the latest transaction history
      req.app.get('io').of('/game').to(`user_${withdrawal.user.toString()}`).emit('wallet_updated', {
        reason: 'WITHDRAWAL_APPROVED',
        transactionId: withdrawal.requestId,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal approved successfully',
      data: withdrawal
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Atomic update to lock the record
    const withdrawal = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { 
        $set: { 
          status: 'REJECTED', 
          processedBy: req.user._id, 
          processedAt: new Date(),
          rejectionReason: reason || 'No reason provided'
        } 
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(400).json({ success: false, message: 'Withdrawal request not found or already processed.' });
    }

    // Refund the user's wallet atomically
    const profile = await Profile.findOneAndUpdate(
      { user: withdrawal.user },
      { $inc: { walletBalance: withdrawal.amount } },
      { new: true }
    );

    // Update Transaction
    await Transaction.findOneAndUpdate(
      { user: withdrawal.user, type: 'Withdrawal', amount: withdrawal.amount, status: 'pending', description: { $regex: withdrawal.requestId } },
      { $set: { status: 'failed' } }
    );

    await auditService.log('admin_reject_withdrawal', req.user._id, req.user.role, req.ip || '', '', 'success', { requestId: withdrawal.requestId, reason });

    if (req.app.get('io')) {
      req.app.get('io').of('/game').to(`user_${withdrawal.user.toString()}`).emit('wallet_updated', {
        balance: profile.walletBalance,
        reason: 'WITHDRAWAL_REJECTED',
        transactionId: withdrawal.requestId,
        timestamp: new Date()
      });
      
      req.app.get('io').of('/game').to(`user_${withdrawal.user.toString()}`).emit('notification', {
        type: 'error',
        message: `Your ₹${withdrawal.amount} withdrawal request was rejected. Reason: ${withdrawal.rejectionReason}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal rejected and refunded successfully',
      data: withdrawal
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ANNOUNCEMENT MANAGEMENT
// ==========================================

exports.getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');

    res.status(200).json({
      success: true,
      data: announcements
    });
  } catch (error) {
    next(error);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      type: type || 'General',
      createdBy: req.user._id
    });

    await announcement.populate('createdBy', 'username');

    await auditService.log('admin_create_announcement', req.user._id, req.user.role, req.ip || '', '', 'success', { announcementId: announcement._id, title });

    if (req.app.get('io')) {
      req.app.get('io').of('/game').emit('new_announcement', {
        ...announcement.toObject(),
        isRead: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created and broadcasted successfully',
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, title, message, type } = req.body;

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (isActive !== undefined) announcement.isActive = isActive;
    if (title) announcement.title = title.trim();
    if (message) announcement.message = message.trim();
    if (type) announcement.type = type;

    await announcement.save();

    await auditService.log('admin_update_announcement', req.user._id, req.user.role, req.ip || '', '', 'success', { announcementId: id });

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await auditService.log('admin_deactivate_announcement', req.user._id, req.user.role, req.ip || '', '', 'success', { announcementId: id });

    res.status(200).json({
      success: true,
      message: 'Announcement deactivated successfully',
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

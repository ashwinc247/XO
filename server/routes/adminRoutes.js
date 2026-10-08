const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, adminOnly, adminController.getDashboardStats);
router.get('/users', protect, adminOnly, adminController.getUsers);
router.get('/user/:id', protect, adminOnly, adminController.getUserDetails);
router.put('/user/:id/status', protect, adminOnly, adminController.toggleUserStatus);
router.get('/matches', protect, adminOnly, adminController.getMatchesList);
router.get('/matches/settlements', protect, adminOnly, adminController.getMatchSettlements);
router.get('/logs', protect, adminOnly, adminController.getAuditLogs);
router.post('/maintenance', protect, adminOnly, adminController.toggleMaintenanceMode);

router.get('/announcements', protect, adminOnly, adminController.getAnnouncements);
router.post('/announcements', protect, adminOnly, adminController.createAnnouncement);
router.put('/announcements/:id', protect, adminOnly, adminController.updateAnnouncement);
router.delete('/announcements/:id', protect, adminOnly, adminController.deleteAnnouncement);

router.get('/recharges', protect, adminOnly, adminController.getRecharges);
router.put('/recharges/:id/approve', protect, adminOnly, adminController.approveRecharge);
router.put('/recharges/:id/reject', protect, adminOnly, adminController.rejectRecharge);
router.get('/payment-proof/:filename', protect, adminOnly, adminController.getPaymentProof);

router.get('/withdrawals', protect, adminOnly, adminController.getWithdrawals);
router.put('/withdrawals/:id/approve', protect, adminOnly, adminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', protect, adminOnly, adminController.rejectWithdrawal);

router.get('/settings/upi', protect, adminOnly, adminController.getUpiSettings);
router.put('/settings/upi', protect, adminOnly, adminController.updateUpiSettings);

module.exports = router;

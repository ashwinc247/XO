const cron = require('node-cron');
const RechargeRequest = require('../models/RechargeRequest');

class CronService {
  start() {
    // Run every minute to check for expired recharge requests
    cron.schedule('* * * * *', async () => {
      try {
        const result = await RechargeRequest.updateMany(
          { 
            status: 'PENDING_PAYMENT',
            expiresAt: { $lt: new Date() }
          },
          { 
            $set: { status: 'EXPIRED' } 
          }
        );
        if (result.modifiedCount > 0) {
          console.log(`[Cron] Expired ${result.modifiedCount} pending recharge requests.`);
        }
      } catch (err) {
        console.error('[Cron] Error expiring recharge requests:', err.message);
      }
    });
  }
}

module.exports = new CronService();

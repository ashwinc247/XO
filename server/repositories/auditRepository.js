const AuditLog = require('../models/AuditLog');

class AuditRepository {
  async log(auditData) {
    try {
      return await AuditLog.create(auditData);
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  async getLogs(filter = {}, limit = 50, skip = 0) {
    return await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username email role');
  }

  async getLogsCount(filter = {}) {
    return await AuditLog.countDocuments(filter);
  }
}

module.exports = new AuditRepository();

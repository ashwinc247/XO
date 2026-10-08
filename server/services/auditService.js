const auditRepository = require('../repositories/auditRepository');

class AuditService {
  async log(action, user, role, ip, requestId, status, metadata = {}) {
    const auditData = {
      action,
      user: user || null,
      role: role || 'guest',
      ip: ip || '',
      requestId: requestId || '',
      status: status || 'success',
      metadata
    };
    return await auditRepository.log(auditData);
  }

  async getLogs(filter = {}, limit = 50, skip = 0) {
    return await auditRepository.getLogs(filter, limit, skip);
  }

  async getLogsCount(filter = {}) {
    return await auditRepository.getLogsCount(filter);
  }
}

module.exports = new AuditService();

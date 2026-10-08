const Maintenance = require('../models/Maintenance');
const auditService = require('./auditService');

class MaintenanceService {
  async getStatus() {
    let mode = await Maintenance.findOne();
    if (!mode) {
      mode = await Maintenance.create({ enabled: false });
    }
    return mode;
  }

  async setStatus(enabled, title, description, startTime = null, endTime = null, adminId = null) {
    let mode = await Maintenance.findOne();
    if (!mode) {
      mode = new Maintenance();
    }

    mode.enabled = enabled;
    if (title) mode.title = title;
    if (description) mode.description = description;
    mode.startTime = startTime;
    mode.endTime = endTime;
    if (adminId) mode.createdBy = adminId;

    await mode.save();

    await auditService.log('maintenance_toggle', adminId, 'admin', '', '', 'success', { enabled, title, description });

    return mode;
  }
}

module.exports = new MaintenanceService();

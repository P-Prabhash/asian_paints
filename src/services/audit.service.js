const AuditRepository = require("../repositories/audit.repository");

class AuditService {
    static async listLogs(options) {
        return AuditRepository.listLogs(options);
    }
}

module.exports = AuditService;

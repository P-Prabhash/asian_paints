const BackupService = require("../services/backup.service");

async function createBackup(req, res) {
    const backup = await BackupService.createBackup(req.user.id);
    res.status(201).json({
        success: true,
        data: backup,
        meta: { requestId: req.requestId }
    });
}

async function listBackups(req, res) {
    const backups = await BackupService.listBackups();
    res.status(200).json({
        success: true,
        data: backups,
        meta: { requestId: req.requestId }
    });
}

async function restoreBackup(req, res) {
    const result = await BackupService.restoreBackup(parseInt(req.params.id, 10), req.user.id);
    res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    createBackup,
    listBackups,
    restoreBackup
};

const ReportsService = require("../services/reports.service");

async function getDashboardSummary(req, res) {
    const summary = await ReportsService.getDashboardSummary();
    res.status(200).json({
        success: true,
        data: summary,
        meta: { requestId: req.requestId }
    });
}

async function getSalesReport(req, res) {
    const report = await ReportsService.getSalesReport({
        startDate: req.query.startDate,
        endDate: req.query.endDate
    });
    res.status(200).json({
        success: true,
        data: report,
        meta: { requestId: req.requestId }
    });
}

async function getProductSalesReport(req, res) {
    const report = await ReportsService.getProductSalesReport({
        startDate: req.query.startDate,
        endDate: req.query.endDate
    });
    res.status(200).json({
        success: true,
        data: report,
        meta: { requestId: req.requestId }
    });
}

async function getGstReport(req, res) {
    const report = await ReportsService.getGstReport({
        startDate: req.query.startDate,
        endDate: req.query.endDate
    });
    res.status(200).json({
        success: true,
        data: report,
        meta: { requestId: req.requestId }
    });
}

async function getReceivablesReport(req, res) {
    const report = await ReportsService.getReceivablesReport();
    res.status(200).json({
        success: true,
        data: report,
        meta: { requestId: req.requestId }
    });
}

module.exports = {
    getDashboardSummary,
    getSalesReport,
    getProductSalesReport,
    getGstReport,
    getReceivablesReport
};

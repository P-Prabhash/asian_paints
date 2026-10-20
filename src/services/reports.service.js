const ReportsRepository = require("../repositories/reports.repository");

class ReportsService {
    static async getDashboardSummary() {
        return ReportsRepository.getDashboardSummary();
    }

    static async getSalesReport({ startDate, endDate }) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const end = endDate || new Date().toISOString().split("T")[0];
        return ReportsRepository.getSalesReport({ startDate: start, endDate: end });
    }

    static async getProductSalesReport({ startDate, endDate }) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const end = endDate || new Date().toISOString().split("T")[0];
        return ReportsRepository.getProductSalesReport({ startDate: start, endDate: end });
    }

    static async getGstReport({ startDate, endDate }) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const end = endDate || new Date().toISOString().split("T")[0];
        return ReportsRepository.getGstReport({ startDate: start, endDate: end });
    }

    static async getReceivablesReport() {
        return ReportsRepository.getReceivablesReport();
    }
}

module.exports = ReportsService;

const PaymentRepository = require("../repositories/payment.repository");

class PaymentService {
    static async listPayments(options) {
        return PaymentRepository.listPayments(options);
    }
}

module.exports = PaymentService;

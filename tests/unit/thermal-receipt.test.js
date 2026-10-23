const { renderThermalReceipt } = require("../../src/utils/thermal-receipt");

describe("80mm thermal invoice receipt", () => {
    test("renders GST-inclusive line prices, tax breakdown, and payment information", () => {
        const html = renderThermalReceipt({
            invoice_no: "PNT-1001",
            category_filter: "PAINT",
            created_at: "2026-10-23T10:00:00.000Z",
            customer_name: "Ravi Kumar",
            customer_mobile: "9876543210",
            subtotal: "100.00",
            discount_total: "0.00",
            taxable_total: "100.00",
            cgst_total: "9.00",
            sgst_total: "9.00",
            igst_total: "0.00",
            round_off: "0.00",
            grand_total: "118.00",
            paid_total: "118.00",
            due_total: "0.00",
            payment_status: "PAID",
            items: [{
                product_name_snapshot: "Interior Paint",
                qty: "1.00",
                unit_price: "100.00",
                tax_rate_snapshot: "18.00",
                line_total: "118.00",
                discount: "0.00"
            }],
            payments: [{
                method: "CASH",
                amount: "118.00",
                reference_no: null
            }]
        }, {
            shop_name: "Paint Shop",
            gstin: "36ABCDE1234F1Z5"
        });

        expect(html).toContain("@page{size:80mm auto");
        expect(html).toContain("118.00");
        expect(html).toContain("CGST");
        expect(html).toContain("SGST");
        expect(html).toContain("CASH");
        expect(html).toContain("Print 80mm receipt");
    });

    test("escapes dynamic HTML content", () => {
        const html = renderThermalReceipt({
            invoice_no: "<script>alert(1)</script>",
            category_filter: "PAINT",
            items: [],
            payments: []
        }, {
            shop_name: "<img src=x onerror=alert(1)>"
        });

        expect(html).toContain("&lt;script&gt;");
        expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
        expect(html).not.toContain("<script>alert(1)</script>");
    });
});

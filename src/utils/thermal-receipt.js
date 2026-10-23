const { roundToTwoDecimals } = require("./money");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatAmount(value) {
    return roundToTwoDecimals(Number(value)).toFixed(2);
}

function renderThermalReceipt(sale, settings = {}) {
    const items = sale.items.map(item => {
        const unitPriceIncludingGst = roundToTwoDecimals(
            Number(item.unit_price) * (1 + Number(item.tax_rate_snapshot) / 100)
        );
        return `<tr class="product"><td colspan="3">${escapeHtml(item.product_name_snapshot)}</td></tr>
            <tr><td>${escapeHtml(item.qty)} x ${formatAmount(unitPriceIncludingGst)}</td><td class="right" colspan="2">${formatAmount(item.line_total)}</td></tr>
            ${Number(item.discount) > 0 ? `<tr class="muted"><td colspan="3">Discount: -${formatAmount(item.discount)}</td></tr>` : ""}`;
    }).join("");

    const payments = sale.payments.map(payment => `
        <div class="row"><span>${escapeHtml(payment.method)}</span><span>${formatAmount(payment.amount)}</span></div>
        ${payment.reference_no ? `<div class="muted">Ref: ${escapeHtml(payment.reference_no)}</div>` : ""}
    `).join("");

    const taxLabel = Number(sale.igst_total) > 0
        ? `<div class="row"><span>IGST</span><span>${formatAmount(sale.igst_total)}</span></div>`
        : `<div class="row"><span>CGST</span><span>${formatAmount(sale.cgst_total)}</span></div>
           <div class="row"><span>SGST</span><span>${formatAmount(sale.sgst_total)}</span></div>`;
    const date = sale.created_at ? new Date(sale.created_at).toLocaleString("en-IN") : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(sale.invoice_no)}</title>
<style>
@page{size:80mm auto;margin:3mm}
*{box-sizing:border-box}
html,body{width:74mm;margin:0 auto;color:#000;background:#fff;font:11px/1.35 "Courier New",monospace}
.receipt{width:74mm;padding:1mm}
.center{text-align:center}
.right{text-align:right}
.muted{font-size:9px}
.rule{border-top:1px dashed #000;margin:6px 0}
h1{font-size:16px;margin:0 0 3px}
p{margin:2px 0;overflow-wrap:anywhere}
.row{display:flex;justify-content:space-between;gap:4px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{padding:2px 0;vertical-align:top;overflow-wrap:anywhere}
th{border-bottom:1px solid #000;text-align:left}
th:first-child{width:54%}
th:nth-child(2){width:19%;text-align:right}
th:nth-child(3){width:27%;text-align:right}
.product td{padding-top:4px;font-weight:bold}
.totals .row{margin:2px 0}
.grand{font-weight:bold;font-size:13px}
.actions{text-align:center;margin:12px 0}
button{font:inherit;padding:6px 14px}
@media print{.actions{display:none}html,body{width:74mm}.receipt{padding:0}}
</style>
</head>
<body><main class="receipt">
<header class="center">
<h1>${escapeHtml(settings.shop_name || "Paint Shop")}</h1>
${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
${settings.phone ? `<p>Phone: ${escapeHtml(settings.phone)}</p>` : ""}
${settings.gstin ? `<p>GSTIN: ${escapeHtml(settings.gstin)}</p>` : ""}
<div class="rule"></div>
<p><strong>${escapeHtml(sale.category_filter)} TAX INVOICE</strong></p>
</header>
<div class="row"><span>Invoice</span><strong>${escapeHtml(sale.invoice_no)}</strong></div>
<div class="row"><span>Date</span><span>${escapeHtml(date)}</span></div>
<div class="row"><span>Customer</span><span>${escapeHtml(sale.customer_name || "Walk-in Customer")}</span></div>
${sale.customer_mobile ? `<div class="row"><span>Mobile</span><span>${escapeHtml(sale.customer_mobile)}</span></div>` : ""}
${sale.customer_gstin ? `<div class="row"><span>GSTIN</span><span>${escapeHtml(sale.customer_gstin)}</span></div>` : ""}
<div class="rule"></div>
<table>
<thead><tr><th>ITEM / QTY x RATE*</th><th></th><th>AMOUNT</th></tr></thead>
<tbody>${items}</tbody>
</table>
<p class="muted">*Unit rate includes GST</p>
<div class="rule"></div>
<section class="totals">
<div class="row"><span>Subtotal</span><span>${formatAmount(sale.subtotal)}</span></div>
${Number(sale.discount_total) > 0 ? `<div class="row"><span>Discount</span><span>-${formatAmount(sale.discount_total)}</span></div>` : ""}
<div class="row"><span>Taxable amount</span><span>${formatAmount(sale.taxable_total)}</span></div>
${taxLabel}
${Number(sale.round_off) !== 0 ? `<div class="row"><span>Round off</span><span>${formatAmount(sale.round_off)}</span></div>` : ""}
<div class="row grand"><span>GRAND TOTAL (incl. GST)</span><span>${formatAmount(sale.grand_total)}</span></div>
<div class="rule"></div>
<p><strong>PAYMENT DETAILS</strong></p>
${payments || `<div class="row"><span>Payment status</span><span>${escapeHtml(sale.payment_status)}</span></div>`}
<div class="row"><span>Paid</span><span>${formatAmount(sale.paid_total)}</span></div>
<div class="row"><span>Balance due</span><span>${formatAmount(sale.due_total)}</span></div>
</section>
<div class="rule"></div>
<p class="center">Thank you. Please visit again.</p>
<div class="actions"><button type="button" onclick="window.print()">Print 80mm receipt</button></div>
</main></body></html>`;
}

module.exports = { renderThermalReceipt };

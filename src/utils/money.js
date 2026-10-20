function roundToTwoDecimals(num) {
    const val = typeof num === 'number' ? num : parseFloat(num) || 0;
    return Math.round((val + Number.EPSILON) * 100) / 100;
}

function calculateLineItemTax({ unitPrice, qty, discount = 0, gstRate = 0, isInterState = false }) {
    const price = roundToTwoDecimals(unitPrice);
    const quantity = roundToTwoDecimals(qty);
    const disc = roundToTwoDecimals(discount);
    const rate = roundToTwoDecimals(gstRate);

    const grossSubtotal = roundToTwoDecimals(price * quantity);
    const taxableValue = Math.max(0, roundToTwoDecimals(grossSubtotal - disc));

    const totalTax = roundToTwoDecimals((taxableValue * rate) / 100);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
        igst = totalTax;
    } else {
        cgst = roundToTwoDecimals(totalTax / 2);
        sgst = roundToTwoDecimals(totalTax - cgst);
    }

    const lineTotal = roundToTwoDecimals(taxableValue + totalTax);

    return {
        grossSubtotal,
        discount: disc,
        taxableValue,
        gstRate: rate,
        totalTax,
        cgst,
        sgst,
        igst,
        lineTotal
    };
}

function calculateInvoiceTotals(items, isInterState = false) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const calculatedItems = items.map(item => {
        const calc = calculateLineItemTax({
            unitPrice: item.unitPrice,
            qty: item.qty,
            discount: item.discount || 0,
            gstRate: item.gstRate || 0,
            isInterState
        });

        subtotal += calc.grossSubtotal;
        discountTotal += calc.discount;
        taxableTotal += calc.taxableValue;
        cgstTotal += calc.cgst;
        sgstTotal += calc.sgst;
        igstTotal += calc.igst;

        return {
            ...item,
            ...calc
        };
    });

    subtotal = roundToTwoDecimals(subtotal);
    discountTotal = roundToTwoDecimals(discountTotal);
    taxableTotal = roundToTwoDecimals(taxableTotal);
    cgstTotal = roundToTwoDecimals(cgstTotal);
    sgstTotal = roundToTwoDecimals(sgstTotal);
    igstTotal = roundToTwoDecimals(igstTotal);

    const unroundedGrandTotal = roundToTwoDecimals(taxableTotal + cgstTotal + sgstTotal + igstTotal);
    const grandTotal = Math.round(unroundedGrandTotal);
    const roundOff = roundToTwoDecimals(grandTotal - unroundedGrandTotal);

    return {
        items: calculatedItems,
        subtotal,
        discountTotal,
        taxableTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        roundOff,
        grandTotal
    };
}

module.exports = {
    roundToTwoDecimals,
    calculateLineItemTax,
    calculateInvoiceTotals
};

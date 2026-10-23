const { createCustomerSchema, updateCustomerSchema } = require("../../src/validators/customer.validator");

describe("Customer validation", () => {
    const requiredDetails = {
        name: "Ravi Kumar",
        mobile: "+919876543210"
    };

    test("requires customer name and mobile number", () => {
        expect(createCustomerSchema.safeParse({ name: "Ravi Kumar" }).success).toBe(false);
        expect(createCustomerSchema.safeParse({ mobile: "9876543210" }).success).toBe(false);
    });

    test("accepts and normalizes all customer creation details", () => {
        const result = createCustomerSchema.parse({
            ...requiredDetails,
            customerCode: " CUS-0001 ",
            alternatePhone: "04012345678",
            email: "ravi@example.com",
            addressLine: "12 Main Road",
            city: "Hyderabad",
            state: "Telangana",
            pinCode: "500001",
            country: "India",
            gstin: "36ABCDE1234F1Z5",
            pan: "ABCDE1234F",
            customerType: "BUSINESS",
            openingBalance: "1250.50",
            creditLimit: 25000,
            paymentTerms: "Net 30 days",
            notes: "Preferred delivery in the morning"
        });

        expect(result).toMatchObject({
            name: "Ravi Kumar",
            customerCode: "CUS-0001",
            mobile: "+919876543210",
            openingBalance: 1250.5,
            creditLimit: 25000,
            active: true
        });
    });

    test.each([
        [{ ...requiredDetails, creditLimit: -1 }],
        [{ ...requiredDetails, openingBalance: 100.999 }],
        [{ ...requiredDetails, creditLimit: "not-an-amount" }],
        [{ ...requiredDetails, email: "invalid-email" }],
        [{ name: "Ravi Kumar", mobile: "12" }]
    ])("rejects invalid financial or customer details", payload => {
        expect(createCustomerSchema.safeParse(payload).success).toBe(false);
    });

    test("allows updating customer account details but not opening balance", () => {
        expect(updateCustomerSchema.safeParse({ creditLimit: "5000.00" })).toMatchObject({
            success: true,
            data: { creditLimit: 5000 }
        });
        expect(updateCustomerSchema.safeParse({ openingBalance: 500 }).success).toBe(false);
    });
});

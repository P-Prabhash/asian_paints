const { z } = require("zod");

const updateSettingsSchema = z.record(z.string(), z.string());

module.exports = {
    updateSettingsSchema
};

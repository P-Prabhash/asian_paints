const AppError = require("./app-error");

function getSalesCategory(categoryName) {
    const normalized = String(categoryName || "").trim().toLowerCase();
    if (normalized.includes("paint")) return "PAINT";
    if (normalized.includes("sunnam") || normalized.includes("lime")) return "SUNNAM";

    const category = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
    return category || "OTHER";
}

function normalizeCategoryFilter(categoryFilter) {
    const normalized = String(categoryFilter || "ALL").trim();
    if (!normalized || normalized.toUpperCase() === "ALL") return "ALL";
    return getSalesCategory(normalized);
}

function requireSingleCategory(products, categoryFilter = "ALL") {
    const categories = new Set(products.map(product => getSalesCategory(product.category_name)));
    if (categories.size > 1) {
        throw new AppError(
            "Paint, Sunnam, and other product categories must be billed on separate invoices",
            400,
            "MIXED_CATEGORY_INVOICE"
        );
    }

    const actualCategory = categories.values().next().value || normalizeCategoryFilter(categoryFilter);
    const requestedCategory = normalizeCategoryFilter(categoryFilter);
    if (requestedCategory !== "ALL" && actualCategory !== requestedCategory) {
        throw new AppError(
            `Selected ${requestedCategory} billing cannot include products from ${actualCategory}`,
            400,
            "CATEGORY_MISMATCH"
        );
    }

    return actualCategory;
}

module.exports = {
    getSalesCategory,
    normalizeCategoryFilter,
    requireSingleCategory
};

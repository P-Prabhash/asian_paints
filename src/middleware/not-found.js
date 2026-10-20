function notFound(req, res) {
    const requestId = req.requestId || "req-unknown";
    res.status(404).json({
        success: false,
        error: {
            code: "ROUTE_NOT_FOUND",
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            details: [],
            requestId
        }
    });
}

module.exports = notFound;

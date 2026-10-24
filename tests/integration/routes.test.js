const app = require("../../src/app");

describe("API Route Architecture & Uniqueness Tests", () => {
    function extractAllRoutes(expressApp) {
        const routes = [];
        const rootRouter = expressApp.router || expressApp._router;

        function traverse(layer, prefix = "/api/v1") {
            if (!layer) return;

            if (layer.route && layer.route.path) {
                const fullPath = (prefix + layer.route.path).replace(/\/+/g, "/");
                const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
                for (const m of methods) {
                    if (m && m !== "_ALL") {
                        routes.push({ method: m, path: fullPath });
                    }
                }
                return;
            }

            const childStack = layer.stack || (layer.handle && layer.handle.stack);
            if (childStack && Array.isArray(childStack)) {
                for (const child of childStack) {
                    traverse(child, prefix);
                }
            }
        }

        traverse(rootRouter);
        return routes;
    }

    test("All registered route Method + Path combinations must be unique", () => {
        const routes = extractAllRoutes(app);
        const routeKeys = routes.map(r => `${r.method} ${r.path}`);
        const uniqueKeys = new Set(routeKeys);

        expect(routes.length).toBeGreaterThan(20);
        expect(uniqueKeys.size).toEqual(routeKeys.length);
    });

    test("Product lookup endpoint precedes parameter route /products/:id", () => {
        const routes = extractAllRoutes(app);
        const productRoutes = routes.filter(r => r.path.includes("products"));

        const lookupIndex = productRoutes.findIndex(r => r.path.includes("lookup"));
        const idIndex = productRoutes.findIndex(r => r.path.includes(":id"));

        expect(lookupIndex).toBeGreaterThan(-1);
        expect(idIndex).toBeGreaterThan(-1);
        expect(lookupIndex).toBeLessThan(idIndex);
    });

    test("Category management endpoints are not registered", () => {
        const routes = extractAllRoutes(app);

        expect(routes.some(route => route.path === "/api/v1/categories")).toBe(false);
        expect(routes.some(route => route.path.startsWith("/api/v1/categories/"))).toBe(false);
    });

    test("Unit and GST reference data endpoints remain available without category management", () => {
        const routes = extractAllRoutes(app);
        const routeKeys = new Set(routes.map(route => `${route.method} ${route.path}`));

        expect(routeKeys.has("GET /api/v1/units")).toBe(true);
        expect(routeKeys.has("GET /api/v1/gst-rates")).toBe(true);
    });

    test("purchase and sale mutation endpoints are registered", () => {
        const routeKeys = new Set(extractAllRoutes(app).map(route => `${route.method} ${route.path}`));

        expect(routeKeys.has("GET /api/v1/purchases/:id")).toBe(true);
        expect(routeKeys.has("PUT /api/v1/purchases/:id")).toBe(true);
        expect(routeKeys.has("DELETE /api/v1/purchases/:id")).toBe(true);
        expect(routeKeys.has("DELETE /api/v1/sales/:id")).toBe(true);
    });
});

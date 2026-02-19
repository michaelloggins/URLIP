const { app } = require('@azure/functions');

/**
 * Health Check Endpoint
 *
 * Purpose: Provides a simple health check endpoint for monitoring and load balancers.
 *
 * @route GET /api/health
 * @returns {object} Health status with timestamp
 */
app.http('healthcheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check requested');

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.ENVIRONMENT || 'unknown'
        };

        return {
            status: 200,
            jsonBody: healthStatus
        };
    }
});

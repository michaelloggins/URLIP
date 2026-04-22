/**
 * URLIP Azure Functions Entry Point
 * MVD Universal Reference Lab Integration Platform
 */

const { app } = require('@azure/functions');

// Register compendium API endpoints
require('./functions/compendium');

// Register compendium sync timer + manual trigger + status endpoints
require('./functions/compendiumSync');
require('./functions/compendiumAdmin');

// Register portal
require('./functions/portal');

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check requested');
        return {
            status: 200,
            jsonBody: {
                status: 'healthy',
                service: 'URLIP API',
                version: process.env.npm_package_version || '0.1.0',
                timestamp: new Date().toISOString(),
                environment: process.env.ENVIRONMENT || 'local'
            }
        };
    }
});

console.log('URLIP Azure Functions registered successfully');

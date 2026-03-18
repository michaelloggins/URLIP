/**
 * Portal — serves the static HTML compendium browser.
 */

const { app } = require('@azure/functions');
const fs = require('fs');
const path = require('path');

app.http('portal', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'portal/compendium',
    handler: async (request, context) => {
        try {
            const htmlPath = path.join(__dirname, '..', 'portal', 'compendium.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');
            return {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: html
            };
        } catch (error) {
            context.error('Portal error:', error);
            return {
                status: 500,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Failed to load portal: ' + error.message
            };
        }
    }
});

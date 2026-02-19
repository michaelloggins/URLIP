const { app } = require('@azure/functions');

/**
 * Compendium API - Get All Tests
 *
 * Purpose: Returns the MVD test compendium catalog.
 * PRD Reference: Section 7.3 - Compendium Data System
 *
 * @route GET /api/compendium
 * @returns {array} List of tests in the compendium
 */
app.http('compendiumList', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium',
    handler: async (request, context) => {
        context.log('Compendium list requested');

        // TODO: Replace with actual compendium data from StarLIMS
        const sampleCompendium = [
            {
                mvd_test_code: 'HISTO_AG',
                test_name: 'Histoplasma Antigen, Urine',
                loinc_code: '31777-6',
                specimen_type: 'Urine',
                category: 'Fungal Antigen',
                status: 'active'
            },
            {
                mvd_test_code: 'BLASTO_AG',
                test_name: 'Blastomyces Antigen, Urine',
                loinc_code: '31776-8',
                specimen_type: 'Urine',
                category: 'Fungal Antigen',
                status: 'active'
            }
        ];

        return {
            status: 200,
            jsonBody: {
                version: '1.0.0',
                last_updated: new Date().toISOString(),
                count: sampleCompendium.length,
                tests: sampleCompendium
            }
        };
    }
});

/**
 * Compendium API - Get Single Test
 *
 * @route GET /api/compendium/{code}
 * @param {string} code - MVD test code
 * @returns {object} Single test details
 */
app.http('compendiumGet', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/{code}',
    handler: async (request, context) => {
        const code = request.params.code;
        context.log(`Compendium lookup for code: ${code}`);

        // TODO: Replace with actual lookup from StarLIMS/database
        const testData = {
            mvd_test_code: code,
            test_name: 'Sample Test',
            message: 'TODO: Implement actual compendium lookup'
        };

        return {
            status: 200,
            jsonBody: testData
        };
    }
});

/**
 * Compendium API - Get Version Info
 *
 * @route GET /api/compendium/version
 * @returns {object} Current compendium version information
 */
app.http('compendiumVersion', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/version',
    handler: async (request, context) => {
        context.log('Compendium version requested');

        return {
            status: 200,
            jsonBody: {
                version: '1.0.0',
                effective_date: '2026-02-19',
                last_updated: new Date().toISOString(),
                change_summary: 'Initial compendium release'
            }
        };
    }
});

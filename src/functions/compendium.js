/**
 * Compendium API Endpoints
 *
 * 6 Azure Functions v4 HTTP endpoints for the MVD test compendium.
 * Route registration order matters: explicit routes before parameterized {identifier}.
 *
 * All endpoints accept an optional `locale` query parameter (e.g. ?locale=fr-CA).
 * Supported: en-US (default), fr-CA, es-MX. Unknown locales fall back to en-US.
 */

const { app } = require('@azure/functions');
const compendiumService = require('../services/compendiumService');

/** Extract locale from URL search params — shared by all handlers. */
function getLocale(url) {
    return url.searchParams.get('locale') || undefined;
}

// ============================================================================
// 1. GET /api/compendium — List all tests
// ============================================================================
app.http('compendiumList', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium',
    handler: async (request, context) => {
        try {
            const url = new URL(request.url);
            const view = url.searchParams.get('view') || 'grouped';
            const category = url.searchParams.get('category') || undefined;
            const organism = url.searchParams.get('organism') || undefined;
            const status = url.searchParams.get('status') || undefined;
            const market = url.searchParams.get('market') || undefined;
            const page = parseInt(url.searchParams.get('page'), 10) || 1;
            const pageSize = Math.min(parseInt(url.searchParams.get('pageSize'), 10) || 50, 200);
            const locale = getLocale(url);

            context.log(`Compendium list: view=${view}, category=${category}, status=${status}, market=${market}, page=${page}, locale=${locale || 'en-US'}`);

            const result = compendiumService.getAllTests({ view, category, organism, status, market, page, pageSize, locale });
            return { status: 200, jsonBody: result };
        } catch (error) {
            context.error('Compendium list error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

// ============================================================================
// 2. GET /api/compendium/search — Search tests
// ============================================================================
app.http('compendiumSearch', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/search',
    handler: async (request, context) => {
        try {
            const url = new URL(request.url);
            const query = url.searchParams.get('q') || undefined;
            const category = url.searchParams.get('category') || undefined;
            const organism = url.searchParams.get('organism') || undefined;
            const sampleType = url.searchParams.get('sampleType') || undefined;
            const cptCode = url.searchParams.get('cptCode') || undefined;
            const status = url.searchParams.get('status') || undefined;
            const market = url.searchParams.get('market') || undefined;
            const locale = getLocale(url);

            context.log(`Compendium search: q=${query}, category=${category}, status=${status}, market=${market}, locale=${locale || 'en-US'}`);

            const result = compendiumService.searchTests({ query, category, organism, sampleType, cptCode, status, market, locale });
            return { status: 200, jsonBody: result };
        } catch (error) {
            context.error('Compendium search error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

// ============================================================================
// 3. GET /api/compendium/version — Metadata (includes supportedLocales)
// ============================================================================
app.http('compendiumVersion', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/version',
    handler: async (request, context) => {
        try {
            const version = compendiumService.getVersion();
            return { status: 200, jsonBody: version };
        } catch (error) {
            context.error('Compendium version error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

// ============================================================================
// 4. GET /api/compendium/validate-specimen — Specimen validation
// ============================================================================
app.http('compendiumValidateSpecimen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/validate-specimen',
    handler: async (request, context) => {
        try {
            const url = new URL(request.url);
            const loinc = url.searchParams.get('loinc');
            const specimen = url.searchParams.get('specimen');

            if (!loinc || !specimen) {
                return {
                    status: 400,
                    jsonBody: { error: 'Both "loinc" and "specimen" query parameters are required' }
                };
            }

            context.log(`Specimen validation: loinc=${loinc}, specimen=${specimen}`);

            const result = compendiumService.validateSpecimen(loinc, specimen);
            return { status: 200, jsonBody: result };
        } catch (error) {
            context.error('Specimen validation error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

// ============================================================================
// 5. GET /api/compendium/export — Download compendium
// ============================================================================
app.http('compendiumExport', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/export',
    handler: async (request, context) => {
        try {
            const url = new URL(request.url);
            const format = url.searchParams.get('format') || 'json';
            const locale = getLocale(url);

            if (format !== 'json' && format !== 'csv') {
                return {
                    status: 400,
                    jsonBody: { error: 'Format must be "json" or "csv"' }
                };
            }

            context.log(`Compendium export: format=${format}, locale=${locale || 'en-US'}`);

            const result = compendiumService.exportCompendium(format, locale);
            return {
                status: 200,
                headers: {
                    'Content-Type': result.contentType,
                    'Content-Disposition': `attachment; filename="${result.filename}"`
                },
                body: result.data
            };
        } catch (error) {
            context.error('Compendium export error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

// ============================================================================
// 6. GET /api/compendium/{identifier} — Get by LOINC or MVD code
//    REGISTERED LAST to avoid swallowing explicit routes above
// ============================================================================
app.http('compendiumZLookup', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/{identifier}',
    handler: async (request, context) => {
        try {
            const identifier = request.params.identifier;
            const url = new URL(request.url);
            const locale = getLocale(url);
            context.log(`Compendium lookup: identifier=${identifier}, locale=${locale || 'en-US'}`);

            const result = compendiumService.getTestByIdentifier(identifier, locale);
            if (!result) {
                return {
                    status: 404,
                    jsonBody: { error: 'Test not found', identifier }
                };
            }

            return { status: 200, jsonBody: result };
        } catch (error) {
            context.error('Compendium lookup error:', error);
            return { status: 500, jsonBody: { error: 'Internal server error' } };
        }
    }
});

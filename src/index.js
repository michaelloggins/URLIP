/**
 * URLIP Azure Functions Entry Point
 * MVD Universal Reference Lab Integration Platform
 */

const { app } = require('@azure/functions');

// ============================================================================
// Sample Compendium Data (will be replaced with Azure Blob Storage)
// ============================================================================

const SAMPLE_COMPENDIUM = {
    version: '1.0.0',
    lastUpdated: '2026-02-19T00:00:00Z',
    tests: [
        {
            mvd_test_code: 'HISTO_AG',
            test_name: 'Histoplasma Antigen, Urine or Serum',
            loinc_code: '9784-5',
            loinc_name: 'Histoplasma capsulatum Ag [Presence] in Urine',
            cpt_codes: ['87385'],
            specimen_requirements: {
                preferred: ['Urine', 'Serum'],
                volume: '3 mL minimum',
                container: 'Sterile cup or red-top tube',
                transport: 'Refrigerated, ship on ice pack'
            },
            result_components: [
                { observation_id: 'HISTO_AG_QUAL', name: 'Histoplasma Antigen (Qualitative)', data_type: 'CE', units: null, reference_range: 'Negative' },
                { observation_id: 'HISTO_AG_QUANT', name: 'Histoplasma Antigen (Quantitative)', data_type: 'NM', units: 'ng/mL', reference_range: '<=0.4' }
            ],
            aoe_questions: [
                { question_id: 'AOE_IMMUNOCOMP', question_text: 'Is the patient immunocompromised?', answer_type: 'boolean', required: false }
            ],
            category: 'Fungal',
            market: 'human',
            tat_days: 3
        },
        {
            mvd_test_code: 'BLASTO_AG',
            test_name: 'Blastomyces Antigen, Urine or Serum',
            loinc_code: '9785-2',
            loinc_name: 'Blastomyces dermatitidis Ag [Presence] in Serum',
            cpt_codes: ['87385'],
            specimen_requirements: {
                preferred: ['Urine', 'Serum'],
                volume: '3 mL minimum',
                container: 'Sterile cup or red-top tube',
                transport: 'Refrigerated, ship on ice pack'
            },
            result_components: [
                { observation_id: 'BLASTO_AG_QUAL', name: 'Blastomyces Antigen (Qualitative)', data_type: 'CE', units: null, reference_range: 'Negative' }
            ],
            aoe_questions: [],
            category: 'Fungal',
            market: 'human',
            tat_days: 3
        },
        {
            mvd_test_code: 'VET_HISTO',
            test_name: 'Canine/Feline Histoplasma Antigen',
            loinc_code: '9784-5',
            loinc_name: 'Histoplasma capsulatum Ag [Presence] in Urine',
            cpt_codes: [],
            specimen_requirements: {
                preferred: ['Urine'],
                volume: '2 mL minimum',
                container: 'Sterile cup',
                transport: 'Refrigerated'
            },
            result_components: [
                { observation_id: 'VET_HISTO_QUAL', name: 'Histoplasma Antigen (Qualitative)', data_type: 'CE', units: null, reference_range: 'Negative' }
            ],
            aoe_questions: [
                { question_id: 'AOE_SPECIES', question_text: 'Species', answer_type: 'choice', choices: ['Canine', 'Feline', 'Other'], required: true }
            ],
            category: 'Fungal',
            market: 'veterinary',
            tat_days: 3
        }
    ]
};

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

// ============================================================================
// Compendium API Endpoints
// ============================================================================

app.http('compendium', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/{testCode?}',
    handler: async (request, context) => {
        const testCode = request.params.testCode;
        context.log(`Compendium request for: ${testCode || 'all tests'}`);

        if (testCode) {
            const test = SAMPLE_COMPENDIUM.tests.find(
                t => t.mvd_test_code.toLowerCase() === testCode.toLowerCase()
            );
            if (!test) {
                return { status: 404, jsonBody: { error: 'Test not found', code: testCode } };
            }
            return { status: 200, jsonBody: test };
        }

        return {
            status: 200,
            jsonBody: {
                version: SAMPLE_COMPENDIUM.version,
                lastUpdated: SAMPLE_COMPENDIUM.lastUpdated,
                totalTests: SAMPLE_COMPENDIUM.tests.length,
                tests: SAMPLE_COMPENDIUM.tests
            }
        };
    }
});

app.http('compendiumSearch', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/search',
    handler: async (request, context) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q')?.toLowerCase();
        const category = url.searchParams.get('category')?.toLowerCase();
        const market = url.searchParams.get('market')?.toLowerCase();

        context.log(`Compendium search: q=${query}, category=${category}, market=${market}`);

        let results = SAMPLE_COMPENDIUM.tests;

        if (query) {
            results = results.filter(t =>
                t.test_name.toLowerCase().includes(query) ||
                t.mvd_test_code.toLowerCase().includes(query)
            );
        }
        if (category) {
            results = results.filter(t => t.category.toLowerCase() === category);
        }
        if (market) {
            results = results.filter(t => t.market.toLowerCase() === market);
        }

        return {
            status: 200,
            jsonBody: {
                query: { q: query, category, market },
                totalResults: results.length,
                results
            }
        };
    }
});

app.http('compendiumVersion', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/version',
    handler: async (request, context) => {
        context.log('Compendium version requested');
        return {
            status: 200,
            jsonBody: {
                version: SAMPLE_COMPENDIUM.version,
                lastUpdated: SAMPLE_COMPENDIUM.lastUpdated,
                totalTests: SAMPLE_COMPENDIUM.tests.length,
                categories: [...new Set(SAMPLE_COMPENDIUM.tests.map(t => t.category))],
                markets: [...new Set(SAMPLE_COMPENDIUM.tests.map(t => t.market))]
            }
        };
    }
});

console.log('URLIP Azure Functions registered successfully');

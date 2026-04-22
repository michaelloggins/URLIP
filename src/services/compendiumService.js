/**
 * Compendium Service Layer
 *
 * Business logic orchestrator that sits between the API endpoints
 * and the data access / validation layers.
 */

const dataAccess = require('../lib/compendiumDataAccess');
const { validateSpecimenSource } = require('../lib/specimenValidator');
const { getEffectiveStatus } = require('../models/compendiumModels');
const { localizeTests, localizeOne, SUPPORTED_LOCALES } = require('../lib/compendiumLocalizer');

/**
 * Get all tests with optional filtering, pagination, and localization.
 * @param {Object} params
 * @param {string} [params.view='grouped'] - 'grouped' (18 test groups) or 'flat' (42 orderable LOINCs)
 * @param {string} [params.category] - Filter by category
 * @param {string} [params.organism] - Filter by organism
 * @param {string} [params.status] - Filter by test-level status (Active, New, Disabled)
 * @param {string} [params.market] - Filter by market (Human, Veterinary)
 * @param {number} [params.page=1] - Page number (1-based)
 * @param {number} [params.pageSize=50] - Items per page
 * @param {string} [params.locale='en-US'] - BCP 47 locale tag for response translation
 * @returns {Object}
 */
function getAllTests({ view = 'grouped', category, organism, status, market, page = 1, pageSize = 50, locale } = {}) {
    let tests = localizeTests(dataAccess.searchTests({ category, organism, status, market }), locale);

    if (view === 'flat') {
        // Flatten to orderable LOINCs with effectiveStatus
        const flat = [];
        for (const test of tests) {
            for (const ol of test.orderableLoincs) {
                flat.push({
                    mvdTestCode: test.mvdTestCode,
                    market: test.market || 'Human',
                    species: test.species || 'Human',
                    testName: test.testName,
                    category: test.category,
                    methodology: test.methodology,
                    organism: test.organism,
                    cptCodes: test.cptCodes,
                    tat: test.tat,
                    effectiveStatus: getEffectiveStatus(test, ol),
                    ...ol
                });
            }
        }

        const total = flat.length;
        const start = (page - 1) * pageSize;
        const paged = flat.slice(start, start + pageSize);

        return {
            view: 'flat',
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            results: paged
        };
    }

    // Grouped view (default)
    const total = tests.length;
    const start = (page - 1) * pageSize;
    const paged = tests.slice(start, start + pageSize);

    return {
        view: 'grouped',
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        results: paged
    };
}

/**
 * Get a test by identifier — auto-detects LOINC vs MVD code format.
 * LOINC codes match pattern: digits-digit(s) (e.g., "48952-6")
 * MVD codes are numeric strings (e.g., "310", "1000")
 * @param {string} identifier
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {Object|null}
 */
function getTestByIdentifier(identifier, locale) {
    const id = String(identifier).trim();

    // LOINC pattern: digits-digits
    if (/^\d+-\d+$/.test(id)) {
        const result = dataAccess.getTestByLoincCode(id);
        if (result) {
            return {
                identifierType: 'loinc',
                test: localizeOne(result.test, locale),
                matchedOrderable: result.orderable
            };
        }
        return null;
    }

    // MVD code: numeric
    if (/^\d+$/.test(id)) {
        const test = dataAccess.getTestByMvdCode(id);
        if (test) {
            return {
                identifierType: 'mvdTestCode',
                test: localizeOne(test, locale)
            };
        }
        return null;
    }

    return null;
}

/**
 * Search tests across multiple fields.
 * @param {Object} params - Search parameters
 * @param {string} [params.locale] - BCP 47 locale tag
 * @returns {Object}
 */
function searchTests(params) {
    const { locale, ...searchParams } = params || {};
    const results = localizeTests(dataAccess.searchTests(searchParams), locale);
    return {
        query: searchParams,
        total: results.length,
        results
    };
}

/**
 * Validate a specimen source for a given LOINC.
 * @param {string} loincCode
 * @param {string} specimenSource
 * @returns {Object}
 */
function validateSpecimen(loincCode, specimenSource) {
    return validateSpecimenSource(loincCode, specimenSource);
}

/**
 * Export the full compendium in the requested format.
 * @param {string} [format='json'] - 'json' or 'csv'
 * @param {string} [locale] - BCP 47 locale tag
 * @returns {{ contentType: string, data: string }}
 */
function exportCompendium(format = 'json', locale) {
    const tests = localizeTests(dataAccess.getAllTests(), locale);
    const version = dataAccess.getVersion();

    if (format === 'csv') {
        return {
            contentType: 'text/csv',
            filename: `mvd-compendium-${version.version}.csv`,
            data: generateCsv(tests)
        };
    }

    // Default: full JSON
    return {
        contentType: 'application/json',
        filename: `mvd-compendium-${version.version}.json`,
        data: JSON.stringify({
            version: version.version,
            lastUpdated: version.lastUpdated,
            generatedFrom: version.generatedFrom,
            performingOrganization: version.performingOrganization,
            locale: locale || 'en-US',
            tests
        }, null, 2)
    };
}

/**
 * Get compendium version metadata including supported locales.
 * @returns {Object}
 */
function getVersion() {
    return {
        ...dataAccess.getVersion(),
        supportedLocales: SUPPORTED_LOCALES,
        defaultLocale: 'en-US'
    };
}

/**
 * Generate CSV from tests (flattened to 42 orderable LOINCs).
 */
function generateCsv(tests) {
    const headers = [
        'MVD Test Code', 'Market', 'Species', 'Test Name', 'Category', 'Methodology', 'Organism',
        'Order LOINC', 'Short Name', 'Sample Type', 'TAT',
        'CPT Codes', 'Reference Range', 'Result Units',
        'Result LOINCs', 'Result Names',
        'Acceptable Sources',
        'Test Status', 'LOINC Status', 'Effective Status',
        'Created On', 'Created By', 'Updated On', 'Updated By'
    ];

    const rows = [headers.join(',')];

    for (const test of tests) {
        for (const ol of test.orderableLoincs) {
            const cptStr = test.cptCodes.map(c =>
                c.quantity > 1 ? `${c.code}x${c.quantity}` : c.code
            ).join('; ');

            const resultLoincs = ol.resultComponents.map(r => r.resultLoincCode).join('; ');
            const resultNames = ol.resultComponents.map(r => r.resultLoincName).join('; ');
            const sources = ol.acceptableSources.join('; ');

            const row = [
                test.mvdTestCode,
                test.market || 'Human',
                test.species || 'Human',
                csvEscape(test.testName),
                test.category,
                test.methodology,
                csvEscape(test.organism),
                ol.orderLoincCode,
                csvEscape(ol.shortName),
                csvEscape(ol.sampleType),
                csvEscape(test.tat),
                cptStr,
                csvEscape(ol.referenceRange),
                csvEscape(ol.resultUnits),
                resultLoincs,
                csvEscape(resultNames),
                csvEscape(sources),
                test.status || 'Active',
                ol.status || 'Active',
                getEffectiveStatus(test, ol),
                ol.createdOn || '',
                ol.createdBy || '',
                ol.updatedOn || '',
                ol.updatedBy || ''
            ];
            rows.push(row.join(','));
        }
    }

    return rows.join('\n');
}

function csvEscape(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

module.exports = {
    getAllTests,
    getTestByIdentifier,
    searchTests,
    validateSpecimen,
    exportCompendium,
    getVersion
};

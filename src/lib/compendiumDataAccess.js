/**
 * Compendium Data Access Layer
 *
 * Loads the compendium JSON, builds lookup indexes for O(1) access,
 * and provides search/filter capabilities.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

let cachedCompendium = null;
let mvdCodeIndex = null;   // Map<string, CompendiumTest>
let loincIndex = null;     // Map<string, { test: CompendiumTest, orderable: OrderableLoinc }>

/**
 * Load and cache the compendium data, building lookup indexes.
 * @param {string} [dataPath] - Override path to compendium JSON
 * @returns {Object} The full compendium envelope
 */
function loadCompendium(dataPath) {
    const filePath = dataPath || process.env.COMPENDIUM_DATA_PATH || DEFAULT_DATA_PATH;

    if (cachedCompendium && cachedCompendium._loadedFrom === filePath) {
        return cachedCompendium;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const compendium = JSON.parse(raw);
    compendium._loadedFrom = filePath;

    // Build indexes
    mvdCodeIndex = new Map();
    loincIndex = new Map();

    for (const test of compendium.tests) {
        mvdCodeIndex.set(test.mvdTestCode, test);

        for (const orderable of test.orderableLoincs) {
            loincIndex.set(orderable.orderLoincCode, { test, orderable });
        }
    }

    cachedCompendium = compendium;
    return compendium;
}

/**
 * Get a test by MVD test code. O(1) lookup.
 * @param {string} code - MVD test code (e.g., "310")
 * @returns {Object|null} CompendiumTest or null
 */
function getTestByMvdCode(code) {
    ensureLoaded();
    return mvdCodeIndex.get(String(code)) || null;
}

/**
 * Get a test and its specific orderable by LOINC code. O(1) lookup.
 * @param {string} loinc - LOINC code (e.g., "48952-6")
 * @returns {{ test: Object, orderable: Object }|null}
 */
function getTestByLoincCode(loinc) {
    ensureLoaded();
    return loincIndex.get(String(loinc)) || null;
}

/**
 * Search tests with multi-field filtering.
 * @param {Object} params
 * @param {string} [params.query] - Free text search across names, LOINCs, CPT codes
 * @param {string} [params.category] - Filter by category (Antigen, Antibody, PCR)
 * @param {string} [params.organism] - Filter by organism name (partial match)
 * @param {string} [params.sampleType] - Filter by sample type (partial match)
 * @param {string} [params.cptCode] - Filter by CPT code
 * @param {string} [params.status] - Filter by test-level status (Active, New, Disabled)
 * @param {string} [params.market] - Filter by market (Human, Veterinary)
 * @returns {Object[]} Matching CompendiumTest objects
 */
function searchTests({ query, category, organism, sampleType, cptCode, status, market } = {}) {
    ensureLoaded();
    let results = [...cachedCompendium.tests];

    if (status) {
        const st = status.toLowerCase();
        results = results.filter(t => (t.status || 'Active').toLowerCase() === st);
    }

    if (market) {
        const mk = market.toLowerCase();
        results = results.filter(t => (t.market || 'Human').toLowerCase() === mk);
    }

    if (category) {
        const cat = category.toLowerCase();
        results = results.filter(t => t.category.toLowerCase() === cat);
    }

    if (organism) {
        const org = organism.toLowerCase();
        results = results.filter(t => t.organism.toLowerCase().includes(org));
    }

    if (cptCode) {
        const cpt = String(cptCode);
        results = results.filter(t =>
            t.cptCodes.some(c => c.code === cpt)
        );
    }

    if (sampleType) {
        const st = sampleType.toLowerCase();
        results = results.filter(t =>
            t.orderableLoincs.some(ol => ol.sampleType.toLowerCase().includes(st))
        );
    }

    if (query) {
        const q = query.toLowerCase();
        results = results.filter(t => {
            // Search test-level fields
            if (t.testName.toLowerCase().includes(q)) return true;
            if (t.shortName.toLowerCase().includes(q)) return true;
            if (t.mvdTestCode.toLowerCase().includes(q)) return true;
            if (t.organism.toLowerCase().includes(q)) return true;

            // Search orderable LOINCs
            for (const ol of t.orderableLoincs) {
                if (ol.orderLoincCode.includes(q)) return true;
                if (ol.shortName.toLowerCase().includes(q)) return true;
            }

            // Search CPT codes
            for (const c of t.cptCodes) {
                if (c.code.includes(q)) return true;
            }

            return false;
        });
    }

    return results;
}

/**
 * Get compendium version/metadata only.
 * @returns {{ version: string, lastUpdated: string, generatedFrom: string, summary: Object }}
 */
function getVersion() {
    ensureLoaded();
    return {
        version: cachedCompendium.version,
        lastUpdated: cachedCompendium.lastUpdated,
        generatedFrom: cachedCompendium.generatedFrom,
        summary: cachedCompendium.summary,
        performingOrganization: cachedCompendium.performingOrganization
    };
}

/**
 * Get all tests (raw array).
 * @returns {Object[]}
 */
function getAllTests() {
    ensureLoaded();
    return cachedCompendium.tests;
}

/**
 * Get specimen source rules.
 * @returns {Object}
 */
function getSpecimenSourceRules() {
    ensureLoaded();
    return cachedCompendium.specimenSourceRules;
}

/**
 * Clear the cache (useful for testing or reloading).
 */
function clearCache() {
    cachedCompendium = null;
    mvdCodeIndex = null;
    loincIndex = null;
}

function ensureLoaded() {
    if (!cachedCompendium) {
        loadCompendium();
    }
}

module.exports = {
    loadCompendium,
    getTestByMvdCode,
    getTestByLoincCode,
    searchTests,
    getVersion,
    getAllTests,
    getSpecimenSourceRules,
    clearCache
};

/**
 * Compendium Data Access Layer
 *
 * Loads the compendium JSON, builds lookup indexes for O(1) access,
 * and provides search/filter capabilities.
 *
 * Two loading paths:
 *   1. Azure Blob Storage (production) — triggered when COMPENDIUM_BLOB_CONNECTION_STRING is set.
 *      Uses a 30-minute TTL cache; call `await loadCompendium()` at the start of each
 *      Azure Function handler to ensure fresh data, then use the synchronous getters.
 *   2. Local JSON file (dev/test) — synchronous read, cached indefinitely until path changes.
 *      Falls through to this path when COMPENDIUM_BLOB_CONNECTION_STRING is not set.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

let cachedCompendium = null;
let mvdCodeIndex = null;   // Map<string, CompendiumTest>
let loincIndex = null;     // Map<string, { test: CompendiumTest, orderable: OrderableLoinc }>

// ============================================================================
// Private helpers
// ============================================================================

/**
 * Read a Node.js Readable stream to a UTF-8 string.
 * @param {import('stream').Readable} readable
 * @returns {Promise<string>}
 */
async function streamToString(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Download the live compendium JSON from Azure Blob Storage.
 * @returns {Promise<string>} Raw JSON string
 */
async function loadFromBlob() {
    const { BlobServiceClient } = require('@azure/storage-blob');
    const connStr = process.env.COMPENDIUM_BLOB_CONNECTION_STRING;
    const container = process.env.COMPENDIUM_BLOB_CONTAINER || 'compendium';
    const blobName = 'mvd-compendium-live.json';

    const client = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse = await blobClient.download();
    return await streamToString(downloadResponse.readableStreamBody);
}

/**
 * Build the in-memory indexes from a parsed compendium envelope.
 * Stamps `_loadedAt` on the object and populates module-level index Maps.
 * @param {Object} envelope - Parsed compendium JSON object
 * @returns {Object} The same envelope object (mutated with `_loadedAt`)
 */
function buildCache(envelope) {
    mvdCodeIndex = new Map();
    loincIndex = new Map();

    for (const test of envelope.tests) {
        mvdCodeIndex.set(test.mvdTestCode, test);

        for (const orderable of test.orderableLoincs) {
            loincIndex.set(orderable.orderLoincCode, { test, orderable });
        }
    }

    envelope._loadedAt = Date.now();
    cachedCompendium = envelope;
    return envelope;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load and cache the compendium data, building lookup indexes.
 *
 * When COMPENDIUM_BLOB_CONNECTION_STRING is set, data is loaded from Azure
 * Blob Storage with a 30-minute TTL cache.  Otherwise, falls back to a local
 * JSON file (dev/test path), which is cached indefinitely until the path changes.
 *
 * Always `await` this at the start of Azure Function handlers so the
 * synchronous getters below work on fresh data.
 *
 * @param {string} [dataPath] - Override path to compendium JSON (local path only)
 * @returns {Promise<Object>} The full compendium envelope
 */
async function loadCompendium(dataPath) {
    // ── Blob Storage path (production) ──────────────────────────────────────
    if (process.env.COMPENDIUM_BLOB_CONNECTION_STRING) {
        const TTL_MS = 30 * 60 * 1000; // 30 minutes
        if (cachedCompendium && (Date.now() - cachedCompendium._loadedAt < TTL_MS)) {
            return cachedCompendium;
        }
        const blobData = await loadFromBlob();
        const envelope = JSON.parse(blobData);
        return buildCache(envelope);
    }

    // ── Local file path (dev / test fallback) ───────────────────────────────
    const filePath = dataPath || process.env.COMPENDIUM_DATA_PATH || DEFAULT_DATA_PATH;

    if (cachedCompendium && cachedCompendium._loadedFrom === filePath) {
        return cachedCompendium;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const envelope = JSON.parse(raw);
    envelope._loadedFrom = filePath;
    return buildCache(envelope);
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
 * Clear the cache entirely (useful for testing or full reload).
 * In-flight requests will see a null cache and trigger a fresh load on next call.
 */
function clearCache() {
    cachedCompendium = null;
    mvdCodeIndex = null;
    loincIndex = null;
}

/**
 * Invalidate the TTL so the next `loadCompendium()` call fetches fresh data
 * from Blob Storage, without nulling the cache for in-flight requests.
 *
 * Used by the sync function after successfully publishing a new compendium
 * to Blob Storage, so the API serves fresh data on the very next request.
 *
 * No-op if the cache has not been populated yet.
 */
function invalidateCache() {
    if (cachedCompendium) {
        cachedCompendium._loadedAt = 0;
    }
}

function ensureLoaded() {
    if (!cachedCompendium) {
        // For the local-file dev path, perform a synchronous load.
        // In production (Blob path), callers are expected to `await loadCompendium()`
        // at the start of each Azure Function handler before calling getters.
        const filePath = process.env.COMPENDIUM_DATA_PATH || DEFAULT_DATA_PATH;
        const raw = fs.readFileSync(filePath, 'utf-8');
        const envelope = JSON.parse(raw);
        envelope._loadedFrom = filePath;
        buildCache(envelope);
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
    clearCache,
    invalidateCache
};

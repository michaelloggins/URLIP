/**
 * Compendium Sync — Timer-Triggered Azure Function
 *
 * Runs every 30 minutes (configurable via COMPENDIUM_SYNC_SCHEDULE ncrontab),
 * extracts the MVD compendium from StarLIMS, transforms it into the
 * CompendiumEnvelope schema, and publishes it to Azure Blob Storage.
 *
 * Flow:
 *   1. Read last-sync timestamp from sync-state.json in Blob Storage.
 *   2. Query StarLIMS for changed TEST_IDs since lastSync.
 *   3. If no changes, exit.
 *   4. Otherwise fetch the full compendium (bulk queries in parallel).
 *   5. Transform → compare with current live blob → diff.
 *   6. Write the new live blob + a timestamped changelog entry.
 *   7. Persist the new lastSync timestamp.
 *   8. Call invalidateCache() so the API serves fresh data on next request.
 *
 * Design notes:
 *   - Full rebuild on any change is safer and simpler than incremental merge;
 *     the compendium payload is small (~50 MB uncompressed at worst).
 *   - No retry logic here — Azure Functions timer trigger handles retry at
 *     the invocation level. A thrown error marks the invocation as failed
 *     so it appears in Application Insights.
 *   - Connection string parser only supports the `Server=...;Database=...;
 *     Integrated Security=true;TrustServerCertificate=true;` format we
 *     actually use.
 */

'use strict';

const { app } = require('@azure/functions');

const {
    GET_ALL_TESTS_INCLUDING_INACTIVE,
    GET_ALL_SPECIMENS,
    GET_ALL_LOINCS,
    GET_ALL_CPTS,
    GET_ALL_COMPONENTS,
    GET_ALL_PANELS,
    GET_CHANGED_ANY_STATUS
} = require('../lib/starlimsQueries');
const { transformToCompendium } = require('../lib/starlimsTransformer');
const { invalidateCache } = require('../lib/compendiumDataAccess');

// Blob configuration
const LIVE_BLOB_NAME = 'mvd-compendium-live.json';
const SYNC_STATE_BLOB_NAME = 'sync-state.json';
const DEFAULT_CONTAINER = 'compendium';
const VERSIONS_PREFIX = 'versions/';

// ---------------------------------------------------------------------------
// Version bumping
// ---------------------------------------------------------------------------
/**
 * Produce the next envelope version. Uses a simple major.minor.patch scheme
 * where the minor segment is incremented on every change-producing sync
 * (patch is reset to 0). Non-numeric or absent inputs default to 3.0.0 →
 * 3.1.0 on first bump, preserving compatibility with the seed envelope.
 *
 * @param {string|null|undefined} currentVersion
 * @returns {string}
 */
function nextVersion(currentVersion) {
    const [rawMajor, rawMinor] = String(currentVersion || '3.0.0').split('.');
    const major = Number.isFinite(Number(rawMajor)) ? Number(rawMajor) : 3;
    const minor = Number.isFinite(Number(rawMinor)) ? Number(rawMinor) : 0;
    return `${major}.${minor + 1}.0`;
}

// ===========================================================================
// Connection string parser — minimal, purpose-built for:
//   Server=host;Database=db;Integrated Security=true;TrustServerCertificate=true;Encrypt=true
// ===========================================================================
/**
 * Parse a StarLIMS ODBC connection string into an mssql config.
 * Supports only the keys we actually use (Server, Database,
 * Integrated Security, TrustServerCertificate, Encrypt).
 *
 * @param {string} connStr
 * @returns {import('mssql').config}
 */
function parseConnectionString(connStr) {
    const pairs = {};
    for (const segment of String(connStr || '').split(';')) {
        const trimmed = segment.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        pairs[trimmed.slice(0, eqIdx).trim().toLowerCase()] = trimmed.slice(eqIdx + 1).trim();
    }

    const server = pairs['server'] || pairs['data source'] || '';
    const database = pairs['database'] || pairs['initial catalog'] || '';

    const isTruthy = (v) => {
        const s = String(v || '').toLowerCase();
        return s === 'true' || s === 'yes' || s === 'sspi';
    };
    const isFalsy = (v) => {
        const s = String(v || '').toLowerCase();
        return s === 'false' || s === 'no';
    };

    const trustedConnection = isTruthy(pairs['integrated security']);
    const trustServerCertificate = isTruthy(pairs['trustservercertificate']);
    // Encrypt defaults to true unless explicitly false.
    const encrypt = !isFalsy(pairs['encrypt']);

    return {
        server,
        database,
        options: {
            trustedConnection,
            trustServerCertificate,
            encrypt
        },
        connectionTimeout: 30000,
        requestTimeout: 120000
    };
}

// ===========================================================================
// StarLIMS helpers
// ===========================================================================
/**
 * Open a new mssql connection pool using STARLIMS_CONNECTION_STRING.
 * Caller is responsible for `pool.close()`.
 * @returns {Promise<import('mssql').ConnectionPool>}
 */
async function openStarlimsPool() {
    const mssql = require('mssql');
    const config = parseConnectionString(process.env.STARLIMS_CONNECTION_STRING);
    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    return pool;
}

/**
 * Return the TEST_IDs changed since the given timestamp.
 * @param {string|Date} lastSync - ISO 8601 string or Date
 * @returns {Promise<Array<number|string>>}
 */
async function queryChangedTestIds(lastSync) {
    const mssql = require('mssql');
    const pool = await openStarlimsPool();
    try {
        const sinceDate = lastSync instanceof Date ? lastSync : new Date(lastSync);
        // GET_CHANGED_ANY_STATUS does not filter by STATUS so that Active→Inactive
        // transitions are detected (the STATUS change itself bumps MODIFIED_DATE
        // but a status-filtered query would miss the row).
        const result = await pool.request()
            .input('since', mssql.DateTime, sinceDate)
            .query(GET_CHANGED_ANY_STATUS);
        return (result.recordset || []).map(r => r.TEST_ID);
    } finally {
        await pool.close();
    }
}

/**
 * Execute all six bulk compendium queries in parallel and return the
 * shape expected by transformToCompendium().
 * @returns {Promise<{tests:Array, specimens:Array, loincs:Array, cpts:Array, components:Array, panels:Array}>}
 */
async function fetchAllCompendiumData() {
    const pool = await openStarlimsPool();
    try {
        const [tests, specimens, loincs, cpts, components, panels] = await Promise.all([
            // Fetch ALL tests (active + inactive) so the transformer can retain
            // inactive tests in the compendium for audit-trail purposes.
            pool.request().query(GET_ALL_TESTS_INCLUDING_INACTIVE),
            pool.request().query(GET_ALL_SPECIMENS),
            pool.request().query(GET_ALL_LOINCS),
            pool.request().query(GET_ALL_CPTS),
            pool.request().query(GET_ALL_COMPONENTS),
            pool.request().query(GET_ALL_PANELS)
        ]);
        return {
            tests: tests.recordset || [],
            specimens: specimens.recordset || [],
            loincs: loincs.recordset || [],
            cpts: cpts.recordset || [],
            components: components.recordset || [],
            panels: panels.recordset || []
        };
    } finally {
        await pool.close();
    }
}

// ===========================================================================
// Blob Storage helpers
// ===========================================================================
/**
 * Get the BlockBlobClient for a blob in the configured container.
 * Creates the container if it does not exist.
 * @param {string} blobName
 * @returns {Promise<import('@azure/storage-blob').BlockBlobClient>}
 */
async function getBlockBlobClient(blobName) {
    const { BlobServiceClient } = require('@azure/storage-blob');
    const connStr = process.env.COMPENDIUM_BLOB_CONNECTION_STRING;
    const container = process.env.COMPENDIUM_BLOB_CONTAINER || DEFAULT_CONTAINER;
    const svc = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = svc.getContainerClient(container);
    await containerClient.createIfNotExists();
    return containerClient.getBlockBlobClient(blobName);
}

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
 * Load the current live compendium from Blob Storage.
 * Returns null if the blob does not exist (first run).
 * @returns {Promise<Object|null>}
 */
async function loadCurrentFromBlob() {
    const blobClient = await getBlockBlobClient(LIVE_BLOB_NAME);
    try {
        const download = await blobClient.download();
        const body = await streamToString(download.readableStreamBody);
        return JSON.parse(body);
    } catch (err) {
        if (err && (err.statusCode === 404 || err.code === 'BlobNotFound')) {
            return null;
        }
        throw err;
    }
}

/**
 * Write a string to a blob in the configured container with
 * Content-Type: application/json.
 * @param {string} blobName
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeToBlob(blobName, content) {
    const blobClient = await getBlockBlobClient(blobName);
    const buf = Buffer.from(content, 'utf-8');
    await blobClient.upload(buf, buf.byteLength, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
    });
}

// ===========================================================================
// Sync-state persistence (sync-state.json in Blob Storage)
// ===========================================================================
/**
 * Return the last-sync timestamp as an ISO 8601 string. Defaults to 24 hours
 * ago if sync-state.json does not exist.
 * @returns {Promise<string>}
 */
async function getLastSyncTimestamp() {
    const blobClient = await getBlockBlobClient(SYNC_STATE_BLOB_NAME);
    try {
        const download = await blobClient.download();
        const body = await streamToString(download.readableStreamBody);
        const parsed = JSON.parse(body);
        if (parsed && parsed.lastSync) return parsed.lastSync;
    } catch (err) {
        if (!(err && (err.statusCode === 404 || err.code === 'BlobNotFound'))) {
            throw err;
        }
    }
    // Fallback: 24 hours ago
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Persist the new last-sync timestamp to sync-state.json.
 * @param {string} ts - ISO 8601
 * @returns {Promise<void>}
 */
async function updateLastSyncTimestamp(ts) {
    await writeToBlob(SYNC_STATE_BLOB_NAME, JSON.stringify({ lastSync: ts }, null, 2));
}

// ===========================================================================
// Diff
// ===========================================================================
/**
 * Compute the diff between two CompendiumEnvelopes at the test level.
 *
 *   - added:    mvdTestCodes present in `updated` but not in `current`
 *   - removed:  mvdTestCodes present in `current` but not in `updated`
 *   - modified: mvdTestCodes present in both but with different JSON content
 *
 * `current` may be null (first run) → all tests in updated are "added".
 *
 * @param {Object|null} current
 * @param {Object}      updated
 * @returns {{ hasChanges:boolean, added:string[], removed:string[], modified:string[] }}
 */
function computeDiff(current, updated) {
    const added = [];
    const removed = [];
    const modified = [];

    const currentTests = current && Array.isArray(current.tests) ? current.tests : [];
    const updatedTests = updated && Array.isArray(updated.tests) ? updated.tests : [];

    const currentByCode = new Map();
    for (const t of currentTests) {
        if (t && t.mvdTestCode) currentByCode.set(t.mvdTestCode, t);
    }
    const updatedByCode = new Map();
    for (const t of updatedTests) {
        if (t && t.mvdTestCode) updatedByCode.set(t.mvdTestCode, t);
    }

    for (const [code, updTest] of updatedByCode) {
        if (!currentByCode.has(code)) {
            added.push(code);
        } else if (JSON.stringify(currentByCode.get(code)) !== JSON.stringify(updTest)) {
            modified.push(code);
        }
    }
    for (const code of currentByCode.keys()) {
        if (!updatedByCode.has(code)) removed.push(code);
    }

    return {
        hasChanges: added.length + removed.length + modified.length > 0,
        added,
        removed,
        modified
    };
}

// ===========================================================================
// Main handler
// ===========================================================================
/**
 * Timer-trigger handler for the compendium sync.
 * @param {import('@azure/functions').Timer} myTimer
 * @param {import('@azure/functions').InvocationContext} context
 */
async function compendiumSyncHandler(myTimer, context) {
    const log = context.log ? context.log.bind(context) : () => {};
    const logInfo = (msg) => {
        if (context.log && typeof context.log.info === 'function') context.log.info(msg);
        else log(msg);
    };
    const logWarn = (msg) => {
        if (context.log && typeof context.log.warn === 'function') context.log.warn(msg);
        else log(msg);
    };
    const logError = (msg) => {
        if (typeof context.error === 'function') context.error(msg);
        else log(msg);
    };

    // Guard: required configuration
    if (!process.env.STARLIMS_CONNECTION_STRING) {
        logWarn('STARLIMS_CONNECTION_STRING not configured — skipping compendium sync');
        return;
    }
    if (!process.env.COMPENDIUM_BLOB_CONNECTION_STRING) {
        logWarn('COMPENDIUM_BLOB_CONNECTION_STRING not configured — skipping compendium sync');
        return;
    }

    const startTime = Date.now();
    logInfo('Compendium sync started');

    try {
        // 1. Determine last-sync timestamp
        const lastSync = await getLastSyncTimestamp();

        // 2. Change detection
        const changedIds = await queryChangedTestIds(lastSync);
        logInfo(`Changed test IDs since ${lastSync}: ${changedIds.length}`);
        if (changedIds.length === 0) {
            logInfo('No changes detected — sync complete');
            return;
        }

        // 3. Bulk fetch (full rebuild — includes inactive tests)
        const rawData = await fetchAllCompendiumData();

        // 4. Load current live blob — needed BEFORE transform so the transformer
        //    can carry forward enabledOn/disabledOn and detect Active↔Inactive
        //    transitions against the prior envelope.
        const currentCompendium = await loadCurrentFromBlob();

        // 5. Transform with version bump + previousCompendium for transition detection
        const newCompendium = transformToCompendium({
            ...rawData,
            version: nextVersion(currentCompendium && currentCompendium.version),
            previousCompendium: currentCompendium
        });

        // 6. Diff against current live blob
        const diff = computeDiff(currentCompendium, newCompendium);

        if (!diff.hasChanges) {
            logInfo('Transform produced identical compendium — no write needed');
            await updateLastSyncTimestamp(new Date().toISOString());
            return;
        }

        // 7. Publish new compendium to the live blob (read path)
        await writeToBlob(LIVE_BLOB_NAME, JSON.stringify(newCompendium, null, 2));

        // 8. Write an immutable versioned snapshot for audit / dispute traceability.
        //    Every order must be resolvable back to the exact compendium in effect
        //    when it was placed — versioned snapshots provide that evidence.
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const versionedBlobName = `${VERSIONS_PREFIX}${newCompendium.version}-${stamp}.json`;
        await writeToBlob(versionedBlobName, JSON.stringify(newCompendium, null, 2));

        // 9. Write changelog entry (references the versioned snapshot for disputes)
        const changelogName = `changelogs/${stamp}.json`;
        await writeToBlob(
            changelogName,
            JSON.stringify(
                {
                    syncedAt: new Date().toISOString(),
                    version: newCompendium.version,
                    versionedBlobName,
                    added: diff.added,
                    removed: diff.removed,
                    modified: diff.modified,
                    counts: {
                        added: diff.added.length,
                        removed: diff.removed.length,
                        modified: diff.modified.length
                    }
                },
                null,
                2
            )
        );

        // 10. Persist new sync timestamp
        await updateLastSyncTimestamp(new Date().toISOString());

        // 11. Invalidate API cache
        await invalidateCache();

        logInfo(
            `Sync complete in ${Date.now() - startTime}ms: ` +
            `+${diff.added.length} added, ~${diff.modified.length} modified, -${diff.removed.length} removed`
        );
    } catch (err) {
        logError(`Compendium sync failed: ${err && err.message ? err.message : err}`);
        // Rethrow so Azure Functions marks this invocation as failed (triggers alerts / retry semantics).
        throw err;
    }
}

// ===========================================================================
// Azure Function registration (Azure Functions v4 style)
// ===========================================================================
app.timer('compendiumSync', {
    schedule: process.env.COMPENDIUM_SYNC_SCHEDULE || '0 */30 * * * *',
    handler: compendiumSyncHandler
});

module.exports = {
    compendiumSyncHandler,
    computeDiff,
    nextVersion
};

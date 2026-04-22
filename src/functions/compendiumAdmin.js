/**
 * Compendium Admin Endpoints
 *
 * Three HTTP endpoints for manual sync control, sync status inspection, and
 * compendium version enumeration:
 *
 *   POST /api/compendium/sync         — Manually trigger a compendium sync
 *                                       (requires function key)
 *   GET  /api/compendium/sync/status  — Return last-sync timestamp, config
 *                                       status, and next scheduled sync time
 *   GET  /api/compendium/versions     — List available versioned snapshots
 *                                       (audit trail for disputes)
 *
 * The POST endpoint delegates entirely to compendiumSyncHandler from
 * compendiumSync.js — no logic duplication.
 *
 * The GET endpoints read from Blob Storage. When Blob Storage is not
 * configured they return 503 (versions) or lastSync: null (status).
 */

'use strict';

const { app } = require('@azure/functions');
const { compendiumSyncHandler } = require('./compendiumSync');

// Blob name mirrors the constant in compendiumSync.js
const SYNC_STATE_BLOB_NAME = 'sync-state.json';
const DEFAULT_CONTAINER = 'compendium';
const VERSIONS_PREFIX = 'versions/';

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Compute the ISO 8601 timestamp of the next 30-minute cron boundary
 * (i.e. the next :00 or :30 mark) from now.
 *
 * @returns {string} ISO 8601 string
 */
function nextHalfHourBoundary() {
    const now = new Date();
    const minutes = now.getMinutes();
    const secondsMs = now.getSeconds() * 1000 + now.getMilliseconds();
    // Minutes until the next 0 or 30 mark
    const minutesToNext = minutes < 30
        ? 30 - minutes
        : 60 - minutes;
    const msUntilNext = minutesToNext * 60 * 1000 - secondsMs;
    return new Date(now.getTime() + msUntilNext).toISOString();
}

/**
 * Read sync-state.json from Blob Storage and return the lastSync value,
 * or null if the blob does not exist or Blob Storage is not configured.
 *
 * @returns {Promise<string|null>}
 */
async function readLastSyncTimestamp() {
    const connStr = process.env.COMPENDIUM_BLOB_CONNECTION_STRING;
    if (!connStr) return null;

    try {
        const { BlobServiceClient } = require('@azure/storage-blob');
        const container = process.env.COMPENDIUM_BLOB_CONTAINER || DEFAULT_CONTAINER;
        const svc = BlobServiceClient.fromConnectionString(connStr);
        const containerClient = svc.getContainerClient(container);
        const blobClient = containerClient.getBlockBlobClient(SYNC_STATE_BLOB_NAME);

        const download = await blobClient.download();
        const chunks = [];
        for await (const chunk of download.readableStreamBody) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = Buffer.concat(chunks).toString('utf-8');
        const parsed = JSON.parse(body);
        return (parsed && parsed.lastSync) ? parsed.lastSync : null;
    } catch (err) {
        // Blob not found or container not found → return null (not an error condition)
        if (err && (err.statusCode === 404 || err.code === 'BlobNotFound' || err.code === 'ContainerNotFound')) {
            return null;
        }
        throw err;
    }
}

// ===========================================================================
// POST /api/compendium/sync — Manual trigger
// ===========================================================================
app.http('compendiumSyncManual', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'compendium/sync',
    handler: async (request, context) => {
        try {
            // Guard: both env vars must be present before attempting a sync
            const missingVars = [];
            if (!process.env.STARLIMS_CONNECTION_STRING) missingVars.push('STARLIMS_CONNECTION_STRING');
            if (!process.env.COMPENDIUM_BLOB_CONNECTION_STRING) missingVars.push('COMPENDIUM_BLOB_CONNECTION_STRING');

            if (missingVars.length > 0) {
                return {
                    status: 400,
                    jsonBody: {
                        triggered: false,
                        error: `Missing required environment variable(s): ${missingVars.join(', ')}. ` +
                               'Configure these before triggering a manual sync.'
                    }
                };
            }

            context.log('Manual compendium sync triggered via POST /api/compendium/sync');

            // Delegate to the timer handler with a minimal mock timer context
            await compendiumSyncHandler({ isPastDue: false }, context);

            return {
                status: 200,
                jsonBody: {
                    triggered: true,
                    message: 'Compendium sync completed successfully'
                }
            };
        } catch (err) {
            context.error('Manual compendium sync failed:', err);
            return {
                status: 500,
                jsonBody: {
                    triggered: false,
                    error: err && err.message ? err.message : String(err)
                }
            };
        }
    }
});

// ===========================================================================
// GET /api/compendium/versions — List versioned compendium snapshots
// ===========================================================================
/**
 * Parse a versioned blob name in the form
 *     versions/<version>-<stampWithDashes>.json
 * and return the version + ISO timestamp. Returns null if the shape does not
 * match so the caller can skip non-conforming entries.
 *
 * @param {string} blobName
 * @returns {{version:string, stamp:string}|null}
 */
function parseVersionedBlobName(blobName) {
    if (typeof blobName !== 'string') return null;
    if (!blobName.startsWith(VERSIONS_PREFIX)) return null;
    const rest = blobName.slice(VERSIONS_PREFIX.length);
    if (!rest.endsWith('.json')) return null;
    const base = rest.slice(0, -'.json'.length);
    // Version is the leading "X.Y.Z" semver-ish prefix; the rest is the stamp.
    const match = base.match(/^(\d+\.\d+\.\d+)-(.+)$/);
    if (!match) return null;
    return { version: match[1], stamp: match[2] };
}

app.http('compendiumVersions', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/versions',
    handler: async (request, context) => {
        try {
            const connStr = process.env.COMPENDIUM_BLOB_CONNECTION_STRING;
            if (!connStr) {
                return {
                    status: 503,
                    jsonBody: {
                        error: 'Blob Storage is not configured. Set COMPENDIUM_BLOB_CONNECTION_STRING to enable version listing.'
                    }
                };
            }

            const { BlobServiceClient } = require('@azure/storage-blob');
            const container = process.env.COMPENDIUM_BLOB_CONTAINER || DEFAULT_CONTAINER;
            const svc = BlobServiceClient.fromConnectionString(connStr);
            const containerClient = svc.getContainerClient(container);

            const versions = [];
            try {
                // listBlobsFlat iterates all blobs; we filter by prefix for efficiency.
                for await (const blob of containerClient.listBlobsFlat({ prefix: VERSIONS_PREFIX })) {
                    const parsed = parseVersionedBlobName(blob.name);
                    if (!parsed) continue;
                    const createdOn = blob.properties && blob.properties.createdOn
                        ? new Date(blob.properties.createdOn).toISOString()
                        : null;
                    versions.push({
                        version: parsed.version,
                        blobName: blob.name,
                        createdOn
                    });
                }
            } catch (err) {
                // Container may not exist yet (first-ever deploy) — return [].
                if (err && (err.statusCode === 404 || err.code === 'ContainerNotFound')) {
                    return { status: 200, jsonBody: { versions: [] } };
                }
                throw err;
            }

            // Sort newest-first by createdOn (falling back to blob name).
            versions.sort((a, b) => {
                const at = a.createdOn || '';
                const bt = b.createdOn || '';
                if (at !== bt) return bt.localeCompare(at);
                return b.blobName.localeCompare(a.blobName);
            });

            return { status: 200, jsonBody: { versions } };
        } catch (err) {
            context.error('Compendium versions listing error:', err);
            return {
                status: 500,
                jsonBody: {
                    error: err && err.message ? err.message : String(err)
                }
            };
        }
    }
});

// ===========================================================================
// GET /api/compendium/sync/status — Sync status
// ===========================================================================
app.http('compendiumSyncStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'compendium/sync/status',
    handler: async (request, context) => {
        try {
            context.log('Compendium sync status requested');

            const syncConfigured = !!(
                process.env.STARLIMS_CONNECTION_STRING &&
                process.env.COMPENDIUM_BLOB_CONNECTION_STRING
            );

            const lastSync = await readLastSyncTimestamp();
            const nextScheduledSync = nextHalfHourBoundary();

            return {
                status: 200,
                jsonBody: {
                    lastSync,
                    syncConfigured,
                    nextScheduledSync
                }
            };
        } catch (err) {
            context.error('Compendium sync status error:', err);
            return {
                status: 500,
                jsonBody: {
                    error: err && err.message ? err.message : String(err)
                }
            };
        }
    }
});

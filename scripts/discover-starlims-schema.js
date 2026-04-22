#!/usr/bin/env node
/**
 * StarLIMS Schema Discovery Script
 *
 * Connects to the StarLIMS SQL Server database and discovers tables/views
 * relevant to test compendium data (TEST, LOINC, CPT, SPECIMEN, ANALYTE,
 * PANEL, ASSAY, CATALOG, METHOD, RESULT, COMPONENT).
 *
 * Usage:
 *   node scripts/discover-starlims-schema.js
 *
 * Prerequisites:
 *   - STARLIMS_CONNECTION_STRING set in environment, .env, or local.settings.json
 *   - VPN connected to MiraVista network (miralan.loc domain accessible)
 *
 * Connection string format (ODBC-style):
 *   Server=vm-sql-dev-001.miralan.loc;Database=STARLIMS_DATA;Integrated Security=true;TrustServerCertificate=true;
 *
 * Outputs:
 *   - Human-readable mapping report to stdout
 *   - scripts/starlims-schema-discovery.json (full discovery output)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// ============================================================================
// Constants
// ============================================================================

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'starlims-schema-discovery.json');
const LOCAL_SETTINGS_PATH = path.join(PROJECT_ROOT, 'local.settings.json');
const DOTENV_PATH = path.join(PROJECT_ROOT, '.env');

/** Object name substrings to include (case-insensitive match). */
const RELEVANT_KEYWORDS = [
  'TEST',
  'LOINC',
  'CPT',
  'SPECIMEN',
  'ANALYTE',
  'PANEL',
  'ASSAY',
  'CATALOG',
  'METHOD',
  'RESULT',
  'COMPONENT',
];

const SAMPLE_ROW_COUNT = 3;

// ============================================================================
// Environment / Config Loading
// ============================================================================

/**
 * Reads a .env file and returns a key→value map.
 * Only handles simple KEY=VALUE lines (no multiline, no quotes stripping).
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseDotEnv(filePath) {
  const vars = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) vars[key] = value;
    }
  } catch {
    // File doesn't exist or isn't readable — silently skip
  }
  return vars;
}

/**
 * Reads local.settings.json and returns the Values section.
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseLocalSettings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && parsed.Values && typeof parsed.Values === 'object') {
      return parsed.Values;
    }
  } catch {
    // File doesn't exist or invalid JSON — silently skip
  }
  return {};
}

/**
 * Resolves the connection string from (in priority order):
 *   1. process.env.STARLIMS_CONNECTION_STRING
 *   2. .env file in project root
 *   3. local.settings.json Values.STARLIMS_CONNECTION_STRING
 *
 * Returns null if not found or if value is a placeholder (starts with '<').
 * @returns {string|null}
 */
function resolveConnectionString() {
  // 1. Process environment
  if (process.env.STARLIMS_CONNECTION_STRING) {
    const val = process.env.STARLIMS_CONNECTION_STRING.trim();
    if (val && !val.startsWith('<')) return val;
  }

  // 2. .env file
  const dotEnvVars = parseDotEnv(DOTENV_PATH);
  if (dotEnvVars.STARLIMS_CONNECTION_STRING) {
    const val = dotEnvVars.STARLIMS_CONNECTION_STRING.trim();
    if (val && !val.startsWith('<')) return val;
  }

  // 3. local.settings.json
  const localSettings = parseLocalSettings(LOCAL_SETTINGS_PATH);
  if (localSettings.STARLIMS_CONNECTION_STRING) {
    const val = localSettings.STARLIMS_CONNECTION_STRING.trim();
    if (val && !val.startsWith('<')) return val;
  }

  return null;
}

// ============================================================================
// Connection String Parser
// ============================================================================

/**
 * Parses an ODBC-style SQL Server connection string into an mssql config object.
 *
 * Handles keys: Server, Database, Integrated Security, TrustServerCertificate,
 * User Id/UID, Password/PWD, Port, Encrypt, Connection Timeout.
 *
 * @param {string} connStr  e.g. "Server=host\\instance;Database=DB;Integrated Security=true;"
 * @returns {import('mssql').config}
 */
function parseConnectionString(connStr) {
  /** @type {Record<string, string>} */
  const pairs = {};

  // Split on semicolons; handle escaped semicolons (;;) as literal
  const segments = connStr.split(/;(?!;)/);
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
    const value = trimmed.slice(eqIdx + 1).trim();
    pairs[key] = value;
  }

  // Extract server and optional instance name / port
  const serverRaw = pairs['server'] || pairs['data source'] || pairs['datasource'] || '';
  let server = serverRaw;
  let instanceName;
  let port;

  // Format: host\instance or host\instance,port or host,port
  const backslashIdx = serverRaw.indexOf('\\');
  const commaIdx = serverRaw.indexOf(',');

  if (backslashIdx !== -1) {
    server = serverRaw.slice(0, backslashIdx);
    const rest = serverRaw.slice(backslashIdx + 1);
    const commaInRest = rest.indexOf(',');
    if (commaInRest !== -1) {
      instanceName = rest.slice(0, commaInRest);
      port = parseInt(rest.slice(commaInRest + 1), 10) || undefined;
    } else {
      instanceName = rest;
    }
  } else if (commaIdx !== -1) {
    server = serverRaw.slice(0, commaIdx);
    port = parseInt(serverRaw.slice(commaIdx + 1), 10) || undefined;
  }

  const database = pairs['database'] || pairs['initial catalog'] || pairs['initialcatalog'] || '';

  // Authentication: Integrated Security (Windows auth) or SQL auth
  const integratedSecurityRaw = pairs['integrated security'] || pairs['integratedsecurity'] || '';
  const trustedConnection =
    integratedSecurityRaw.toLowerCase() === 'true' ||
    integratedSecurityRaw.toLowerCase() === 'yes' ||
    integratedSecurityRaw.toLowerCase() === 'sspi';

  const trustServerCertRaw =
    pairs['trustservercertificate'] || pairs['trust server certificate'] || '';
  const trustServerCertificate =
    trustServerCertRaw.toLowerCase() === 'true' || trustServerCertRaw.toLowerCase() === 'yes';

  const encryptRaw = pairs['encrypt'] || '';
  // Default encrypt to true unless explicitly false
  const encrypt =
    encryptRaw.toLowerCase() === 'false' || encryptRaw.toLowerCase() === 'no' ? false : true;

  const connectTimeoutRaw =
    pairs['connection timeout'] || pairs['connectiontimeout'] || pairs['connect timeout'] || '';
  const connectTimeout = connectTimeoutRaw ? parseInt(connectTimeoutRaw, 10) * 1000 : 30000;

  /** @type {import('mssql').config} */
  const config = {
    server,
    database,
    options: {
      trustedConnection,
      trustServerCertificate,
      encrypt,
    },
    connectionTimeout: connectTimeout,
    requestTimeout: 60000,
  };

  if (instanceName) {
    config.options.instanceName = instanceName;
  }

  if (port) {
    config.port = port;
  }

  // SQL auth credentials (when not using Windows auth)
  const user = pairs['user id'] || pairs['uid'] || pairs['user'] || '';
  const password = pairs['password'] || pairs['pwd'] || '';
  if (!trustedConnection && user) {
    config.user = user;
    config.password = password;
  }

  return config;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Returns all user table names from INFORMATION_SCHEMA.TABLES.
 * @param {import('mssql').ConnectionPool} pool
 * @returns {Promise<Array<{name: string, type: 'TABLE'}>>}
 */
async function queryTables(pool) {
  const result = await pool.request().query(`
    SELECT TABLE_NAME AS name
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
    ORDER BY TABLE_NAME
  `);
  return result.recordset.map((r) => ({ name: r.name, type: 'TABLE' }));
}

/**
 * Returns all view names from INFORMATION_SCHEMA.VIEWS.
 * @param {import('mssql').ConnectionPool} pool
 * @returns {Promise<Array<{name: string, type: 'VIEW'}>>}
 */
async function queryViews(pool) {
  const result = await pool.request().query(`
    SELECT TABLE_NAME AS name
    FROM INFORMATION_SCHEMA.VIEWS
    WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
    ORDER BY TABLE_NAME
  `);
  return result.recordset.map((r) => ({ name: r.name, type: 'VIEW' }));
}

/**
 * Returns column metadata for a given table or view.
 * @param {import('mssql').ConnectionPool} pool
 * @param {string} objectName
 * @returns {Promise<Array<{columnName: string, dataType: string, isNullable: string, maxLength: number|null}>>}
 */
async function queryColumns(pool, objectName) {
  const result = await pool
    .request()
    .input('tableName', sql.NVarChar(256), objectName)
    .query(`
      SELECT
        COLUMN_NAME     AS columnName,
        DATA_TYPE       AS dataType,
        IS_NULLABLE     AS isNullable,
        CHARACTER_MAXIMUM_LENGTH AS maxLength,
        NUMERIC_PRECISION AS numericPrecision,
        NUMERIC_SCALE   AS numericScale,
        ORDINAL_POSITION AS ordinalPosition
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `);
  return result.recordset;
}

/**
 * Returns up to SAMPLE_ROW_COUNT rows from a table/view.
 * Returns an empty array if the query fails (e.g. permission denied).
 * @param {import('mssql').ConnectionPool} pool
 * @param {string} objectName
 * @returns {Promise<object[]>}
 */
async function querySampleRows(pool, objectName) {
  try {
    // Use bracket-quoted identifier to handle reserved words / special chars
    const safeName = objectName.replace(/]/g, ']]');
    const result = await pool
      .request()
      .query(`SELECT TOP ${SAMPLE_ROW_COUNT} * FROM [${safeName}]`);
    return result.recordset || [];
  } catch (err) {
    // Non-fatal: permission issue or broken view
    return [];
  }
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Returns true if the object name contains any of the relevant keywords.
 * @param {string} name
 * @returns {boolean}
 */
function isRelevant(name) {
  const upper = name.toUpperCase();
  return RELEVANT_KEYWORDS.some((kw) => upper.includes(kw));
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Formats a data type string for human-readable display.
 * @param {{dataType: string, maxLength: number|null, numericPrecision: number|null, numericScale: number|null}} col
 * @returns {string}
 */
function formatDataType(col) {
  const dt = col.dataType.toUpperCase();
  if (['CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'BINARY', 'VARBINARY'].includes(dt)) {
    const len = col.maxLength === -1 ? 'MAX' : col.maxLength;
    return `${dt}(${len})`;
  }
  if (['DECIMAL', 'NUMERIC'].includes(dt) && col.numericPrecision != null) {
    return `${dt}(${col.numericPrecision},${col.numericScale ?? 0})`;
  }
  return dt;
}

/**
 * Prints the discovery report to stdout.
 * @param {DiscoveryResult[]} results
 * @param {SummaryStats} stats
 */
function printReport(results, stats) {
  const line = '='.repeat(72);
  const dash = '-'.repeat(72);

  console.log('\n' + line);
  console.log('  StarLIMS Schema Discovery Report');
  console.log(`  Generated: ${new Date().toISOString()}`);
  console.log(`  Database:  ${stats.database}`);
  console.log(`  Server:    ${stats.server}`);
  console.log(line);

  console.log(`\nSUMMARY`);
  console.log(dash);
  console.log(`  Total objects scanned : ${stats.totalScanned}`);
  console.log(`  Relevant matches      : ${stats.totalMatched}`);
  console.log(`    Tables              : ${stats.tablesMatched}`);
  console.log(`    Views               : ${stats.viewsMatched}`);
  console.log(`  Keywords filtered on  : ${RELEVANT_KEYWORDS.join(', ')}`);

  if (results.length === 0) {
    console.log('\n  No matching tables or views found.');
    return;
  }

  console.log('\n\nMATCHING OBJECTS');
  console.log(dash);

  for (const obj of results) {
    const typeLabel = obj.type === 'TABLE' ? '[TABLE]' : '[VIEW] ';
    console.log(`\n  ${typeLabel}  ${obj.name}`);
    console.log(`  ${'─'.repeat(obj.name.length + 11)}`);

    if (obj.columns.length === 0) {
      console.log('    (no columns found)');
    } else {
      // Find longest column name for alignment
      const maxNameLen = Math.max(...obj.columns.map((c) => c.columnName.length));
      for (const col of obj.columns) {
        const nullable = col.isNullable === 'YES' ? ' NULL' : ' NOT NULL';
        const typeStr = formatDataType(col);
        console.log(
          `    ${col.columnName.padEnd(maxNameLen + 2)} ${typeStr.padEnd(24)}${nullable}`
        );
      }
    }

    if (obj.sampleRows.length > 0) {
      console.log(`\n    Sample data (${obj.sampleRows.length} rows):`);
      const colNames = obj.columns.map((c) => c.columnName);
      for (let i = 0; i < obj.sampleRows.length; i++) {
        const row = obj.sampleRows[i];
        const pairs = colNames
          .map((cn) => {
            const val = row[cn];
            const display = val == null ? 'NULL' : String(val).slice(0, 60);
            return `${cn}=${display}`;
          })
          .join(' | ');
        console.log(`      [${i + 1}] ${pairs}`);
      }
    } else {
      console.log(`\n    Sample data: (none retrieved)`);
    }
  }

  console.log('\n' + line);
  console.log(`  Output written to: ${OUTPUT_FILE}`);
  console.log(line + '\n');
}

// ============================================================================
// Types (JSDoc)
// ============================================================================

/**
 * @typedef {{
 *   name: string,
 *   type: 'TABLE'|'VIEW',
 *   columns: Array<{columnName: string, dataType: string, isNullable: string, maxLength: number|null}>,
 *   sampleRows: object[]
 * }} DiscoveryResult
 *
 * @typedef {{
 *   database: string,
 *   server: string,
 *   totalScanned: number,
 *   totalMatched: number,
 *   tablesMatched: number,
 *   viewsMatched: number
 * }} SummaryStats
 */

// ============================================================================
// Main
// ============================================================================

async function main() {
  // ── 1. Resolve connection string ─────────────────────────────────────────
  const connStr = resolveConnectionString();

  if (!connStr) {
    console.error('\nERROR: STARLIMS_CONNECTION_STRING is not configured.\n');
    console.error('To run this script you must provide the connection string via one of:');
    console.error('');
    console.error('  Option A — Environment variable:');
    console.error(
      '    set STARLIMS_CONNECTION_STRING=Server=vm-sql-dev-001.miralan.loc;Database=STARLIMS_DATA;Integrated Security=true;TrustServerCertificate=true;'
    );
    console.error('');
    console.error('  Option B — .env file in project root:');
    console.error(
      '    STARLIMS_CONNECTION_STRING=Server=vm-sql-dev-001.miralan.loc;Database=STARLIMS_DATA;Integrated Security=true;TrustServerCertificate=true;'
    );
    console.error('');
    console.error('  Option C — local.settings.json (Values section):');
    console.error('    "STARLIMS_CONNECTION_STRING": "Server=vm-sql-dev-001.miralan.loc;Database=STARLIMS_DATA;Integrated Security=true;TrustServerCertificate=true;"');
    console.error('');
    console.error('NOTE: You must also be connected to the MiraVista VPN (miralan.loc).');
    process.exit(1);
  }

  // ── 2. Parse connection string ────────────────────────────────────────────
  let config;
  try {
    config = parseConnectionString(connStr);
  } catch (err) {
    console.error('\nERROR: Failed to parse STARLIMS_CONNECTION_STRING.');
    console.error(`  Detail: ${err.message}`);
    console.error('');
    console.error('Expected format:');
    console.error(
      '  Server=vm-sql-dev-001.miralan.loc;Database=STARLIMS_DATA;Integrated Security=true;TrustServerCertificate=true;'
    );
    process.exit(1);
  }

  if (!config.server) {
    console.error('\nERROR: Could not extract Server from STARLIMS_CONNECTION_STRING.');
    console.error('Make sure the string includes "Server=<hostname>".');
    process.exit(1);
  }

  console.log(`\nConnecting to ${config.server}/${config.database} ...`);
  if (config.options.trustedConnection) {
    console.log('  Auth: Windows Integrated Security');
  } else if (config.user) {
    console.log(`  Auth: SQL Server (user: ${config.user})`);
  }

  // ── 3. Connect ────────────────────────────────────────────────────────────
  let pool;
  try {
    pool = await sql.connect(config);
  } catch (err) {
    console.error('\nERROR: Could not connect to StarLIMS database.\n');

    // Provide actionable guidance rather than raw stack trace
    const msg = err.message || '';
    if (
      msg.includes('ENOTFOUND') ||
      msg.includes('getaddrinfo') ||
      msg.includes('EHOSTUNREACH') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('timeout')
    ) {
      console.error('The database server could not be reached. This typically means:');
      console.error('  1. You are NOT connected to the MiraVista VPN (miralan.loc)');
      console.error('  2. The server hostname is incorrect in the connection string');
      console.error('');
      console.error('Troubleshooting steps:');
      console.error('  - Connect to the MiraVista VPN before running this script');
      console.error('  - Verify server: ' + config.server);
      console.error('  - Ping the server: ping ' + config.server);
      console.error('  - Confirm port 1433 is open: Test-NetConnection ' + config.server + ' -Port 1433');
    } else if (msg.includes('Login failed') || msg.includes('ELOGIN')) {
      console.error('Authentication failed.');
      console.error('');
      console.error('Troubleshooting steps:');
      console.error('  - If using Integrated Security, run as a domain user with DB access');
      console.error('  - If using SQL auth, verify User Id and Password in connection string');
      console.error('  - Check that your account has SELECT permissions on STARLIMS_DATA');
    } else if (msg.includes('Cannot open database') || msg.includes('does not exist')) {
      console.error(`Database "${config.database}" not found on ${config.server}.`);
      console.error('');
      console.error('Troubleshooting steps:');
      console.error('  - Verify the database name in connection string');
      console.error('  - Confirm the database exists on ' + config.server);
    } else {
      console.error(`Detail: ${msg}`);
      console.error('');
      console.error('Common causes:');
      console.error('  - VPN not connected to miralan.loc network');
      console.error('  - SQL Server Browser service not running (named instances)');
      console.error('  - Firewall blocking port 1433');
    }

    console.error('');
    console.error('Connection config used:');
    console.error(`  Server:   ${config.server}${config.options.instanceName ? '\\' + config.options.instanceName : ''}`);
    console.error(`  Database: ${config.database}`);
    console.error(`  Port:     ${config.port || 1433}`);
    process.exit(1);
  }

  // ── 4. Discover schema ────────────────────────────────────────────────────
  let allObjects;
  try {
    console.log('Connected. Querying INFORMATION_SCHEMA...');
    const [tables, views] = await Promise.all([queryTables(pool), queryViews(pool)]);
    allObjects = [...tables, ...views];
    console.log(`  Found ${tables.length} tables and ${views.length} views`);
  } catch (err) {
    console.error('\nERROR: Failed to query INFORMATION_SCHEMA.');
    console.error(`  Detail: ${err.message}`);
    console.error('  Ensure your account has SELECT access to INFORMATION_SCHEMA.');
    await pool.close();
    process.exit(1);
  }

  // ── 5. Filter to relevant objects ─────────────────────────────────────────
  const relevantObjects = allObjects.filter((obj) => isRelevant(obj.name));
  console.log(`  Relevant matches: ${relevantObjects.length} (keywords: ${RELEVANT_KEYWORDS.join(', ')})`);

  // ── 6. Get columns and sample rows for each relevant object ───────────────
  /** @type {DiscoveryResult[]} */
  const results = [];

  for (const obj of relevantObjects) {
    process.stdout.write(`  Inspecting ${obj.type.toLowerCase()} [${obj.name}] ...`);
    try {
      const [columns, sampleRows] = await Promise.all([
        queryColumns(pool, obj.name),
        querySampleRows(pool, obj.name),
      ]);
      results.push({ ...obj, columns, sampleRows });
      process.stdout.write(` ${columns.length} columns, ${sampleRows.length} sample rows\n`);
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
      results.push({ ...obj, columns: [], sampleRows: [] });
    }
  }

  await pool.close();

  // ── 7. Build summary stats ────────────────────────────────────────────────
  /** @type {SummaryStats} */
  const stats = {
    database: config.database,
    server: config.server + (config.options.instanceName ? '\\' + config.options.instanceName : ''),
    totalScanned: allObjects.length,
    totalMatched: results.length,
    tablesMatched: results.filter((r) => r.type === 'TABLE').length,
    viewsMatched: results.filter((r) => r.type === 'VIEW').length,
  };

  // ── 8. Print human-readable report ───────────────────────────────────────
  printReport(results, stats);

  // ── 9. Write JSON output ──────────────────────────────────────────────────
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      server: stats.server,
      database: stats.database,
      keywords: RELEVANT_KEYWORDS,
      totalScanned: stats.totalScanned,
      totalMatched: stats.totalMatched,
    },
    objects: results.map((obj) => ({
      name: obj.name,
      type: obj.type,
      columnCount: obj.columns.length,
      columns: obj.columns,
      sampleRows: obj.sampleRows,
    })),
  };

  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Discovery JSON saved to: ${OUTPUT_FILE}\n`);
  } catch (err) {
    console.error(`\nWARNING: Could not write output file: ${err.message}`);
    console.error('The report was printed to stdout above.\n');
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────
main().catch((err) => {
  // Catch any unhandled errors and present cleanly
  console.error('\nUNEXPECTED ERROR:');
  console.error(`  ${err.message}`);
  if (process.env.DEBUG) {
    console.error(err.stack);
  } else {
    console.error('  Set DEBUG=1 for full stack trace.');
  }
  process.exit(1);
});

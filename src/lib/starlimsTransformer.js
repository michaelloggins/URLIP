/**
 * StarLIMS → Compendium Transformer
 *
 * Pure, dependency-free mapping from raw StarLIMS SQL result rows (as produced
 * by the queries in src/lib/starlimsQueries.js) into the CompendiumEnvelope
 * JSON schema already used by this project (see src/models/compendiumModels.js
 * and data/compendium/mvd-compendium-v2.0.0.json).
 *
 * Performance contract: O(n) total. No nested loops over the full arrays.
 * Every parent→child lookup is backed by a Map built in a single pass.
 *
 * Usage:
 *   const { transformToCompendium } = require('./starlimsTransformer');
 *   const envelope = transformToCompendium({ tests, specimens, loincs, cpts, components, panels });
 */

'use strict';

const { PERFORMING_ORGANIZATION } = require('../models/compendiumModels');

// ---------------------------------------------------------------------------
// Normalization lookup tables
// ---------------------------------------------------------------------------

const CATEGORY_MAP = {
    'AG': 'Antigen', 'ANTIGEN': 'Antigen',
    'AB': 'Antibody', 'ANTIBODY': 'Antibody',
    'PCR': 'PCR', 'MOLECULAR': 'PCR',
    'PANEL': 'Panel', 'GRP': 'Panel',
    'TDM': 'Therapeutic Drug Monitoring', 'DRUG': 'Therapeutic Drug Monitoring'
};

const METHODOLOGY_MAP = {
    'EIA': 'EIA', 'ELISA': 'EIA',
    'PCR': 'PCR', 'RT-PCR': 'PCR', 'QPCR': 'PCR',
    'LA': 'Latex Agglutination', 'LATEX': 'Latex Agglutination',
    'ID': 'Immunodiffusion', 'IMMUNODIFF': 'Immunodiffusion',
    'COLORIMETRIC': 'Colorimetric',
    'BIOASSAY': 'Bioassay'
};

const SPECIMEN_TYPE_MAP = {
    'SER': 'Serum', 'SERUM': 'Serum',
    'PLAS': 'Plasma', 'PLASMA': 'Plasma',
    'UR': 'Urine', 'URINE': 'Urine',
    'CSF': 'CSF', 'CERSP': 'CSF',
    'BAL': 'BAL', 'BRONCH': 'BAL',
    'BF': 'Body Fluid', 'BFLUID': 'Body Fluid'
};

const MARKET_MAP = {
    'H': 'Human', 'HUMAN': 'Human',
    'V': 'Veterinary', 'VET': 'Veterinary', 'VETERINARY': 'Veterinary'
};

const ACTIVE_STATUS_VALUES = new Set(['ACTIVE', 'A', '1', 'Y', 'YES', 'TRUE']);

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Uppercase-and-trim a value, returning '' for nullish.
 * @param {*} raw
 * @returns {string}
 */
function _upper(raw) {
    if (raw === null || raw === undefined) return '';
    return String(raw).trim().toUpperCase();
}

/**
 * Normalize a raw category string from StarLIMS.
 * Falls back to the original value (trimmed) if not in the lookup.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalizeCategory(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    const key = _upper(raw);
    return CATEGORY_MAP[key] || String(raw).trim();
}

/**
 * Normalize a raw methodology string from StarLIMS.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalizeMethodology(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    const key = _upper(raw);
    return METHODOLOGY_MAP[key] || String(raw).trim();
}

/**
 * Normalize a raw specimen type code/name from StarLIMS.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalizeSpecimenType(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    const key = _upper(raw);
    return SPECIMEN_TYPE_MAP[key] || String(raw).trim();
}

/**
 * Normalize a raw market value from StarLIMS to 'Human' | 'Veterinary'.
 * Defaults to 'Human' if not recognized.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalizeMarket(raw) {
    if (raw === null || raw === undefined || raw === '') return 'Human';
    const key = _upper(raw);
    return MARKET_MAP[key] || 'Human';
}

/**
 * Normalize a raw status value to 'Active' | 'Inactive'.
 * StarLIMS values like 'ACTIVE', 'A', '1', 'Y' → 'Active'. Anything else → 'Inactive'.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function normalizeStatus(raw) {
    if (raw === null || raw === undefined) return 'Inactive';
    const key = _upper(raw);
    return ACTIVE_STATUS_VALUES.has(key) ? 'Active' : 'Inactive';
}

/**
 * Parse a delimited acceptable-sources string from StarLIMS into a string array.
 * Handles semicolons, pipes, and newlines as delimiters.
 * Null/empty → []. A single value is wrapped in an array.
 * @param {string|string[]|null|undefined} raw
 * @returns {string[]}
 */
function parseAcceptableSourcesField(raw) {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
    const str = String(raw).trim();
    if (!str) return [];
    if (/[;|\r\n]/.test(str)) {
        return str
            .split(/[;|\r\n]+/)
            .map(s => s.trim())
            .filter(Boolean);
    }
    return [str];
}

/**
 * Convert a value (Date or string) into an ISO 8601 string, with fallback.
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
function toIsoOrFallback(value, fallback) {
    if (!value) return fallback;
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return fallback;
        return value.toISOString();
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString();
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

/**
 * Group an array of rows by a key produced by the getKey callback.
 * Returns a Map<key, row[]>.
 * @template T
 * @param {T[]} rows
 * @param {(row:T) => *} getKey
 * @returns {Map<*, T[]>}
 */
function groupBy(rows, getKey) {
    const map = new Map();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
        const key = getKey(row);
        if (key === null || key === undefined) continue;
        const existing = map.get(key);
        if (existing) {
            existing.push(row);
        } else {
            map.set(key, [row]);
        }
    }
    return map;
}

// ---------------------------------------------------------------------------
// Specimen source rules builder
// ---------------------------------------------------------------------------

/**
 * Build the specimenSourceRules object for the envelope. Matches the structure
 * of data/compendium/specimen-source-rules.json.
 *
 * The rules are derived from the acceptable sources strings in the specimens
 * array, collapsed into categorical buckets. Canonical rule text is fixed so
 * callers can rely on stable output even as source data changes.
 *
 * @param {Array} specimens - rows from GET_ALL_SPECIMENS
 * @returns {Object}
 */
function buildSpecimenSourceRules(specimens) {
    // Collect all acceptable sources seen, unique, preserving first-seen order.
    const allSources = new Set();
    if (Array.isArray(specimens)) {
        for (const s of specimens) {
            const parsed = parseAcceptableSourcesField(
                s.ACCEPTABLE_SOURCES !== undefined ? s.ACCEPTABLE_SOURCES : s.acceptableSources
            );
            for (const p of parsed) allSources.add(p);
        }
    }

    const sourcesArray = [...allSources];
    const has = (pattern) => sourcesArray.some(src => pattern.test(src));
    const filterSources = (pattern) => sourcesArray.filter(src => pattern.test(src)).sort();

    const rules = {
        serumPlasma: {
            description: 'Serum/Plasma specimens must specify type individually',
            rejected: ['Ser/Plas', 'Serum/Plasma', 'S/P'],
            accepted: ['Serum', 'Plasma'],
            rule: 'Must specify either Serum or Plasma individually. Do not use combined terms.'
        },
        bronchoalveolarLavage: {
            description: 'BAL/Lower respiratory specimen source formats',
            accepted: ['Bronchial', 'Bronchial Wash', 'Lavage, Bronchial', 'Aspirate, Tracheal', 'Sputum'],
            rule: 'Use specific BAL-type source names. Generic terms not accepted.'
        },
        bodyFluid: {
            description: 'Body fluid specimens must use specific fluid type',
            rejected: ['Body Fluid', 'Body fluid', 'Fluid'],
            accepted: has(/^Fluid,|^Wash|^Lavage|fluid|Swab|Saliva|Abscess|Amniotic|Drainage/i)
                ? filterSources(/^Fluid,|^Wash|^Lavage|fluid|Swab|Saliva|Abscess|Amniotic|Drainage/i)
                : [
                    'Abscess', 'Amniotic fluid', 'Body fluid, unsp', 'Drainage, Tube',
                    'Fluid, Abdomen', 'Fluid, Chest', 'Fluid, Cyst', 'Fluid, Other',
                    'Fluid, Pericardial', 'Peritoneal fluid/ascites',
                    'Pleural fluid (thoracentesis fld)', 'Synovial fluid (joint fluid)'
                ],
            rule: 'Do NOT use generic "Body Fluid". Specify the exact fluid type from the accepted list.'
        },
        csf: {
            description: 'Cerebral Spinal Fluid specimen source',
            accepted: ['Cerebral spinal fluid', 'CSF'],
            rule: 'Use "Cerebral spinal fluid" or "CSF".'
        },
        urine: {
            description: 'Urine specimen source',
            accepted: ['Urine'],
            rule: 'Use "Urine".'
        }
    };

    return rules;
}

// ---------------------------------------------------------------------------
// Component mapping
// ---------------------------------------------------------------------------

/**
 * Map raw component rows to ResultComponent objects, optionally filtered by
 * a specimen type. A null SPECIMEN_TYPE on a component means "applies to all".
 * @param {Array} componentRows
 * @param {string|null} specimenTypeFilter
 * @returns {Array}
 */
function buildResultComponents(componentRows, specimenTypeFilter) {
    if (!Array.isArray(componentRows) || componentRows.length === 0) return [];
    const filter = specimenTypeFilter ? _upper(specimenTypeFilter) : null;

    return componentRows
        .filter(c => {
            if (!filter) return true;
            const compType = c.SPECIMEN_TYPE;
            if (compType === null || compType === undefined || compType === '') return true;
            return _upper(compType) === filter;
        })
        .map(c => ({
            resultLoincCode: c.RESULT_LOINC || c.LOINC_CODE || '',
            resultLoincName: c.RESULT_LOINC_NAME || c.COMPONENT_NAME || '',
            referenceRange: c.REFERENCE_RANGE || '',
            units: c.UNITS || ''
        }));
}

// ---------------------------------------------------------------------------
// Orderable LOINC builder
// ---------------------------------------------------------------------------

/**
 * Build the OrderableLoinc array for a single test.
 *
 * For each unique (LOINC_CODE, SPECIMEN_TYPE) pair from the LOINC rows, emits
 * one OrderableLoinc, pulling specimen-specific fields from the matching row
 * in specimensByTestId and result components (filtered by SPECIMEN_TYPE) from
 * componentsByTestId.
 *
 * If the test has no LOINC rows but has specimen rows (common for vet tests
 * that lack LOINC mapping), we emit one orderable per specimen, leaving
 * orderLoincCode empty.
 *
 * @param {number|string} testId
 * @param {string} shortName
 * @param {string} now
 * @param {Map} loincsByTestId
 * @param {Map} specimensByTestId
 * @param {Map} componentsByTestId
 * @returns {Array}
 */
function buildOrderableLoincs(testId, shortName, now, loincsByTestId, specimensByTestId, componentsByTestId) {
    const loincRows = loincsByTestId.get(testId) || [];
    const specimenRows = specimensByTestId.get(testId) || [];
    const componentRows = componentsByTestId.get(testId) || [];

    // Index specimens by uppercased SPECIMEN_TYPE for quick lookup.
    const specimenBySpecType = new Map();
    for (const s of specimenRows) {
        const key = _upper(s.SPECIMEN_TYPE);
        if (!specimenBySpecType.has(key)) specimenBySpecType.set(key, s);
    }

    /** @type {Array<{loincCode:string, loincName:string, specimenType:string, loincRow:Object|null}>} */
    const pairs = [];
    const seenPairs = new Set();

    for (const l of loincRows) {
        const code = l.LOINC_CODE || '';
        const specType = l.SPECIMEN_TYPE || '';
        const pairKey = `${code}::${_upper(specType)}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        pairs.push({
            loincCode: code,
            loincName: l.LOINC_NAME || '',
            specimenType: specType,
            loincRow: l
        });
    }

    // Fallback: no LOINC rows at all → emit one orderable per specimen row.
    if (pairs.length === 0 && specimenRows.length > 0) {
        for (const s of specimenRows) {
            const specType = s.SPECIMEN_TYPE || '';
            const pairKey = `::${_upper(specType)}`;
            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);
            pairs.push({
                loincCode: s.ORDERABLE_LOINC_CODE || '',
                loincName: s.ORDERABLE_LOINC_NAME || '',
                specimenType: specType,
                loincRow: null
            });
        }
    }

    return pairs.map(p => {
        const specimen = specimenBySpecType.get(_upper(p.specimenType)) || null;
        const specimenUpdatedAt = specimen
            ? toIsoOrFallback(specimen.MODIFIED_DATE, now)
            : now;
        const specimenCreatedAt = specimen
            ? toIsoOrFallback(specimen.CREATED_DATE, specimenUpdatedAt)
            : now;

        return {
            orderLoincCode: p.loincCode || '',
            orderLoincName: p.loincName || '',
            shortName: shortName || '',
            sampleType: normalizeSpecimenType(p.specimenType),
            sampleHandling: specimen ? (specimen.HANDLING || '') : '',
            sampleStorage: specimen ? (specimen.STORAGE || '') : '',
            acceptableSources: specimen
                ? parseAcceptableSourcesField(specimen.ACCEPTABLE_SOURCES)
                : [],
            referenceRange: specimen ? (specimen.REFERENCE_RANGE || '') : '',
            resultUnits: specimen ? (specimen.RESULT_UNITS || '') : '',
            resultComponents: buildResultComponents(componentRows, p.specimenType),
            status: 'Active',
            createdOn: specimenCreatedAt,
            createdBy: 'starlims-sync',
            updatedOn: specimenUpdatedAt,
            updatedBy: 'starlims-sync'
        };
    });
}

// ---------------------------------------------------------------------------
// Main transformer
// ---------------------------------------------------------------------------

/**
 * Transform raw StarLIMS query result rows into a CompendiumEnvelope.
 *
 * @param {Object} rawData
 * @param {Array}  rawData.tests      - rows from GET_ACTIVE_TESTS
 * @param {Array}  rawData.specimens  - rows from GET_ALL_SPECIMENS
 * @param {Array}  rawData.loincs     - rows from GET_ALL_LOINCS
 * @param {Array}  rawData.cpts       - rows from GET_ALL_CPTS
 * @param {Array}  rawData.components - rows from GET_ALL_COMPONENTS
 * @param {Array}  rawData.panels     - rows from GET_ALL_PANELS
 * @returns {Object} CompendiumEnvelope
 */
function transformToCompendium({ tests, specimens, loincs, cpts, components, panels, version = '3.0.0' } = {}) {
    const testRows = Array.isArray(tests) ? tests : [];
    const specimenRows = Array.isArray(specimens) ? specimens : [];
    const loincRows = Array.isArray(loincs) ? loincs : [];
    const cptRows = Array.isArray(cpts) ? cpts : [];
    const componentRows = Array.isArray(components) ? components : [];
    const panelRows = Array.isArray(panels) ? panels : [];

    const now = new Date().toISOString();

    // Step 1: Group child rows by TEST_ID in a single pass each (O(n)).
    const specimensByTestId = groupBy(specimenRows, r => r.TEST_ID);
    const loincsByTestId = groupBy(loincRows, r => r.TEST_ID);
    const cptsByTestId = groupBy(cptRows, r => r.TEST_ID);
    const componentsByTestId = groupBy(componentRows, r => r.TEST_ID);

    // Build TEST_ID → TEST_CODE map for translating panel member IDs to codes.
    const testCodeByTestId = new Map();
    for (const t of testRows) {
        if (t.TEST_ID !== undefined && t.TEST_ID !== null) {
            testCodeByTestId.set(t.TEST_ID, t.TEST_CODE);
        }
    }

    // Panel members grouped and sorted by SEQUENCE, resolved to member TEST_CODEs.
    const panelMembersByTestId = new Map();
    for (const pm of panelRows) {
        const panelId = pm.PANEL_TEST_ID;
        if (panelId === null || panelId === undefined) continue;
        const existing = panelMembersByTestId.get(panelId);
        if (existing) existing.push(pm);
        else panelMembersByTestId.set(panelId, [pm]);
    }
    for (const [, arr] of panelMembersByTestId) {
        arr.sort((a, b) => {
            const sa = a.SEQUENCE === null || a.SEQUENCE === undefined ? Number.MAX_SAFE_INTEGER : a.SEQUENCE;
            const sb = b.SEQUENCE === null || b.SEQUENCE === undefined ? Number.MAX_SAFE_INTEGER : b.SEQUENCE;
            return sa - sb;
        });
    }

    // Step 2: Build CompendiumTest for each test row.
    const outTests = testRows.map(row => {
        const testId = row.TEST_ID;
        const testName = row.TEST_NAME || '';
        const shortName = row.SHORT_NAME || testName;
        const market = normalizeMarket(row.MARKET);
        const species = row.SPECIES || (market === 'Human' ? 'Human' : '');

        // CPT codes
        const cptList = (cptsByTestId.get(testId) || []).map(c => ({
            code: String(c.CPT_CODE || '').trim(),
            quantity: Number.isFinite(Number(c.CPT_QUANTITY)) ? Number(c.CPT_QUANTITY) : 1
        })).filter(c => c.code);

        // Component tests (panel members → MVD test codes, sorted by SEQUENCE)
        const members = panelMembersByTestId.get(testId) || [];
        const componentTests = members
            .map(m => testCodeByTestId.get(m.MEMBER_TEST_ID))
            .filter(code => code !== undefined && code !== null && code !== '');

        // Orderable LOINCs
        const orderableLoincs = buildOrderableLoincs(
            testId,
            shortName,
            now,
            loincsByTestId,
            specimensByTestId,
            componentsByTestId
        );

        // Audit timestamps from StarLIMS if present, otherwise "now".
        const updatedOn = toIsoOrFallback(row.MODIFIED_DATE, now);
        const createdOn = toIsoOrFallback(row.CREATED_DATE, updatedOn);

        /** @type {Object} */
        const outTest = {
            mvdTestCode: String(row.TEST_CODE || '').trim(),
            market,
            species,
            testName,
            shortName,
            category: normalizeCategory(row.CATEGORY),
            methodology: normalizeMethodology(row.METHODOLOGY),
            organism: row.ORGANISM ? String(row.ORGANISM).trim() : 'N/A',
            cptCodes: cptList,
            tat: row.TAT || '',
            status: normalizeStatus(row.STATUS),
            createdOn,
            createdBy: 'starlims-sync',
            updatedOn,
            updatedBy: 'starlims-sync',
            orderableLoincs
        };

        if (componentTests.length > 0) {
            outTest.componentTests = componentTests;
        }

        return outTest;
    });

    // Sort tests by mvdTestCode for stable output.
    outTests.sort((a, b) => {
        const ac = a.mvdTestCode || '';
        const bc = b.mvdTestCode || '';
        return ac.localeCompare(bc, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Step 3: Compute summary.
    let totalOrderableLoincs = 0;
    let humanTests = 0;
    let veterinaryTests = 0;
    const categorySet = new Set();
    const marketSet = new Set();
    const speciesSet = new Set();
    const organismSet = new Set();
    for (const t of outTests) {
        totalOrderableLoincs += Array.isArray(t.orderableLoincs) ? t.orderableLoincs.length : 0;
        if (t.market === 'Human') humanTests += 1;
        else if (t.market === 'Veterinary') veterinaryTests += 1;
        if (t.category) categorySet.add(t.category);
        if (t.market)   marketSet.add(t.market);
        if (t.species)  speciesSet.add(t.species);
        if (t.organism && t.organism !== 'N/A') organismSet.add(t.organism);
    }

    const summary = {
        totalTests: outTests.length,
        totalOrderableLoincs,
        humanTests,
        veterinaryTests,
        categories: [...categorySet].sort(),
        markets:    [...marketSet].sort(),
        species:    [...speciesSet].sort(),
        organisms:  [...organismSet].sort()
    };

    // Step 4: Assemble envelope.
    return {
        version,
        lastUpdated: now,
        generatedFrom: 'StarLIMS STARLIMS_DATA automated sync',
        performingOrganization: PERFORMING_ORGANIZATION,
        specimenSourceRules: buildSpecimenSourceRules(specimenRows),
        summary,
        tests: outTests
    };
}

module.exports = {
    transformToCompendium,
    normalizeCategory,
    normalizeMethodology,
    normalizeSpecimenType,
    normalizeMarket,
    normalizeStatus,
    buildSpecimenSourceRules
};

/**
 * StarLIMS SQL Query Constants
 *
 * Exports named SQL query string constants for bulk-fetching all compendium
 * data from the StarLIMS STARLIMS_DATA database. No N+1 queries: each constant
 * fetches ALL rows for that data type in a single pass. The transformer assembles
 * the hierarchy in memory using Maps.
 *
 * Design notes:
 *  - These are plain string constants — no connection logic, no parameter binding,
 *    no functions or classes. The caller (sync function) executes them via mssql.
 *  - Every table name and key column that cannot be confirmed without schema
 *    discovery carries a "-- TODO: verify: [alternatives]" inline comment.
 *    Run scripts/discover-starlims-schema.js first to resolve these.
 *  - @since parameters are bound by the caller as DATETIME inputs.
 */

'use strict';

// ---------------------------------------------------------------------------
// GET_ACTIVE_TESTS
// Returns all active tests with the fields needed to populate CompendiumTest:
//   mvdTestCode, testName, shortName, category, methodology, market, species,
//   organism, tat, status, and audit timestamps.
// ---------------------------------------------------------------------------
const GET_ACTIVE_TESTS = `
  SELECT
    t.TEST_ID,                          -- internal PK; used as join key in sibling queries
    t.TEST_CODE,                        -- TODO: verify: TEST_CODE, MVD_CODE, ASSAY_CODE, ACCESSION_CODE
    t.TEST_NAME,                        -- TODO: verify: TEST_NAME, ASSAY_NAME, TEST_DESCRIPTION
    t.SHORT_NAME,                       -- TODO: verify: SHORT_NAME, ABBR_NAME, DISPLAY_NAME
    t.METHODOLOGY,                      -- TODO: verify: METHODOLOGY, METHOD, METHOD_CODE
    t.CATEGORY,                         -- TODO: verify: CATEGORY, TEST_CATEGORY, ASSAY_TYPE
    t.STATUS,                           -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    t.MARKET,                           -- TODO: verify: MARKET, MARKET_SEGMENT, TEST_MARKET (Human/Veterinary)
    t.SPECIES,                          -- TODO: verify: SPECIES, TARGET_SPECIES, SPECIES_CODE
    t.ORGANISM,                         -- TODO: verify: ORGANISM, TARGET_ORGANISM, PATHOGEN
    t.TAT,                              -- TODO: verify: TAT, TURNAROUND, TURNAROUND_TIME
    t.CREATED_DATE,                     -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    t.CREATED_BY,                       -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    t.MODIFIED_DATE,                    -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE, LAST_MODIFIED
    t.MODIFIED_BY                       -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY, LAST_MOD_USER
  FROM   dbo.TESTS t                    -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG, ASSAYS, TEST_MASTER
  WHERE  t.STATUS = 'ACTIVE'           -- TODO: verify: 'ACTIVE', 'A', '1', 'Active', 'Y'
  ORDER  BY t.TEST_CODE
`;

// ---------------------------------------------------------------------------
// GET_ALL_SPECIMENS
// One row per test+specimen-type combination for all active tests.
// Drives OrderableLoinc.sampleType, sampleHandling, sampleStorage,
// acceptableSources, referenceRange, resultUnits, and the LOINC row key.
// JOIN to dbo.TESTS filters to active tests only (no N+1 per test).
// ---------------------------------------------------------------------------
const GET_ALL_SPECIMENS = `
  SELECT
    s.TEST_ID,                          -- FK to dbo.TESTS.TEST_ID
    s.SPECIMEN_ID,                      -- TODO: verify: SPECIMEN_ID, SPEC_ID, ROW_ID, RECORD_ID (surrogate PK)
    s.SPECIMEN_TYPE,                    -- TODO: verify: SPECIMEN_TYPE, SAMPLE_TYPE, SPEC_TYPE (Urine, Serum, CSF…)
    s.HANDLING,                         -- TODO: verify: HANDLING, SPEC_HANDLING, SAMPLE_HANDLING, COLLECTION_INSTRUCT
    s.STORAGE,                          -- TODO: verify: STORAGE, SPEC_STORAGE, STABILITY, STORAGE_INSTRUCT
    s.VOLUME,                           -- TODO: verify: VOLUME, MIN_VOLUME, MINIMUM_VOLUME, REQ_VOLUME
    s.ACCEPTABLE_SOURCES,               -- TODO: verify: ACCEPTABLE_SOURCES, ACCEPTED_SOURCES, SOURCE_LIST, SPE_SOURCES
                                        --        May be a delimited string (pipe/newline) or a child table.
    s.REFERENCE_RANGE,                  -- TODO: verify: REFERENCE_RANGE, REF_RANGE, NORMAL_RANGE, EXPECTED_RANGE
    s.RESULT_UNITS,                     -- TODO: verify: RESULT_UNITS, UNITS, UNIT_OF_MEASURE, REPORT_UNITS
    s.ORDERABLE_LOINC_CODE,             -- TODO: verify: ORDERABLE_LOINC_CODE, ORDER_LOINC, LOINC_ORDER, LOINC_ID
                                        --        If stored in dbo.TESTLOINC instead, remove from this query.
    s.ORDERABLE_LOINC_NAME,             -- TODO: verify: ORDERABLE_LOINC_NAME, ORDER_LOINC_NAME, LOINC_LONG_NAME
    s.SHORT_NAME,                       -- TODO: verify: SHORT_NAME, SPEC_SHORT_NAME, DISPLAY_NAME
    s.STATUS,                           -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    s.CREATED_DATE,                     -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    s.CREATED_BY,                       -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    s.MODIFIED_DATE,                    -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE
    s.MODIFIED_BY                       -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY
  FROM   dbo.TESTSPECIMENS s            -- TODO: verify: TESTSPECIMENS, SPECIMEN_REQUIREMENTS, TEST_SPECIMENS, SPEC_REQUIREMENTS
  INNER JOIN dbo.TESTS t                -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
         ON t.TEST_ID = s.TEST_ID
  WHERE  t.STATUS = 'ACTIVE'           -- TODO: verify: same status value as GET_ACTIVE_TESTS
  ORDER  BY s.TEST_ID, s.SPECIMEN_TYPE
`;

// ---------------------------------------------------------------------------
// GET_ALL_LOINCS
// All LOINC mappings for active tests.
// If orderable LOINC codes live in TESTSPECIMENS (above) rather than a
// separate TESTLOINC table, this query may map to a different table or may
// be merged with GET_ALL_SPECIMENS during schema discovery.
// Drives OrderableLoinc.orderLoincCode / orderLoincName.
// ---------------------------------------------------------------------------
const GET_ALL_LOINCS = `
  SELECT
    l.TEST_ID,                          -- FK to dbo.TESTS.TEST_ID
    l.LOINC_ID,                         -- TODO: verify: LOINC_ID, ROW_ID, RECORD_ID (surrogate PK)
    l.LOINC_CODE,                       -- TODO: verify: LOINC_CODE, LOINC, ORDER_LOINC, LOINC_NUM
    l.LOINC_NAME,                       -- TODO: verify: LOINC_NAME, LOINC_LONG_NAME, LOINC_DESCRIPTION
    l.SPECIMEN_TYPE,                    -- TODO: verify: SPECIMEN_TYPE, SAMPLE_TYPE, SPEC_TYPE
                                        --        Used to join LOINC rows to SPECIMEN rows in-memory.
    l.LOINC_TYPE,                       -- TODO: verify: LOINC_TYPE, TYPE, CODE_TYPE ('Order', 'Result', NULL)
    l.STATUS,                           -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    l.CREATED_DATE,                     -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    l.CREATED_BY,                       -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    l.MODIFIED_DATE,                    -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE
    l.MODIFIED_BY                       -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY
  FROM   dbo.TESTLOINC l                -- TODO: verify: TESTLOINC, LOINC_MAPPING, TEST_CODES, TEST_LOINC, ASSAY_LOINC
  INNER JOIN dbo.TESTS t                -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
         ON t.TEST_ID = l.TEST_ID
  WHERE  t.STATUS = 'ACTIVE'           -- TODO: verify: same status value as GET_ACTIVE_TESTS
  ORDER  BY l.TEST_ID, l.LOINC_TYPE, l.SPECIMEN_TYPE
`;

// ---------------------------------------------------------------------------
// GET_ALL_CPTS
// All CPT codes for active tests.
// Drives CompendiumTest.cptCodes[].code and .quantity.
// Vet tests typically have no rows (empty set is valid).
// ---------------------------------------------------------------------------
const GET_ALL_CPTS = `
  SELECT
    c.TEST_ID,                          -- FK to dbo.TESTS.TEST_ID
    c.CPT_ID,                           -- TODO: verify: CPT_ID, ROW_ID, RECORD_ID (surrogate PK)
    c.CPT_CODE,                         -- TODO: verify: CPT_CODE, CPT, BILLING_CODE, PROC_CODE
    c.CPT_QUANTITY,                     -- TODO: verify: CPT_QUANTITY, QUANTITY, QTY, BILLING_QTY (default 1)
    c.STATUS,                           -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    c.CREATED_DATE,                     -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    c.CREATED_BY,                       -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    c.MODIFIED_DATE,                    -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE
    c.MODIFIED_BY                       -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY
  FROM   dbo.TESTCPT c                  -- TODO: verify: TESTCPT, CPT_CODES, TEST_BILLING, TEST_CPT, BILLING_CODES
  INNER JOIN dbo.TESTS t                -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
         ON t.TEST_ID = c.TEST_ID
  WHERE  t.STATUS = 'ACTIVE'           -- TODO: verify: same status value as GET_ACTIVE_TESTS
  ORDER  BY c.TEST_ID, c.CPT_CODE
`;

// ---------------------------------------------------------------------------
// GET_ALL_COMPONENTS
// All result components (analytes/observations) for active tests.
// Drives OrderableLoinc.resultComponents[]:
//   resultLoincCode, resultLoincName, referenceRange, units.
// One row per test+specimen+component triplet.
// ---------------------------------------------------------------------------
const GET_ALL_COMPONENTS = `
  SELECT
    rc.TEST_ID,                         -- FK to dbo.TESTS.TEST_ID
    rc.COMPONENT_ID,                    -- TODO: verify: COMPONENT_ID, ANALYTE_ID, ROW_ID (surrogate PK)
    rc.COMPONENT_NAME,                  -- TODO: verify: COMPONENT_NAME, ANALYTE_NAME, RESULT_NAME, OBSERVATION_NAME
    rc.RESULT_LOINC,                    -- TODO: verify: RESULT_LOINC, LOINC_CODE, RESULT_LOINC_CODE, OBX_LOINC
    rc.RESULT_LOINC_NAME,               -- TODO: verify: RESULT_LOINC_NAME, LOINC_LONG_NAME, OBX_LOINC_NAME
    rc.SPECIMEN_TYPE,                   -- TODO: verify: SPECIMEN_TYPE, SAMPLE_TYPE, SPEC_TYPE
                                        --        Used to join components to the correct orderable in-memory.
    rc.DATA_TYPE,                       -- TODO: verify: DATA_TYPE, RESULT_TYPE, OBX_DATA_TYPE ('NM','ST','CWE'…)
    rc.UNITS,                           -- TODO: verify: UNITS, UNIT_OF_MEASURE, RESULT_UNITS, OBX_UNITS
    rc.REFERENCE_RANGE,                 -- TODO: verify: REFERENCE_RANGE, REF_RANGE, NORMAL_RANGE
    rc.ABNORMAL_FLAG,                   -- TODO: verify: ABNORMAL_FLAG, ABN_FLAG, PANIC_FLAG
    rc.SEQUENCE,                        -- TODO: verify: SEQUENCE, SEQ, SORT_ORDER, DISPLAY_ORDER
    rc.STATUS,                          -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    rc.CREATED_DATE,                    -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    rc.CREATED_BY,                      -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    rc.MODIFIED_DATE,                   -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE
    rc.MODIFIED_BY                      -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY
  FROM   dbo.TESTCOMPONENTS rc          -- TODO: verify: TESTCOMPONENTS, ANALYTES, RESULT_TEMPLATES, TEST_COMPONENTS, OBSERVATIONS
  INNER JOIN dbo.TESTS t                -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
         ON t.TEST_ID = rc.TEST_ID
  WHERE  t.STATUS = 'ACTIVE'           -- TODO: verify: same status value as GET_ACTIVE_TESTS
  ORDER  BY rc.TEST_ID, rc.SPECIMEN_TYPE, rc.SEQUENCE
`;

// ---------------------------------------------------------------------------
// GET_ALL_PANELS
// Panel membership: which tests are members of which panels.
// Drives CompendiumTest.componentTests[] (array of member MVD test codes).
// Returns both the panel TEST_ID and the member TEST_ID so the transformer
// can look up codes from the test map built by GET_ACTIVE_TESTS.
// ---------------------------------------------------------------------------
const GET_ALL_PANELS = `
  SELECT
    pm.PANEL_TEST_ID,                   -- TODO: verify: PANEL_TEST_ID, PANEL_ID, PARENT_TEST_ID, PANEL_ASSAY_ID
    pm.MEMBER_TEST_ID,                  -- TODO: verify: MEMBER_TEST_ID, COMPONENT_TEST_ID, CHILD_TEST_ID, ASSAY_ID
    pm.SEQUENCE,                        -- TODO: verify: SEQUENCE, SEQ, SORT_ORDER, MEMBER_SEQUENCE, PANEL_ORDER
    pm.STATUS,                          -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    pm.CREATED_DATE,                    -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    pm.CREATED_BY,                      -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    pm.MODIFIED_DATE,                   -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE
    pm.MODIFIED_BY                      -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY
  FROM   dbo.TESTPANELS pm              -- TODO: verify: TESTPANELS, PANELS, PANEL_MEMBERS, TEST_PANELS, PANEL_CONTENTS
  INNER JOIN dbo.TESTS t                -- panel itself must be active
         ON t.TEST_ID = pm.PANEL_TEST_ID
            AND t.STATUS = 'ACTIVE'    -- TODO: verify: same status value as GET_ACTIVE_TESTS
  INNER JOIN dbo.TESTS m               -- member must also be active (exclude retired components)
         ON m.TEST_ID = pm.MEMBER_TEST_ID
            AND m.STATUS = 'ACTIVE'    -- TODO: verify: same status value as GET_ACTIVE_TESTS
  ORDER  BY pm.PANEL_TEST_ID, pm.SEQUENCE
`;

// ---------------------------------------------------------------------------
// GET_CHANGED_TEST_IDS
// Change-detection query for incremental sync.
// Returns the distinct set of TEST_IDs modified since the @since timestamp.
// The sync function binds @since as a mssql.DateTime input parameter.
// Covers the TESTS table; a production implementation may need to UNION
// with child tables (TESTSPECIMENS, TESTLOINC, etc.) to catch updates that
// touch child rows without bumping the parent MODIFIED_DATE.
// ---------------------------------------------------------------------------
const GET_CHANGED_TEST_IDS = `
  SELECT DISTINCT
    t.TEST_ID                           -- FK used by caller to re-fetch full records
  FROM   dbo.TESTS t                    -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
  WHERE  t.MODIFIED_DATE > @since       -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE, LAST_MODIFIED
  -- NOTE: If child-table changes do not propagate MODIFIED_DATE to parent, add UNIONs:
  --   UNION SELECT TEST_ID FROM dbo.TESTSPECIMENS WHERE MODIFIED_DATE > @since
  --   UNION SELECT TEST_ID FROM dbo.TESTLOINC      WHERE MODIFIED_DATE > @since
  --   UNION SELECT TEST_ID FROM dbo.TESTCPT         WHERE MODIFIED_DATE > @since
  --   UNION SELECT TEST_ID FROM dbo.TESTCOMPONENTS  WHERE MODIFIED_DATE > @since
  --   UNION SELECT TEST_ID FROM dbo.TESTPANELS      WHERE MODIFIED_DATE > @since OR ...
`;

// ---------------------------------------------------------------------------
// GET_ALL_TESTS_INCLUDING_INACTIVE
// Fetch all tests (active AND inactive) for status transition detection.
// Only used by the sync to detect Active→Inactive transitions so that tests
// removed from the active catalog are retained in the compendium with an
// audit-trail status=Inactive record. Normal display still filters to Active
// via the API's ?status=Active query parameter.
// ---------------------------------------------------------------------------
const GET_ALL_TESTS_INCLUDING_INACTIVE = `
  SELECT
    t.TEST_ID,                          -- internal PK; used as join key in sibling queries
    t.TEST_CODE,                        -- TODO: verify: TEST_CODE, MVD_CODE, ASSAY_CODE, ACCESSION_CODE
    t.TEST_NAME,                        -- TODO: verify: TEST_NAME, ASSAY_NAME, TEST_DESCRIPTION
    t.SHORT_NAME,                       -- TODO: verify: SHORT_NAME, ABBR_NAME, DISPLAY_NAME
    t.METHODOLOGY,                      -- TODO: verify: METHODOLOGY, METHOD, METHOD_CODE
    t.CATEGORY,                         -- TODO: verify: CATEGORY, TEST_CATEGORY, ASSAY_TYPE
    t.STATUS,                           -- TODO: verify: STATUS, ACTIVE_FLAG, RECORD_STATUS
    t.MARKET,                           -- TODO: verify: MARKET, MARKET_SEGMENT, TEST_MARKET (Human/Veterinary)
    t.SPECIES,                          -- TODO: verify: SPECIES, TARGET_SPECIES, SPECIES_CODE
    t.ORGANISM,                         -- TODO: verify: ORGANISM, TARGET_ORGANISM, PATHOGEN
    t.TAT,                              -- TODO: verify: TAT, TURNAROUND, TURNAROUND_TIME
    t.CREATED_DATE,                     -- TODO: verify: CREATED_DATE, CREATE_DATE, ENTRY_DATE
    t.CREATED_BY,                       -- TODO: verify: CREATED_BY, CREATE_USER, ENTERED_BY
    t.MODIFIED_DATE,                    -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE, LAST_MODIFIED
    t.MODIFIED_BY                       -- TODO: verify: MODIFIED_BY, MODIFY_USER, UPDATED_BY, LAST_MOD_USER
  FROM   dbo.TESTS t                    -- TODO: verify table name: TESTS, TESTDEFINITION, TEST_CATALOG, ASSAYS, TEST_MASTER
  ORDER  BY t.TEST_CODE
`;

// ---------------------------------------------------------------------------
// GET_CHANGED_ANY_STATUS
// Change-detection query that DOES NOT filter by status. Needed so that tests
// transitioning from Active→Inactive are detected (their STATUS change bumps
// MODIFIED_DATE but a status-filtered query would still miss them if the
// status value itself changes). Paired with GET_ALL_TESTS_INCLUDING_INACTIVE.
// ---------------------------------------------------------------------------
const GET_CHANGED_ANY_STATUS = `
  SELECT DISTINCT
    TEST_ID                             -- FK used by caller to re-fetch full records
  FROM   dbo.TESTS                      -- TODO: verify: TESTS, TESTDEFINITION, TEST_CATALOG
  WHERE  MODIFIED_DATE > @since         -- TODO: verify: MODIFIED_DATE, MODIFY_DATE, UPDATE_DATE, LAST_MODIFIED
`;

// ---------------------------------------------------------------------------
// QUERIES — named-access object (same keys as individual exports)
// ---------------------------------------------------------------------------
const QUERIES = {
    GET_ACTIVE_TESTS,
    GET_ALL_TESTS_INCLUDING_INACTIVE,
    GET_ALL_SPECIMENS,
    GET_ALL_LOINCS,
    GET_ALL_CPTS,
    GET_ALL_COMPONENTS,
    GET_ALL_PANELS,
    GET_CHANGED_TEST_IDS,
    GET_CHANGED_ANY_STATUS
};

module.exports = {
    GET_ACTIVE_TESTS,
    GET_ALL_TESTS_INCLUDING_INACTIVE,
    GET_ALL_SPECIMENS,
    GET_ALL_LOINCS,
    GET_ALL_CPTS,
    GET_ALL_COMPONENTS,
    GET_ALL_PANELS,
    GET_CHANGED_TEST_IDS,
    GET_CHANGED_ANY_STATUS,
    QUERIES
};

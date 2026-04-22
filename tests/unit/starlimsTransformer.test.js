/**
 * Unit Tests — starlimsTransformer.js
 *
 * Tests all normalization helpers and the main transformToCompendium function.
 * No mssql mocking needed — the transformer is a pure, dependency-free module.
 */

'use strict';

const {
    normalizeCategory,
    normalizeMethodology,
    normalizeSpecimenType,
    normalizeMarket,
    normalizeStatus,
    transformToCompendium
} = require('../../src/lib/starlimsTransformer');

const { computeDiff, nextVersion } = require('../../src/functions/compendiumSync');

// ---------------------------------------------------------------------------
// normalizeCategory
// ---------------------------------------------------------------------------
describe('normalizeCategory', () => {
    it('maps AG → Antigen', () => {
        expect(normalizeCategory('AG')).toBe('Antigen');
    });

    it('maps ANTIGEN → Antigen (case insensitive)', () => {
        expect(normalizeCategory('antigen')).toBe('Antigen');
    });

    it('maps AB → Antibody', () => {
        expect(normalizeCategory('AB')).toBe('Antibody');
    });

    it('maps ANTIBODY → Antibody', () => {
        expect(normalizeCategory('ANTIBODY')).toBe('Antibody');
    });

    it('maps PCR → PCR', () => {
        expect(normalizeCategory('PCR')).toBe('PCR');
    });

    it('maps MOLECULAR → PCR', () => {
        expect(normalizeCategory('MOLECULAR')).toBe('PCR');
    });

    it('maps PANEL → Panel', () => {
        expect(normalizeCategory('PANEL')).toBe('Panel');
    });

    it('maps GRP → Panel', () => {
        expect(normalizeCategory('GRP')).toBe('Panel');
    });

    it('maps TDM → Therapeutic Drug Monitoring', () => {
        expect(normalizeCategory('TDM')).toBe('Therapeutic Drug Monitoring');
    });

    it('maps DRUG → Therapeutic Drug Monitoring', () => {
        expect(normalizeCategory('DRUG')).toBe('Therapeutic Drug Monitoring');
    });

    it('passes through unknown code as-is (trimmed)', () => {
        expect(normalizeCategory('CUSTOM')).toBe('CUSTOM');
    });

    it('passes through unknown code with leading/trailing spaces trimmed', () => {
        expect(normalizeCategory('  MYCUSTOM  ')).toBe('MYCUSTOM');
    });

    it('returns empty string for null', () => {
        expect(normalizeCategory(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(normalizeCategory(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(normalizeCategory('')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// normalizeMethodology
// ---------------------------------------------------------------------------
describe('normalizeMethodology', () => {
    it('maps EIA → EIA', () => {
        expect(normalizeMethodology('EIA')).toBe('EIA');
    });

    it('maps ELISA → EIA', () => {
        expect(normalizeMethodology('ELISA')).toBe('EIA');
    });

    it('maps PCR → PCR', () => {
        expect(normalizeMethodology('PCR')).toBe('PCR');
    });

    it('maps RT-PCR → PCR', () => {
        expect(normalizeMethodology('RT-PCR')).toBe('PCR');
    });

    it('maps QPCR → PCR', () => {
        expect(normalizeMethodology('QPCR')).toBe('PCR');
    });

    it('maps LA → Latex Agglutination', () => {
        expect(normalizeMethodology('LA')).toBe('Latex Agglutination');
    });

    it('maps LATEX → Latex Agglutination', () => {
        expect(normalizeMethodology('LATEX')).toBe('Latex Agglutination');
    });

    it('maps ID → Immunodiffusion', () => {
        expect(normalizeMethodology('ID')).toBe('Immunodiffusion');
    });

    it('maps IMMUNODIFF → Immunodiffusion', () => {
        expect(normalizeMethodology('IMMUNODIFF')).toBe('Immunodiffusion');
    });

    it('maps BIOASSAY → Bioassay', () => {
        expect(normalizeMethodology('BIOASSAY')).toBe('Bioassay');
    });

    it('maps COLORIMETRIC → Colorimetric', () => {
        expect(normalizeMethodology('COLORIMETRIC')).toBe('Colorimetric');
    });

    it('passes through unknown methodology as-is', () => {
        expect(normalizeMethodology('CUSTOM_METHOD')).toBe('CUSTOM_METHOD');
    });

    it('does not throw for null', () => {
        expect(() => normalizeMethodology(null)).not.toThrow();
        expect(normalizeMethodology(null)).toBe('');
    });

    it('does not throw for undefined', () => {
        expect(() => normalizeMethodology(undefined)).not.toThrow();
        expect(normalizeMethodology(undefined)).toBe('');
    });
});

// ---------------------------------------------------------------------------
// normalizeSpecimenType
// ---------------------------------------------------------------------------
describe('normalizeSpecimenType', () => {
    it('maps SER → Serum', () => {
        expect(normalizeSpecimenType('SER')).toBe('Serum');
    });

    it('maps SERUM → Serum', () => {
        expect(normalizeSpecimenType('SERUM')).toBe('Serum');
    });

    it('maps UR → Urine', () => {
        expect(normalizeSpecimenType('UR')).toBe('Urine');
    });

    it('maps URINE → Urine', () => {
        expect(normalizeSpecimenType('URINE')).toBe('Urine');
    });

    it('maps CSF → CSF', () => {
        expect(normalizeSpecimenType('CSF')).toBe('CSF');
    });

    it('maps CERSP → CSF', () => {
        expect(normalizeSpecimenType('CERSP')).toBe('CSF');
    });

    it('maps BAL → BAL', () => {
        expect(normalizeSpecimenType('BAL')).toBe('BAL');
    });

    it('maps BRONCH → BAL', () => {
        expect(normalizeSpecimenType('BRONCH')).toBe('BAL');
    });

    it('maps PLAS → Plasma', () => {
        expect(normalizeSpecimenType('PLAS')).toBe('Plasma');
    });

    it('maps PLASMA → Plasma', () => {
        expect(normalizeSpecimenType('PLASMA')).toBe('Plasma');
    });

    it('maps BF → Body Fluid', () => {
        expect(normalizeSpecimenType('BF')).toBe('Body Fluid');
    });

    it('maps BFLUID → Body Fluid', () => {
        expect(normalizeSpecimenType('BFLUID')).toBe('Body Fluid');
    });

    it('passes through unknown specimen type as-is', () => {
        expect(normalizeSpecimenType('TISSUE')).toBe('TISSUE');
    });

    it('does not throw for null', () => {
        expect(() => normalizeSpecimenType(null)).not.toThrow();
        expect(normalizeSpecimenType(null)).toBe('');
    });

    it('does not throw for undefined', () => {
        expect(() => normalizeSpecimenType(undefined)).not.toThrow();
        expect(normalizeSpecimenType(undefined)).toBe('');
    });
});

// ---------------------------------------------------------------------------
// normalizeStatus
// ---------------------------------------------------------------------------
describe('normalizeStatus', () => {
    it('maps ACTIVE → Active', () => {
        expect(normalizeStatus('ACTIVE')).toBe('Active');
    });

    it('maps A → Active', () => {
        expect(normalizeStatus('A')).toBe('Active');
    });

    it('maps 1 → Active', () => {
        expect(normalizeStatus('1')).toBe('Active');
    });

    it('maps Y → Active', () => {
        expect(normalizeStatus('Y')).toBe('Active');
    });

    it('maps YES → Active', () => {
        expect(normalizeStatus('YES')).toBe('Active');
    });

    it('maps TRUE → Active', () => {
        expect(normalizeStatus('TRUE')).toBe('Active');
    });

    it('maps case-insensitive "active" → Active', () => {
        expect(normalizeStatus('active')).toBe('Active');
    });

    it('maps unknown value to Inactive', () => {
        expect(normalizeStatus('INACTIVE')).toBe('Inactive');
    });

    it('maps empty string to Inactive', () => {
        expect(normalizeStatus('')).toBe('Inactive');
    });

    it('maps null → Inactive', () => {
        expect(normalizeStatus(null)).toBe('Inactive');
    });

    it('maps undefined → Inactive', () => {
        expect(normalizeStatus(undefined)).toBe('Inactive');
    });
});

// ---------------------------------------------------------------------------
// normalizeMarket
// ---------------------------------------------------------------------------
describe('normalizeMarket', () => {
    it('maps H → Human', () => {
        expect(normalizeMarket('H')).toBe('Human');
    });

    it('maps HUMAN → Human', () => {
        expect(normalizeMarket('HUMAN')).toBe('Human');
    });

    it('maps V → Veterinary', () => {
        expect(normalizeMarket('V')).toBe('Veterinary');
    });

    it('maps VET → Veterinary', () => {
        expect(normalizeMarket('VET')).toBe('Veterinary');
    });

    it('maps VETERINARY → Veterinary', () => {
        expect(normalizeMarket('VETERINARY')).toBe('Veterinary');
    });

    it('maps case-insensitive "veterinary" → Veterinary', () => {
        expect(normalizeMarket('veterinary')).toBe('Veterinary');
    });

    it('defaults unknown code to Human', () => {
        expect(normalizeMarket('EXOTIC')).toBe('Human');
    });

    it('defaults null to Human', () => {
        expect(normalizeMarket(null)).toBe('Human');
    });

    it('defaults undefined to Human', () => {
        expect(normalizeMarket(undefined)).toBe('Human');
    });

    it('defaults empty string to Human', () => {
        expect(normalizeMarket('')).toBe('Human');
    });
});

// ---------------------------------------------------------------------------
// transformToCompendium — human test (test 310: Histoplasma Ag)
// ---------------------------------------------------------------------------
describe('transformToCompendium - human test (test 310)', () => {
    const TEST_ID = 310;

    // Two specimen rows: Urine and Serum
    const specimens = [
        {
            TEST_ID,
            SPECIMEN_TYPE: 'UR',
            HANDLING: 'Refrigerate',
            STORAGE: '4C',
            ACCEPTABLE_SOURCES: 'Urine',
            REFERENCE_RANGE: '',
            RESULT_UNITS: '',
            MODIFIED_DATE: '2024-01-01T00:00:00.000Z',
            CREATED_DATE: '2023-01-01T00:00:00.000Z'
        },
        {
            TEST_ID,
            SPECIMEN_TYPE: 'SER',
            HANDLING: 'Refrigerate',
            STORAGE: '4C',
            ACCEPTABLE_SOURCES: 'Serum',
            REFERENCE_RANGE: '',
            RESULT_UNITS: '',
            MODIFIED_DATE: '2024-01-01T00:00:00.000Z',
            CREATED_DATE: '2023-01-01T00:00:00.000Z'
        }
    ];

    // Two orderable LOINCs: one Urine, one Serum
    const loincs = [
        { TEST_ID, LOINC_CODE: '48952-6', LOINC_NAME: 'Histoplasma Ag [Units/vol] Ur', SPECIMEN_TYPE: 'UR' },
        { TEST_ID, LOINC_CODE: '51753-2', LOINC_NAME: 'Histoplasma Ag [Units/vol] Ser', SPECIMEN_TYPE: 'SER' }
    ];

    // Two CPT codes (87385 x1, 86698 x2)
    const cpts = [
        { TEST_ID, CPT_CODE: '87385', CPT_QUANTITY: 1 },
        { TEST_ID, CPT_CODE: '86698', CPT_QUANTITY: 2 }
    ];

    // One result component per specimen
    const components = [
        {
            TEST_ID,
            SPECIMEN_TYPE: 'UR',
            RESULT_LOINC: '48952-6',
            RESULT_LOINC_NAME: 'Histoplasma Ag Urine',
            REFERENCE_RANGE: 'Negative',
            UNITS: 'ng/mL'
        },
        {
            TEST_ID,
            SPECIMEN_TYPE: 'SER',
            RESULT_LOINC: '51753-2',
            RESULT_LOINC_NAME: 'Histoplasma Ag Serum',
            REFERENCE_RANGE: 'Negative',
            UNITS: 'ng/mL'
        }
    ];

    const testRow = {
        TEST_ID,
        TEST_CODE: '310',
        TEST_NAME: 'Histoplasma Antigen',
        SHORT_NAME: 'Histo Ag',
        CATEGORY: 'AG',
        METHODOLOGY: 'EIA',
        ORGANISM: 'Histoplasma capsulatum',
        MARKET: 'H',
        SPECIES: 'Human',
        STATUS: 'ACTIVE',
        TAT: '1-3 days',
        CREATED_DATE: '2020-01-01T00:00:00.000Z',
        MODIFIED_DATE: '2024-01-01T00:00:00.000Z'
    };

    let envelope;
    let test310;

    beforeAll(() => {
        envelope = transformToCompendium({
            tests: [testRow],
            specimens,
            loincs,
            cpts,
            components,
            panels: []
        });
        test310 = envelope.tests[0];
    });

    it('returns mvdTestCode === "310"', () => {
        expect(test310.mvdTestCode).toBe('310');
    });

    it('market is Human', () => {
        expect(test310.market).toBe('Human');
    });

    it('species is Human', () => {
        expect(test310.species).toBe('Human');
    });

    it('category is Antigen', () => {
        expect(test310.category).toBe('Antigen');
    });

    it('cptCodes has 2 entries', () => {
        expect(test310.cptCodes).toHaveLength(2);
    });

    it('cptCodes contains 87385 with quantity 1', () => {
        const cpt = test310.cptCodes.find(c => c.code === '87385');
        expect(cpt).toBeDefined();
        expect(cpt.quantity).toBe(1);
    });

    it('cptCodes contains 86698 with quantity 2', () => {
        const cpt = test310.cptCodes.find(c => c.code === '86698');
        expect(cpt).toBeDefined();
        expect(cpt.quantity).toBe(2);
    });

    it('orderableLoincs has 2 entries', () => {
        expect(test310.orderableLoincs).toHaveLength(2);
    });

    it('one orderable is Urine', () => {
        const urine = test310.orderableLoincs.find(ol => ol.sampleType === 'Urine');
        expect(urine).toBeDefined();
        expect(urine.orderLoincCode).toBe('48952-6');
    });

    it('one orderable is Serum', () => {
        const serum = test310.orderableLoincs.find(ol => ol.sampleType === 'Serum');
        expect(serum).toBeDefined();
        expect(serum.orderLoincCode).toBe('51753-2');
    });

    it('each orderable has resultComponents', () => {
        test310.orderableLoincs.forEach(ol => {
            expect(Array.isArray(ol.resultComponents)).toBe(true);
            expect(ol.resultComponents.length).toBeGreaterThan(0);
        });
    });

    it('organism is populated (not N/A when row has a value)', () => {
        expect(test310.organism).toBe('Histoplasma capsulatum');
    });

    it('audit: createdBy === "starlims-sync"', () => {
        expect(test310.createdBy).toBe('starlims-sync');
    });

    it('audit: updatedBy === "starlims-sync"', () => {
        expect(test310.updatedBy).toBe('starlims-sync');
    });

    it('envelope version is 3.0.0', () => {
        expect(envelope.version).toBe('3.0.0');
    });

    it('envelope summary.totalTests is 1', () => {
        expect(envelope.summary.totalTests).toBe(1);
    });

    it('envelope summary.totalOrderableLoincs is 2', () => {
        expect(envelope.summary.totalOrderableLoincs).toBe(2);
    });

    it('summary.categories includes "Antigen"', () => {
        expect(envelope.summary.categories).toContain('Antigen');
    });

    it('summary.markets includes "Human"', () => {
        expect(envelope.summary.markets).toContain('Human');
    });

    it('summary.species includes "Human"', () => {
        expect(envelope.summary.species).toContain('Human');
    });

    it('summary.organisms includes Histoplasma capsulatum', () => {
        expect(envelope.summary.organisms).toContain('Histoplasma capsulatum');
    });

    it('organism defaults to "N/A" when row ORGANISM is null', () => {
        const result = transformToCompendium({
            tests: [{ ...testRow, ORGANISM: null }],
            specimens: [],
            loincs: [],
            cpts: [],
            components: [],
            panels: []
        });
        expect(result.tests[0].organism).toBe('N/A');
    });
});

// ---------------------------------------------------------------------------
// transformToCompendium — vet test (no LOINCs — fallback to specimens)
// ---------------------------------------------------------------------------
describe('transformToCompendium - vet test (no LOINCs)', () => {
    const TEST_ID = 5001;

    const vetTestRow = {
        TEST_ID,
        TEST_CODE: '5001',
        TEST_NAME: 'Blastomyces Ag Canine',
        SHORT_NAME: 'Blasto Ag Canine',
        CATEGORY: 'AG',
        METHODOLOGY: 'EIA',
        ORGANISM: 'Blastomyces dermatitidis',
        MARKET: 'V',
        SPECIES: 'Canine',
        STATUS: 'A',
        TAT: '1-3 days',
        CREATED_DATE: null,
        MODIFIED_DATE: null
    };

    const specimens = [
        {
            TEST_ID,
            SPECIMEN_TYPE: 'UR',
            ORDERABLE_LOINC_CODE: '',
            ORDERABLE_LOINC_NAME: '',
            HANDLING: '',
            STORAGE: '',
            ACCEPTABLE_SOURCES: 'Urine',
            REFERENCE_RANGE: '',
            RESULT_UNITS: '',
            MODIFIED_DATE: null,
            CREATED_DATE: null
        },
        {
            TEST_ID,
            SPECIMEN_TYPE: 'SER',
            ORDERABLE_LOINC_CODE: '',
            ORDERABLE_LOINC_NAME: '',
            HANDLING: '',
            STORAGE: '',
            ACCEPTABLE_SOURCES: 'Serum',
            REFERENCE_RANGE: '',
            RESULT_UNITS: '',
            MODIFIED_DATE: null,
            CREATED_DATE: null
        }
    ];

    let envelope;
    let vet5001;

    beforeAll(() => {
        envelope = transformToCompendium({
            tests: [vetTestRow],
            specimens,
            loincs: [],       // no LOINCs — triggers fallback
            cpts: [],
            components: [],
            panels: []
        });
        vet5001 = envelope.tests[0];
    });

    it('market is Veterinary', () => {
        expect(vet5001.market).toBe('Veterinary');
    });

    it('orderableLoincs has 2 entries (one per specimen, fallback path)', () => {
        expect(vet5001.orderableLoincs).toHaveLength(2);
    });

    it('fallback orderable Urine has sampleType Urine', () => {
        const urine = vet5001.orderableLoincs.find(ol => ol.sampleType === 'Urine');
        expect(urine).toBeDefined();
    });

    it('fallback orderable Serum has sampleType Serum', () => {
        const serum = vet5001.orderableLoincs.find(ol => ol.sampleType === 'Serum');
        expect(serum).toBeDefined();
    });

    it('cptCodes is empty array', () => {
        expect(vet5001.cptCodes).toEqual([]);
    });

    it('summary.veterinaryTests is 1', () => {
        expect(envelope.summary.veterinaryTests).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// transformToCompendium — panel test (componentTests)
// ---------------------------------------------------------------------------
describe('transformToCompendium - panel test', () => {
    // Member tests that belong to the panel
    const MEMBER_1_ID = 310;
    const MEMBER_2_ID = 320;

    const tests = [
        // The panel itself
        {
            TEST_ID: 1000,
            TEST_CODE: '1000',
            TEST_NAME: 'Pulmonary Fungal Panel',
            SHORT_NAME: 'PFP',
            CATEGORY: 'PANEL',
            METHODOLOGY: 'PCR',
            ORGANISM: null,
            MARKET: 'H',
            SPECIES: 'Human',
            STATUS: 'ACTIVE',
            TAT: '3-5 days',
            CREATED_DATE: null,
            MODIFIED_DATE: null
        },
        // Member test 310
        {
            TEST_ID: MEMBER_1_ID,
            TEST_CODE: '310',
            TEST_NAME: 'Histoplasma Ag',
            SHORT_NAME: 'Histo Ag',
            CATEGORY: 'AG',
            METHODOLOGY: 'EIA',
            ORGANISM: 'Histoplasma capsulatum',
            MARKET: 'H',
            SPECIES: 'Human',
            STATUS: 'ACTIVE',
            TAT: '1-3 days',
            CREATED_DATE: null,
            MODIFIED_DATE: null
        },
        // Member test 320
        {
            TEST_ID: MEMBER_2_ID,
            TEST_CODE: '320',
            TEST_NAME: 'Blastomyces Ag',
            SHORT_NAME: 'Blasto Ag',
            CATEGORY: 'AG',
            METHODOLOGY: 'EIA',
            ORGANISM: 'Blastomyces dermatitidis',
            MARKET: 'H',
            SPECIES: 'Human',
            STATUS: 'ACTIVE',
            TAT: '1-3 days',
            CREATED_DATE: null,
            MODIFIED_DATE: null
        }
    ];

    const panels = [
        { PANEL_TEST_ID: 1000, MEMBER_TEST_ID: MEMBER_1_ID, SEQUENCE: 1 },
        { PANEL_TEST_ID: 1000, MEMBER_TEST_ID: MEMBER_2_ID, SEQUENCE: 2 }
    ];

    let envelope;
    let panel1000;

    beforeAll(() => {
        envelope = transformToCompendium({
            tests,
            specimens: [],
            loincs: [],
            cpts: [],
            components: [],
            panels
        });
        panel1000 = envelope.tests.find(t => t.mvdTestCode === '1000');
    });

    it('panel test exists in output', () => {
        expect(panel1000).toBeDefined();
    });

    it('category is Panel', () => {
        expect(panel1000.category).toBe('Panel');
    });

    it('componentTests is set', () => {
        expect(panel1000.componentTests).toBeDefined();
    });

    it('componentTests has 2 entries', () => {
        expect(panel1000.componentTests).toHaveLength(2);
    });

    it('componentTests contains member test codes as strings', () => {
        expect(panel1000.componentTests).toContain('310');
        expect(panel1000.componentTests).toContain('320');
    });

    it('member tests do not have componentTests property', () => {
        const member = envelope.tests.find(t => t.mvdTestCode === '310');
        expect(member).toBeDefined();
        expect(member.componentTests).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// transformToCompendium — empty inputs
// ---------------------------------------------------------------------------
describe('transformToCompendium - empty inputs', () => {
    let envelope;

    beforeAll(() => {
        envelope = transformToCompendium({
            tests: [],
            specimens: [],
            loincs: [],
            cpts: [],
            components: [],
            panels: []
        });
    });

    it('does not throw', () => {
        expect(() =>
            transformToCompendium({
                tests: [],
                specimens: [],
                loincs: [],
                cpts: [],
                components: [],
                panels: []
            })
        ).not.toThrow();
    });

    it('returns valid envelope with tests: []', () => {
        expect(envelope).toBeDefined();
        expect(Array.isArray(envelope.tests)).toBe(true);
        expect(envelope.tests).toHaveLength(0);
    });

    it('summary.totalTests is 0', () => {
        expect(envelope.summary.totalTests).toBe(0);
    });

    it('summary.totalOrderableLoincs is 0', () => {
        expect(envelope.summary.totalOrderableLoincs).toBe(0);
    });

    it('summary.humanTests is 0', () => {
        expect(envelope.summary.humanTests).toBe(0);
    });

    it('summary.veterinaryTests is 0', () => {
        expect(envelope.summary.veterinaryTests).toBe(0);
    });

    it('summary.categories is []', () => {
        expect(envelope.summary.categories).toEqual([]);
    });

    it('summary.markets is []', () => {
        expect(envelope.summary.markets).toEqual([]);
    });

    it('summary.species is []', () => {
        expect(envelope.summary.species).toEqual([]);
    });

    it('summary.organisms is []', () => {
        expect(envelope.summary.organisms).toEqual([]);
    });

    it('envelope has required top-level keys', () => {
        expect(envelope).toHaveProperty('version');
        expect(envelope).toHaveProperty('lastUpdated');
        expect(envelope).toHaveProperty('generatedFrom');
        expect(envelope).toHaveProperty('performingOrganization');
        expect(envelope).toHaveProperty('specimenSourceRules');
        expect(envelope).toHaveProperty('summary');
        expect(envelope).toHaveProperty('tests');
    });

    it('does not throw when called with no argument at all', () => {
        expect(() => transformToCompendium()).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// computeDiff
// ---------------------------------------------------------------------------
describe('computeDiff', () => {
    const makeTest = (code, extra = {}) => ({
        mvdTestCode: code,
        testName: `Test ${code}`,
        ...extra
    });

    const makeEnvelope = (testCodes, extra = {}) => ({
        tests: testCodes.map(c => makeTest(c, extra[c])),
        version: '3.0.0'
    });

    it('current=null → all updated tests are added', () => {
        const updated = makeEnvelope(['100', '200', '300']);
        const diff = computeDiff(null, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.added).toHaveLength(3);
        expect(diff.added).toEqual(expect.arrayContaining(['100', '200', '300']));
        expect(diff.removed).toHaveLength(0);
        expect(diff.modified).toHaveLength(0);
    });

    it('identical envelopes → hasChanges=false', () => {
        const current = makeEnvelope(['100', '200']);
        const updated = makeEnvelope(['100', '200']);
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(false);
        expect(diff.added).toHaveLength(0);
        expect(diff.removed).toHaveLength(0);
        expect(diff.modified).toHaveLength(0);
    });

    it('one test added → added=[code], modified=[], removed=[]', () => {
        const current = makeEnvelope(['100', '200']);
        const updated = makeEnvelope(['100', '200', '300']);
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.added).toEqual(['300']);
        expect(diff.modified).toHaveLength(0);
        expect(diff.removed).toHaveLength(0);
    });

    it('one test removed → removed=[code], added=[], modified=[]', () => {
        const current = makeEnvelope(['100', '200', '300']);
        const updated = makeEnvelope(['100', '200']);
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.removed).toEqual(['300']);
        expect(diff.added).toHaveLength(0);
        expect(diff.modified).toHaveLength(0);
    });

    it('one test modified → modified=[code], added=[], removed=[]', () => {
        const current = makeEnvelope(['100', '200']);
        // Modify test 200 by changing testName
        const updated = {
            tests: [
                makeTest('100'),
                makeTest('200', { testName: 'Test 200 Updated' })
            ],
            version: '3.0.0'
        };
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.modified).toEqual(['200']);
        expect(diff.added).toHaveLength(0);
        expect(diff.removed).toHaveLength(0);
    });

    it('multiple changes can coexist (added + removed + modified)', () => {
        const current = makeEnvelope(['100', '200', '300']);
        const updated = {
            tests: [
                makeTest('100', { testName: 'Test 100 Changed' }), // modified
                makeTest('200'),                                     // unchanged
                makeTest('400')                                      // added
                                                                     // 300 removed
            ],
            version: '3.0.0'
        };
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.added).toContain('400');
        expect(diff.removed).toContain('300');
        expect(diff.modified).toContain('100');
        expect(diff.modified).not.toContain('200');
    });

    it('empty updated envelope → all current tests are removed', () => {
        const current = makeEnvelope(['100', '200']);
        const updated = makeEnvelope([]);
        const diff = computeDiff(current, updated);
        expect(diff.hasChanges).toBe(true);
        expect(diff.removed).toHaveLength(2);
        expect(diff.added).toHaveLength(0);
        expect(diff.modified).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// nextVersion — minor-segment bump for audit-trail versioning
// ---------------------------------------------------------------------------
describe('nextVersion', () => {
    it('defaults to 3.1.0 when input is null', () => {
        expect(nextVersion(null)).toBe('3.1.0');
    });

    it('defaults to 3.1.0 when input is undefined', () => {
        expect(nextVersion(undefined)).toBe('3.1.0');
    });

    it('defaults to 3.1.0 when input is empty string', () => {
        expect(nextVersion('')).toBe('3.1.0');
    });

    it('bumps the minor segment and resets patch', () => {
        expect(nextVersion('3.0.0')).toBe('3.1.0');
        expect(nextVersion('3.5.12')).toBe('3.6.0');
    });

    it('preserves the major segment', () => {
        expect(nextVersion('4.2.7')).toBe('4.3.0');
    });
});

// ---------------------------------------------------------------------------
// transformToCompendium — status transitions (audit trail for billing/disputes)
// ---------------------------------------------------------------------------
describe('transformToCompendium - status transitions', () => {
    const TEST_ID = 9001;
    const TEST_CODE = '9001';

    // Minimal test row factory: only the fields the transformer actually reads.
    const baseRow = (status) => ({
        TEST_ID,
        TEST_CODE,
        TEST_NAME: 'Transition Test',
        SHORT_NAME: 'Trans',
        CATEGORY: 'AG',
        METHODOLOGY: 'EIA',
        ORGANISM: 'Test organism',
        MARKET: 'H',
        SPECIES: 'Human',
        STATUS: status,
        TAT: '1 day',
        CREATED_DATE: null,
        MODIFIED_DATE: null
    });

    const baseArgs = (row, previousCompendium) => ({
        tests: [row],
        specimens: [],
        loincs: [],
        cpts: [],
        components: [],
        panels: [],
        previousCompendium: previousCompendium || null
    });

    it('active test with no previous: enabledOn set to now, disabledOn=null', () => {
        const before = Date.now();
        const env = transformToCompendium(baseArgs(baseRow('ACTIVE')));
        const after = Date.now();
        const t = env.tests[0];
        expect(t.status).toBe('Active');
        expect(t.disabledOn).toBeNull();
        expect(typeof t.enabledOn).toBe('string');
        const enabledMs = new Date(t.enabledOn).getTime();
        expect(enabledMs).toBeGreaterThanOrEqual(before);
        expect(enabledMs).toBeLessThanOrEqual(after);
    });

    it('inactive test with no previous: enabledOn set to now, disabledOn set to now', () => {
        const before = Date.now();
        const env = transformToCompendium(baseArgs(baseRow('INACTIVE')));
        const after = Date.now();
        const t = env.tests[0];
        expect(t.status).toBe('Inactive');
        expect(typeof t.enabledOn).toBe('string');
        expect(typeof t.disabledOn).toBe('string');
        const enabledMs = new Date(t.enabledOn).getTime();
        const disabledMs = new Date(t.disabledOn).getTime();
        expect(enabledMs).toBeGreaterThanOrEqual(before);
        expect(enabledMs).toBeLessThanOrEqual(after);
        expect(disabledMs).toBeGreaterThanOrEqual(before);
        expect(disabledMs).toBeLessThanOrEqual(after);
    });

    it('Active→Inactive transition: previous enabledOn preserved, disabledOn stamped now', () => {
        const previousEnabled = '2025-06-01T00:00:00.000Z';
        const previous = {
            version: '3.1.0',
            tests: [{
                mvdTestCode: TEST_CODE,
                status: 'Active',
                enabledOn: previousEnabled,
                disabledOn: null
            }]
        };
        const before = Date.now();
        const env = transformToCompendium(baseArgs(baseRow('INACTIVE'), previous));
        const after = Date.now();
        const t = env.tests[0];
        expect(t.status).toBe('Inactive');
        expect(t.enabledOn).toBe(previousEnabled); // carried forward untouched
        expect(typeof t.disabledOn).toBe('string');
        const disabledMs = new Date(t.disabledOn).getTime();
        expect(disabledMs).toBeGreaterThanOrEqual(before);
        expect(disabledMs).toBeLessThanOrEqual(after);
    });

    it('Inactive→Active transition: disabledOn cleared, enabledOn preserved', () => {
        const previousEnabled = '2025-06-01T00:00:00.000Z';
        const previousDisabled = '2025-09-15T00:00:00.000Z';
        const previous = {
            version: '3.2.0',
            tests: [{
                mvdTestCode: TEST_CODE,
                status: 'Inactive',
                enabledOn: previousEnabled,
                disabledOn: previousDisabled
            }]
        };
        const env = transformToCompendium(baseArgs(baseRow('ACTIVE'), previous));
        const t = env.tests[0];
        expect(t.status).toBe('Active');
        expect(t.enabledOn).toBe(previousEnabled); // preserved
        expect(t.disabledOn).toBeNull();           // cleared on reactivation
    });

    it('already inactive: disabledOn preserved from previous (not overwritten)', () => {
        const previousEnabled = '2025-03-10T00:00:00.000Z';
        const previousDisabled = '2025-10-20T00:00:00.000Z';
        const previous = {
            version: '3.3.0',
            tests: [{
                mvdTestCode: TEST_CODE,
                status: 'Inactive',
                enabledOn: previousEnabled,
                disabledOn: previousDisabled
            }]
        };
        const env = transformToCompendium(baseArgs(baseRow('INACTIVE'), previous));
        const t = env.tests[0];
        expect(t.status).toBe('Inactive');
        expect(t.enabledOn).toBe(previousEnabled);
        expect(t.disabledOn).toBe(previousDisabled); // NOT overwritten
    });

    it('already active (no transition): enabledOn preserved, disabledOn remains null', () => {
        const previousEnabled = '2025-01-01T00:00:00.000Z';
        const previous = {
            version: '3.4.0',
            tests: [{
                mvdTestCode: TEST_CODE,
                status: 'Active',
                enabledOn: previousEnabled,
                disabledOn: null
            }]
        };
        const env = transformToCompendium(baseArgs(baseRow('ACTIVE'), previous));
        const t = env.tests[0];
        expect(t.status).toBe('Active');
        expect(t.enabledOn).toBe(previousEnabled);
        expect(t.disabledOn).toBeNull();
    });

    it('previousCompendium null → same behavior as omitted', () => {
        expect(() =>
            transformToCompendium({
                tests: [baseRow('ACTIVE')],
                specimens: [],
                loincs: [],
                cpts: [],
                components: [],
                panels: [],
                previousCompendium: null
            })
        ).not.toThrow();
    });

    it('emits both enabledOn and disabledOn as first-class fields on every test', () => {
        const env = transformToCompendium(baseArgs(baseRow('ACTIVE')));
        const t = env.tests[0];
        expect(Object.prototype.hasOwnProperty.call(t, 'enabledOn')).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(t, 'disabledOn')).toBe(true);
    });
});

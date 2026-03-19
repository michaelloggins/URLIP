/**
 * Compendium Data Access Layer Unit Tests
 */

const path = require('path');
const {
    loadCompendium,
    getTestByMvdCode,
    getTestByLoincCode,
    searchTests,
    getVersion,
    getAllTests,
    clearCache
} = require('../../src/lib/compendiumDataAccess');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

beforeAll(() => {
    clearCache();
    loadCompendium(DATA_PATH);
});

afterAll(() => {
    clearCache();
});

describe('loadCompendium', () => {
    test('loads compendium with correct structure', () => {
        const data = loadCompendium(DATA_PATH);
        expect(data.version).toBe('2.1.0');
        expect(data.tests).toBeInstanceOf(Array);
        expect(data.performingOrganization).toBeDefined();
        expect(data.specimenSourceRules).toBeDefined();
    });

    test('has 64 test groups (18 human + 46 vet)', () => {
        const data = loadCompendium(DATA_PATH);
        expect(data.tests.length).toBe(64);
        expect(data.summary.humanTests).toBe(18);
        expect(data.summary.veterinaryTests).toBe(46);
    });

    test('has 160 total orderable entries', () => {
        const data = loadCompendium(DATA_PATH);
        const total = data.tests.reduce((sum, t) => sum + t.orderableLoincs.length, 0);
        expect(total).toBe(160);
    });
});

describe('getTestByMvdCode', () => {
    test('returns Histoplasma Ag for code 310', () => {
        const test = getTestByMvdCode('310');
        expect(test).not.toBeNull();
        expect(test.testName).toContain('Histoplasma');
        expect(test.category).toBe('Antigen');
    });

    test('returns Pulmonary Fungal Panel for code 1000', () => {
        const test = getTestByMvdCode('1000');
        expect(test).not.toBeNull();
        expect(test.testName).toContain('Pulmonary Fungal');
        expect(test.category).toBe('PCR');
    });

    test('returns null for nonexistent code', () => {
        expect(getTestByMvdCode('999')).toBeNull();
    });
});

describe('getTestByLoincCode', () => {
    test('returns Histoplasma Urine for LOINC 48952-6', () => {
        const result = getTestByLoincCode('48952-6');
        expect(result).not.toBeNull();
        expect(result.test.mvdTestCode).toBe('310');
        expect(result.orderable.sampleType).toBe('Urine');
    });

    test('returns Histoplasma Serum for LOINC 51753-2', () => {
        const result = getTestByLoincCode('51753-2');
        expect(result).not.toBeNull();
        expect(result.orderable.sampleType).toBe('Serum/Plasma');
    });

    test('returns CSF PCR LOINC 103689-6 (new CSF Histoplasma PCR)', () => {
        const result = getTestByLoincCode('103689-6');
        expect(result).not.toBeNull();
        expect(result.test.mvdTestCode).toBe('403');
        expect(result.orderable.sampleType).toBe('Cerebral Spinal Fluid');
    });

    test('returns null for nonexistent LOINC', () => {
        expect(getTestByLoincCode('00000-0')).toBeNull();
    });
});

describe('searchTests', () => {
    test('search by query "histoplasma" returns multiple tests', () => {
        const results = searchTests({ query: 'histoplasma' });
        expect(results.length).toBeGreaterThanOrEqual(3); // Ag, Ab ID, Ab EIA, PCR
        results.forEach(t => {
            expect(t.organism.toLowerCase()).toContain('histoplasma');
        });
    });

    test('search by category "Antigen" includes human and vet', () => {
        const results = searchTests({ category: 'Antigen' });
        expect(results.length).toBeGreaterThanOrEqual(6); // 6 human + vet duplicates
    });

    test('search by category "Antibody" includes human and vet', () => {
        const results = searchTests({ category: 'Antibody' });
        expect(results.length).toBeGreaterThanOrEqual(7);
    });

    test('search by category "PCR" includes human and vet', () => {
        const results = searchTests({ category: 'PCR' });
        expect(results.length).toBeGreaterThanOrEqual(5);
    });

    test('search by organism "Aspergillus" returns human + vet tests', () => {
        const results = searchTests({ organism: 'Aspergillus' });
        expect(results.length).toBeGreaterThanOrEqual(2); // human + vet duplicates
    });

    test('search by sampleType "Urine" returns tests with urine LOINCs', () => {
        const results = searchTests({ sampleType: 'Urine' });
        expect(results.length).toBeGreaterThan(0);
        results.forEach(t => {
            expect(t.orderableLoincs.some(ol => ol.sampleType.toLowerCase().includes('urine'))).toBe(true);
        });
    });

    test('search by CPT code "87385" returns Histoplasma Ag', () => {
        const results = searchTests({ cptCode: '87385' });
        expect(results.length).toBe(1);
        expect(results[0].mvdTestCode).toBe('310');
    });

    test('combined search with market narrows to single result', () => {
        const results = searchTests({ category: 'Antigen', organism: 'Histoplasma', market: 'Human' });
        expect(results.length).toBe(1);
        expect(results[0].mvdTestCode).toBe('310');
    });

    test('empty search returns all tests', () => {
        const results = searchTests({});
        expect(results.length).toBe(64);
    });

    test('search by market=Human returns 18 tests', () => {
        const results = searchTests({ market: 'Human' });
        expect(results.length).toBe(18);
    });

    test('search by market=Veterinary returns 46 tests', () => {
        const results = searchTests({ market: 'Veterinary' });
        expect(results.length).toBe(46);
    });
});

describe('getVersion', () => {
    test('returns version metadata', () => {
        const version = getVersion();
        expect(version.version).toBe('2.1.0');
        expect(version.summary.totalTests).toBe(64);
        expect(version.summary.humanTests).toBe(18);
        expect(version.summary.veterinaryTests).toBe(46);
        expect(version.performingOrganization.cliaNumber).toBe('15D0996282');
    });
});

describe('getAllTests', () => {
    test('returns all 64 tests', () => {
        const tests = getAllTests();
        expect(tests.length).toBe(64);
    });
});

describe('audit fields', () => {
    test('every test has status, createdOn, createdBy, updatedOn, updatedBy', () => {
        const tests = getAllTests();
        tests.forEach(t => {
            expect(t.status).toBeDefined();
            expect(['Active', 'New', 'Disabled']).toContain(t.status);
            expect(t.createdOn).toBeDefined();
            expect(t.createdBy).toBe('system');
            expect(t.updatedOn).toBeDefined();
            expect(t.updatedBy).toBe('system');
        });
    });

    test('every orderable LOINC has audit fields', () => {
        const tests = getAllTests();
        tests.forEach(t => {
            t.orderableLoincs.forEach(ol => {
                expect(ol.status).toBeDefined();
                expect(['Active', 'New', 'Disabled']).toContain(ol.status);
                expect(ol.createdOn).toBeDefined();
                expect(ol.createdBy).toBe('system');
            });
        });
    });

    test('all initial records have Active status', () => {
        const tests = getAllTests();
        tests.forEach(t => {
            expect(t.status).toBe('Active');
            t.orderableLoincs.forEach(ol => {
                expect(ol.status).toBe('Active');
            });
        });
    });

    test('search by status=Active returns all 64 tests', () => {
        const results = searchTests({ status: 'Active' });
        expect(results.length).toBe(64);
    });

    test('search by status=Disabled returns 0 tests', () => {
        const results = searchTests({ status: 'Disabled' });
        expect(results.length).toBe(0);
    });
});

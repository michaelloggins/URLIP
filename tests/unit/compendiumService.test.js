/**
 * Compendium Service Layer Unit Tests
 */

const path = require('path');
const { loadCompendium, clearCache } = require('../../src/lib/compendiumDataAccess');
const compendiumService = require('../../src/services/compendiumService');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

beforeAll(() => {
    clearCache();
    loadCompendium(DATA_PATH);
});

afterAll(() => {
    clearCache();
});

describe('getAllTests', () => {
    test('grouped view returns 18 test groups', () => {
        const result = compendiumService.getAllTests({ view: 'grouped' });
        expect(result.view).toBe('grouped');
        expect(result.total).toBe(18);
        expect(result.results.length).toBe(18);
    });

    test('flat view returns 42 orderable LOINCs', () => {
        const result = compendiumService.getAllTests({ view: 'flat' });
        expect(result.view).toBe('flat');
        expect(result.total).toBe(42);
        expect(result.results.length).toBe(42);
    });

    test('flat view includes flattened fields', () => {
        const result = compendiumService.getAllTests({ view: 'flat' });
        const first = result.results[0];
        expect(first.mvdTestCode).toBeDefined();
        expect(first.testName).toBeDefined();
        expect(first.orderLoincCode).toBeDefined();
        expect(first.sampleType).toBeDefined();
    });

    test('pagination works for grouped view', () => {
        const result = compendiumService.getAllTests({ view: 'grouped', page: 1, pageSize: 5 });
        expect(result.results.length).toBe(5);
        expect(result.totalPages).toBe(4); // ceil(18/5)
        expect(result.page).toBe(1);
    });

    test('pagination works for flat view', () => {
        const result = compendiumService.getAllTests({ view: 'flat', page: 2, pageSize: 20 });
        expect(result.results.length).toBe(20);
        expect(result.page).toBe(2);
    });

    test('category filter applies in grouped view', () => {
        const result = compendiumService.getAllTests({ category: 'Antigen' });
        expect(result.total).toBe(6);
    });

    test('category filter applies in flat view', () => {
        const result = compendiumService.getAllTests({ view: 'flat', category: 'Antibody' });
        // 7 antibody tests with varying LOINC counts
        expect(result.total).toBeGreaterThan(7);
    });
});

describe('getTestByIdentifier', () => {
    test('auto-detects LOINC format (48952-6)', () => {
        const result = compendiumService.getTestByIdentifier('48952-6');
        expect(result).not.toBeNull();
        expect(result.identifierType).toBe('loinc');
        expect(result.test.mvdTestCode).toBe('310');
        expect(result.matchedOrderable.sampleType).toBe('Urine');
    });

    test('auto-detects MVD code format (310)', () => {
        const result = compendiumService.getTestByIdentifier('310');
        expect(result).not.toBeNull();
        expect(result.identifierType).toBe('mvdTestCode');
        expect(result.test.testName).toContain('Histoplasma');
    });

    test('returns null for unknown LOINC', () => {
        expect(compendiumService.getTestByIdentifier('99999-9')).toBeNull();
    });

    test('returns null for unknown MVD code', () => {
        expect(compendiumService.getTestByIdentifier('999')).toBeNull();
    });

    test('returns null for invalid format', () => {
        expect(compendiumService.getTestByIdentifier('abc-def')).toBeNull();
    });
});

describe('searchTests', () => {
    test('search "histoplasma" returns Ag + Ab ID + Ab EIA + PCR tests', () => {
        const result = compendiumService.searchTests({ query: 'histoplasma' });
        expect(result.total).toBe(4); // 310, 321, 326, 403
    });

    test('search returns query params in response', () => {
        const result = compendiumService.searchTests({ query: 'blasto', category: 'Antigen' });
        expect(result.query.query).toBe('blasto');
        expect(result.query.category).toBe('Antigen');
    });
});

describe('validateSpecimen', () => {
    test('delegates to specimenValidator correctly', () => {
        const result = compendiumService.validateSpecimen('51753-2', 'Serum');
        expect(result.valid).toBe(true);
    });

    test('rejects invalid specimen', () => {
        const result = compendiumService.validateSpecimen('51753-2', 'Ser/Plas');
        expect(result.valid).toBe(false);
    });
});

describe('exportCompendium', () => {
    test('JSON export includes full compendium', () => {
        const result = compendiumService.exportCompendium('json');
        expect(result.contentType).toBe('application/json');
        const data = JSON.parse(result.data);
        expect(data.tests.length).toBe(18);
    });

    test('CSV export has 43 lines (1 header + 42 data)', () => {
        const result = compendiumService.exportCompendium('csv');
        expect(result.contentType).toBe('text/csv');
        const lines = result.data.split('\n');
        expect(lines.length).toBe(43);
    });

    test('CSV header has expected columns', () => {
        const result = compendiumService.exportCompendium('csv');
        const header = result.data.split('\n')[0];
        expect(header).toContain('MVD Test Code');
        expect(header).toContain('Order LOINC');
        expect(header).toContain('Sample Type');
    });
});

describe('getVersion', () => {
    test('returns version 2.0.0', () => {
        const version = compendiumService.getVersion();
        expect(version.version).toBe('2.0.0');
    });

    test('includes summary with correct counts', () => {
        const version = compendiumService.getVersion();
        expect(version.summary.totalTests).toBe(18);
        expect(version.summary.totalOrderableLoincs).toBe(42);
    });
});

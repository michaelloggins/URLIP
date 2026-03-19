/**
 * Compendium API Integration Tests
 *
 * Tests the API handler functions directly by simulating
 * Azure Functions HTTP requests/responses.
 */

const path = require('path');
const { loadCompendium, clearCache } = require('../../src/lib/compendiumDataAccess');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

// Load compendium before importing functions (they use the data access layer)
beforeAll(() => {
    clearCache();
    loadCompendium(DATA_PATH);
});

afterAll(() => {
    clearCache();
});

// Helper to create mock Azure Functions request/context
function createMockRequest(url, params = {}) {
    return {
        url: `http://localhost:7071${url}`,
        params,
        method: 'GET'
    };
}

function createMockContext() {
    return {
        log: jest.fn(),
        error: jest.fn()
    };
}

// We test the handler functions directly rather than going through HTTP
// This avoids needing a running Azure Functions host
const compendiumService = require('../../src/services/compendiumService');

describe('GET /api/compendium (list)', () => {
    test('returns grouped view with 18 tests by default', () => {
        const result = compendiumService.getAllTests({});
        expect(result.view).toBe('grouped');
        expect(result.total).toBe(64);
    });

    test('returns flat view with 42 LOINCs', () => {
        const result = compendiumService.getAllTests({ view: 'flat' });
        expect(result.view).toBe('flat');
        expect(result.total).toBe(160);
    });

    test('filters by category=Antigen', () => {
        const result = compendiumService.getAllTests({ category: 'Antigen' });
        expect(result.total).toBeGreaterThanOrEqual(6); // human + vet
        result.results.forEach(t => expect(t.category).toBe('Antigen'));
    });

    test('pagination returns correct page', () => {
        const page1 = compendiumService.getAllTests({ page: 1, pageSize: 5 });
        const page2 = compendiumService.getAllTests({ page: 2, pageSize: 5 });
        expect(page1.results.length).toBe(5);
        expect(page2.results.length).toBe(5);
        expect(page1.results[0].mvdTestCode).not.toBe(page2.results[0].mvdTestCode);
    });
});

describe('GET /api/compendium/search', () => {
    test('search by q=histoplasma returns human + vet tests', () => {
        const result = compendiumService.searchTests({ query: 'histoplasma' });
        expect(result.total).toBeGreaterThanOrEqual(4);
    });

    test('search by q=blasto category=Antigen market=Human returns 1 test', () => {
        const result = compendiumService.searchTests({ query: 'blasto', category: 'Antigen', market: 'Human' });
        expect(result.total).toBe(1);
        expect(result.results[0].mvdTestCode).toBe('316');
    });

    test('search by cptCode=87385 returns Histoplasma Ag', () => {
        const result = compendiumService.searchTests({ cptCode: '87385' });
        expect(result.total).toBe(1);
        expect(result.results[0].mvdTestCode).toBe('310');
    });

    test('search with no matches returns empty', () => {
        const result = compendiumService.searchTests({ query: 'nonexistent-test-xyz' });
        expect(result.total).toBe(0);
        expect(result.results).toEqual([]);
    });
});

describe('GET /api/compendium/version', () => {
    test('returns version 2.0.0', () => {
        const version = compendiumService.getVersion();
        expect(version.version).toBe('2.1.0');
        expect(version.summary.totalTests).toBe(64);
        expect(version.summary.humanTests).toBe(18);
        expect(version.summary.veterinaryTests).toBe(46);
    });

    test('includes performing organization', () => {
        const version = compendiumService.getVersion();
        expect(version.performingOrganization.name).toBe('MiraVista Diagnostics');
        expect(version.performingOrganization.cliaNumber).toBe('15D0996282');
    });
});

describe('GET /api/compendium/validate-specimen', () => {
    test('validates Serum for LOINC 51753-2 as valid', () => {
        const result = compendiumService.validateSpecimen('51753-2', 'Serum');
        expect(result.valid).toBe(true);
    });

    test('rejects Ser/Plas for LOINC 51753-2', () => {
        const result = compendiumService.validateSpecimen('51753-2', 'Ser/Plas');
        expect(result.valid).toBe(false);
        expect(result.suggestions).toContain('Serum');
        expect(result.suggestions).toContain('Plasma');
    });

    test('rejects Body Fluid for body fluid LOINC', () => {
        const result = compendiumService.validateSpecimen('57766-8', 'Body Fluid');
        expect(result.valid).toBe(false);
    });

    test('accepts Fluid, Chest for body fluid LOINC', () => {
        const result = compendiumService.validateSpecimen('57766-8', 'Fluid, Chest');
        expect(result.valid).toBe(true);
    });

    test('accepts Sputum for PCR Lower Respiratory LOINC', () => {
        const result = compendiumService.validateSpecimen('95917-1', 'Sputum');
        expect(result.valid).toBe(true);
    });
});

describe('GET /api/compendium/export', () => {
    test('JSON export returns full compendium', () => {
        const result = compendiumService.exportCompendium('json');
        expect(result.contentType).toBe('application/json');
        const data = JSON.parse(result.data);
        expect(data.tests.length).toBe(64);
        expect(data.performingOrganization).toBeDefined();
    });

    test('CSV export returns 42 data rows', () => {
        const result = compendiumService.exportCompendium('csv');
        expect(result.contentType).toBe('text/csv');
        const lines = result.data.split('\n');
        expect(lines.length).toBe(161); // 1 header + 160 data
    });
});

describe('GET /api/compendium/{identifier}', () => {
    test('lookup by LOINC 48952-6 returns Histoplasma Urine', () => {
        const result = compendiumService.getTestByIdentifier('48952-6');
        expect(result.identifierType).toBe('loinc');
        expect(result.test.mvdTestCode).toBe('310');
        expect(result.matchedOrderable.sampleType).toBe('Urine');
    });

    test('lookup by MVD code 310 returns Histoplasma Ag', () => {
        const result = compendiumService.getTestByIdentifier('310');
        expect(result.identifierType).toBe('mvdTestCode');
        expect(result.test.testName).toContain('Histoplasma');
        expect(result.test.orderableLoincs.length).toBe(5);
    });

    test('lookup by new CSF PCR LOINC 103689-6', () => {
        const result = compendiumService.getTestByIdentifier('103689-6');
        expect(result.identifierType).toBe('loinc');
        expect(result.test.mvdTestCode).toBe('403');
        expect(result.matchedOrderable.sampleType).toBe('Cerebral Spinal Fluid');
    });

    test('lookup for unknown identifier returns null', () => {
        expect(compendiumService.getTestByIdentifier('00000-0')).toBeNull();
    });

    test('lookup for Panel code 1000', () => {
        const result = compendiumService.getTestByIdentifier('1000');
        expect(result.test.testName).toContain('Pulmonary Fungal');
        expect(result.test.orderableLoincs.length).toBe(2);
    });
});

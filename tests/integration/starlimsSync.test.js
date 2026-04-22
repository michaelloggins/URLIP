/**
 * StarLIMS Compendium Sync — Integration Test Skeleton
 *
 * These tests require a live StarLIMS database connection.
 * They are skipped automatically when STARLIMS_CONNECTION_STRING is not
 * configured or contains a placeholder value (e.g. '<...>').
 *
 * To run against a real StarLIMS instance:
 *   1. Set STARLIMS_CONNECTION_STRING in your environment or .env file.
 *   2. Ensure VPN/network connectivity to the StarLIMS SQL Server.
 *   3. Run: npm run test:integration
 *
 * Expected baseline counts:
 *   - Total active tests: >= 64 (18 human + 46 vet as of 2026-04)
 *   - Test 310 (Histoplasma Ag): >= 5 orderable LOINCs
 *     (Serum, Urine, CSF, BAL, Body Fluid)
 */

'use strict';

const STARLIMS_AVAILABLE =
    !!process.env.STARLIMS_CONNECTION_STRING &&
    !process.env.STARLIMS_CONNECTION_STRING.includes('<');

// Use `it` when DB is available, `it.skip` otherwise.
const conditionalTest = STARLIMS_AVAILABLE ? it : it.skip;

describe('StarLIMS compendium integration', () => {

    beforeAll(() => {
        if (!STARLIMS_AVAILABLE) {
            console.log(
                'Skipping StarLIMS integration tests: ' +
                'STARLIMS_CONNECTION_STRING not configured or contains a placeholder.'
            );
        }
    });

    // -----------------------------------------------------------------------
    // Connectivity & data volume
    // -----------------------------------------------------------------------

    conditionalTest('extracts all active tests (>= 64 total)', async () => {
        const { fetchAllCompendiumData } = require('../../src/functions/compendiumSync');
        const raw = await fetchAllCompendiumData();

        expect(Array.isArray(raw.tests)).toBe(true);
        expect(raw.tests.length).toBeGreaterThanOrEqual(64);

        // Verify test 310 (Histoplasma Ag) is present
        const test310 = raw.tests.find(t => String(t.TEST_CODE) === '310');
        expect(test310).toBeDefined();
        expect(test310.TEST_NAME).toMatch(/histoplasma/i);
    }, 60000); // 60 s timeout for DB round-trip

    // -----------------------------------------------------------------------
    // Specific test: Histoplasma Ag (test 310)
    // -----------------------------------------------------------------------

    conditionalTest('test 310 has >= 5 orderable LOINCs', async () => {
        const { fetchAllCompendiumData } = require('../../src/functions/compendiumSync');
        const { transformToCompendium } = require('../../src/lib/starlimsTransformer');

        const raw = await fetchAllCompendiumData();
        const envelope = transformToCompendium(raw);

        const test310 = envelope.tests.find(t => t.mvdTestCode === '310');
        expect(test310).toBeDefined();

        // Must have at least Serum, Urine, CSF, BAL, Body Fluid
        expect(test310.orderableLoincs.length).toBeGreaterThanOrEqual(5);

        const sampleTypes = test310.orderableLoincs.map(ol => ol.sampleType);
        expect(sampleTypes).toContain('Urine');
        expect(sampleTypes).toContain('Serum');
        expect(sampleTypes).toContain('CSF');
        expect(sampleTypes).toContain('BAL');
    }, 60000);

    // -----------------------------------------------------------------------
    // Schema validation
    // -----------------------------------------------------------------------

    conditionalTest('compendium envelope is schema-valid', async () => {
        const { fetchAllCompendiumData } = require('../../src/functions/compendiumSync');
        const { transformToCompendium } = require('../../src/lib/starlimsTransformer');

        const raw = await fetchAllCompendiumData();
        const envelope = transformToCompendium(raw);

        // Top-level structure
        expect(envelope).toHaveProperty('version');
        expect(envelope).toHaveProperty('lastUpdated');
        expect(envelope).toHaveProperty('generatedFrom');
        expect(envelope).toHaveProperty('performingOrganization');
        expect(envelope).toHaveProperty('specimenSourceRules');
        expect(envelope).toHaveProperty('summary');
        expect(envelope).toHaveProperty('tests');

        // Summary counts
        expect(envelope.summary.totalTests).toBeGreaterThan(0);
        expect(envelope.summary.humanTests).toBeGreaterThanOrEqual(18);
        expect(envelope.summary.veterinaryTests).toBeGreaterThanOrEqual(46);

        // Categories include Antigen
        expect(envelope.summary.categories).toContain('Antigen');

        // Markets are Human and Veterinary
        expect(envelope.summary.markets).toContain('Human');
        expect(envelope.summary.markets).toContain('Veterinary');

        // Every test has required fields
        envelope.tests.forEach(t => {
            expect(t.mvdTestCode).toBeTruthy();
            expect(t.market).toMatch(/^(Human|Veterinary)$/);
            expect(t.status).toMatch(/^(Active|Inactive)$/);
            expect(t.createdBy).toBe('starlims-sync');
            expect(t.updatedBy).toBe('starlims-sync');
            expect(Array.isArray(t.orderableLoincs)).toBe(true);
            expect(Array.isArray(t.cptCodes)).toBe(true);
        });
    }, 120000); // 2-minute timeout: full extract + transform

});

/**
 * Compendium Models Unit Tests — Audit Fields & Status
 */

const {
    VALID_STATUSES,
    createAuditFields,
    updateAuditFields,
    getEffectiveStatus,
    validateCompendiumTest
} = require('../../src/models/compendiumModels');

describe('createAuditFields', () => {
    test('creates fields with default status=New and user=system', () => {
        const fields = createAuditFields();
        expect(fields.status).toBe('New');
        expect(fields.createdBy).toBe('system');
        expect(fields.updatedBy).toBe('system');
        expect(fields.createdOn).toBeDefined();
        expect(fields.updatedOn).toBeDefined();
        expect(fields.createdOn).toBe(fields.updatedOn);
    });

    test('accepts custom status and user', () => {
        const fields = createAuditFields('Active', 'admin@mvd.com');
        expect(fields.status).toBe('Active');
        expect(fields.createdBy).toBe('admin@mvd.com');
        expect(fields.updatedBy).toBe('admin@mvd.com');
    });

    test('timestamps are valid ISO 8601', () => {
        const fields = createAuditFields();
        expect(new Date(fields.createdOn).toISOString()).toBe(fields.createdOn);
    });
});

describe('updateAuditFields', () => {
    test('preserves createdOn and createdBy', () => {
        const original = createAuditFields('New', 'builder');
        const updated = updateAuditFields(original, 'editor');
        expect(updated.createdOn).toBe(original.createdOn);
        expect(updated.createdBy).toBe('builder');
        expect(updated.updatedBy).toBe('editor');
    });

    test('updates updatedOn timestamp', () => {
        const original = {
            status: 'New',
            createdOn: '2026-01-01T00:00:00.000Z',
            createdBy: 'system',
            updatedOn: '2026-01-01T00:00:00.000Z',
            updatedBy: 'system'
        };
        const updated = updateAuditFields(original, 'admin');
        expect(updated.updatedOn).not.toBe(original.updatedOn);
        expect(new Date(updated.updatedOn).getTime()).toBeGreaterThan(new Date(original.updatedOn).getTime());
    });

    test('can change status', () => {
        const original = createAuditFields('New', 'system');
        const updated = updateAuditFields(original, 'admin', 'Active');
        expect(updated.status).toBe('Active');
    });

    test('keeps existing status if not provided', () => {
        const original = createAuditFields('Active', 'system');
        const updated = updateAuditFields(original, 'admin');
        expect(updated.status).toBe('Active');
    });
});

describe('getEffectiveStatus', () => {
    test('returns orderable status when test is Active', () => {
        const test = { status: 'Active' };
        const orderable = { status: 'Active' };
        expect(getEffectiveStatus(test, orderable)).toBe('Active');
    });

    test('returns Disabled when test is Disabled, even if orderable is Active', () => {
        const test = { status: 'Disabled' };
        const orderable = { status: 'Active' };
        expect(getEffectiveStatus(test, orderable)).toBe('Disabled');
    });

    test('returns orderable status when test is New', () => {
        const test = { status: 'New' };
        const orderable = { status: 'Disabled' };
        expect(getEffectiveStatus(test, orderable)).toBe('Disabled');
    });

    test('returns Disabled when both are Disabled', () => {
        const test = { status: 'Disabled' };
        const orderable = { status: 'Disabled' };
        expect(getEffectiveStatus(test, orderable)).toBe('Disabled');
    });
});

describe('VALID_STATUSES', () => {
    test('contains Active, New, Disabled', () => {
        expect(VALID_STATUSES).toEqual(['Active', 'New', 'Disabled']);
    });
});

describe('validateCompendiumTest — status validation', () => {
    const validTest = {
        mvdTestCode: '999',
        testName: 'Test',
        category: 'PCR',
        methodology: 'PCR',
        status: 'Active',
        orderableLoincs: [{
            orderLoincCode: '12345-6',
            sampleType: 'Serum',
            status: 'Active',
            resultComponents: [{ resultLoincCode: '12345-6' }]
        }]
    };

    test('accepts valid statuses', () => {
        const result = validateCompendiumTest(validTest);
        expect(result.valid).toBe(true);
    });

    test('rejects invalid test-level status', () => {
        const result = validateCompendiumTest({ ...validTest, status: 'Archived' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid status');
    });

    test('rejects invalid orderable-level status', () => {
        const test = {
            ...validTest,
            orderableLoincs: [{
                ...validTest.orderableLoincs[0],
                status: 'Deleted'
            }]
        };
        const result = validateCompendiumTest(test);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('invalid status');
    });
});

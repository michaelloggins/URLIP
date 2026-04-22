'use strict';

const {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    resolveLocale,
    translate,
    translateReferenceRange,
    localizeTest,
    localizeTests,
    localizeOne
} = require('../../src/lib/compendiumLocalizer');

// ---------------------------------------------------------------------------
// Minimal mock test used across describe blocks
// ---------------------------------------------------------------------------
const MOCK_TEST = {
    mvdTestCode: '310',
    testName: 'MVista® Histoplasma Antigen EIA',
    shortName: 'Histoplasma Ag EIA',
    category: 'Antigen',
    methodology: 'EIA',
    organism: 'Histoplasma capsulatum',
    status: 'Active',
    orderableLoincs: [
        {
            orderLoincCode: '48952-6',
            sampleType: 'Urine',
            referenceRange: 'Negative',
            resultComponents: [
                { resultLoincCode: '48952-6', resultLoincName: 'Histoplasma Ag', referenceRange: 'Negative', units: '' }
            ]
        },
        {
            orderLoincCode: '51753-2',
            sampleType: 'Serum',
            referenceRange: 'Negative',
            resultComponents: []
        }
    ]
};

// ---------------------------------------------------------------------------
describe('SUPPORTED_LOCALES', () => {
    it('includes en-US, fr-CA, es-MX', () => {
        expect(SUPPORTED_LOCALES).toContain('en-US');
        expect(SUPPORTED_LOCALES).toContain('fr-CA');
        expect(SUPPORTED_LOCALES).toContain('es-MX');
    });

    it('has en-US as default', () => {
        expect(DEFAULT_LOCALE).toBe('en-US');
    });
});

// ---------------------------------------------------------------------------
describe('resolveLocale', () => {
    it('returns en-US for null', () => expect(resolveLocale(null)).toBe('en-US'));
    it('returns en-US for undefined', () => expect(resolveLocale(undefined)).toBe('en-US'));
    it('returns en-US for empty string', () => expect(resolveLocale('')).toBe('en-US'));
    it('returns en-US for unknown locale', () => expect(resolveLocale('zh-CN')).toBe('en-US'));
    it('returns fr-CA for fr-CA', () => expect(resolveLocale('fr-CA')).toBe('fr-CA'));
    it('returns es-MX for es-MX', () => expect(resolveLocale('es-MX')).toBe('es-MX'));
    it('returns en-US for en-US', () => expect(resolveLocale('en-US')).toBe('en-US'));
    it('partial match: fr → fr-CA', () => expect(resolveLocale('fr')).toBe('fr-CA'));
    it('partial match: es → es-MX', () => expect(resolveLocale('es')).toBe('es-MX'));
    it('partial match: en → en-US', () => expect(resolveLocale('en')).toBe('en-US'));
    it('is case-insensitive for partial match', () => expect(resolveLocale('FR')).toBe('fr-CA'));
});

// ---------------------------------------------------------------------------
describe('translate', () => {
    const map = { Antigen: 'Antigène', Antibody: 'Anticorps' };

    it('translates a known key', () => expect(translate(map, 'Antigen')).toBe('Antigène'));
    it('passes through unknown key', () => expect(translate(map, 'PCR')).toBe('PCR'));
    it('returns empty string for null value', () => expect(translate(map, null)).toBe(''));
    it('returns empty string for undefined', () => expect(translate(map, undefined)).toBe(''));
    it('handles null map gracefully', () => expect(translate(null, 'Antigen')).toBe('Antigen'));
});

// ---------------------------------------------------------------------------
describe('translateReferenceRange', () => {
    const rangeMap = { Negative: 'Négatif', Positive: 'Positif', 'Not detected': 'Non détecté' };

    it('translates exact match', () => expect(translateReferenceRange(rangeMap, 'Negative')).toBe('Négatif'));
    it('translates term within range expression', () =>
        expect(translateReferenceRange(rangeMap, '< 0.4 ng/mL (Negative)')).toContain('Négatif'));
    it('passes through numeric range unchanged', () =>
        expect(translateReferenceRange(rangeMap, '< 0.4 ng/mL')).toBe('< 0.4 ng/mL'));
    it('returns empty string for null', () => expect(translateReferenceRange(rangeMap, null)).toBe(''));
    it('returns empty string for undefined', () => expect(translateReferenceRange(rangeMap, undefined)).toBe(''));
    it('handles null map', () => expect(translateReferenceRange(null, 'Negative')).toBe('Negative'));
});

// ---------------------------------------------------------------------------
describe('localizeTest — en-US (identity)', () => {
    it('returns same values for en-US', () => {
        const result = localizeOne(MOCK_TEST, 'en-US');
        expect(result.testName).toBe(MOCK_TEST.testName);
        expect(result.category).toBe('Antigen');
        expect(result.orderableLoincs[0].sampleType).toBe('Urine');
    });

    it('does not mutate original', () => {
        const original = JSON.parse(JSON.stringify(MOCK_TEST));
        localizeOne(MOCK_TEST, 'fr-CA');
        expect(MOCK_TEST.testName).toBe(original.testName);
        expect(MOCK_TEST.orderableLoincs[0].sampleType).toBe(original.orderableLoincs[0].sampleType);
    });
});

// ---------------------------------------------------------------------------
describe('localizeTest — fr-CA', () => {
    let result;
    beforeAll(() => { result = localizeOne(MOCK_TEST, 'fr-CA'); });

    it('translates testName for known test code', () =>
        expect(result.testName).toBe('MVista® EIA Antigène Histoplasma'));
    it('translates shortName for known test code', () =>
        expect(result.shortName).toBe('Ag Histoplasma EIA'));
    it('translates category', () => expect(result.category).toBe('Antigène'));
    it('translates methodology', () => expect(result.methodology).toBe('EIA'));
    it('translates status', () => expect(result.status).toBe('Actif'));
    it('translates sampleType in orderable', () =>
        expect(result.orderableLoincs[0].sampleType).toBe('Urine'));
    it('translates Serum specimen type', () =>
        expect(result.orderableLoincs[1].sampleType).toBe('Sérum'));
    it('translates referenceRange', () =>
        expect(result.orderableLoincs[0].referenceRange).toBe('Négatif'));
    it('translates resultComponent referenceRange', () =>
        expect(result.orderableLoincs[0].resultComponents[0].referenceRange).toBe('Négatif'));
    it('preserves non-translated fields (organism)', () =>
        expect(result.organism).toBe(MOCK_TEST.organism));
    it('preserves LOINC codes (not translated)', () =>
        expect(result.orderableLoincs[0].orderLoincCode).toBe('48952-6'));
});

// ---------------------------------------------------------------------------
describe('localizeTest — es-MX', () => {
    let result;
    beforeAll(() => { result = localizeOne(MOCK_TEST, 'es-MX'); });

    it('translates testName', () =>
        expect(result.testName).toBe('MVista® EIA Antígeno de Histoplasma'));
    it('translates category', () => expect(result.category).toBe('Antígeno'));
    it('translates sampleType Serum', () =>
        expect(result.orderableLoincs[1].sampleType).toBe('Suero'));
    it('translates referenceRange Negative', () =>
        expect(result.orderableLoincs[0].referenceRange).toBe('Negativo'));
    it('translates status Active', () => expect(result.status).toBe('Activo'));
});

// ---------------------------------------------------------------------------
describe('localizeTest — unknown test code (no override)', () => {
    const unknownTest = { ...MOCK_TEST, mvdTestCode: '999', testName: 'Some Unknown Test', shortName: 'Unknown' };

    it('keeps original testName when no override exists', () => {
        const result = localizeOne(unknownTest, 'fr-CA');
        expect(result.testName).toBe('Some Unknown Test');
        expect(result.shortName).toBe('Unknown');
    });

    it('still translates vocabulary fields (category, status)', () => {
        const result = localizeOne(unknownTest, 'fr-CA');
        expect(result.category).toBe('Antigène');
        expect(result.status).toBe('Actif');
    });
});

// ---------------------------------------------------------------------------
describe('localizeTests — array', () => {
    it('localizes all tests in array', () => {
        const tests = [MOCK_TEST, { ...MOCK_TEST, mvdTestCode: '316', testName: 'Blasto Test', shortName: 'Blasto', orderableLoincs: [] }];
        const results = localizeTests(tests, 'fr-CA');
        expect(results).toHaveLength(2);
        expect(results[0].category).toBe('Antigène');
        expect(results[1].category).toBe('Antigène');
    });

    it('returns original array for en-US (no copy overhead)', () => {
        const tests = [MOCK_TEST];
        const result = localizeTests(tests, 'en-US');
        expect(result).toBe(tests);
    });

    it('returns original array when locale is undefined', () => {
        const tests = [MOCK_TEST];
        const result = localizeTests(tests, undefined);
        expect(result).toBe(tests);
    });

    it('handles empty array', () => {
        expect(localizeTests([], 'fr-CA')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
describe('getVersion — supportedLocales', () => {
    it('compendiumService.getVersion includes supportedLocales', () => {
        const service = require('../../src/services/compendiumService');
        const version = service.getVersion();
        expect(version.supportedLocales).toEqual(expect.arrayContaining(['en-US', 'fr-CA', 'es-MX']));
        expect(version.defaultLocale).toBe('en-US');
    });
});

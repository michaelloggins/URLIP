'use strict';

const path = require('path');

const SUPPORTED_LOCALES = ['en-US', 'fr-CA', 'es-MX'];
const DEFAULT_LOCALE = 'en-US';

// Lazy-loaded locale cache
const _localeCache = {};

/**
 * @param {string} locale
 * @returns {Object} locale translation data
 */
function loadLocale(locale) {
    if (!_localeCache[locale]) {
        _localeCache[locale] = require(path.join(__dirname, '..', 'locales', `${locale}.json`));
    }
    return _localeCache[locale];
}

/**
 * Normalize a BCP 47 locale tag to one of the supported locales.
 * 'fr' → 'fr-CA', 'es' → 'es-MX', unknown → 'en-US'.
 * @param {string|null|undefined} locale
 * @returns {string}
 */
function resolveLocale(locale) {
    if (!locale) return DEFAULT_LOCALE;
    const tag = String(locale).trim();
    if (SUPPORTED_LOCALES.includes(tag)) return tag;
    // Partial match: 'fr' → 'fr-CA', 'es' → 'es-MX'
    const prefix = tag.split('-')[0].toLowerCase();
    const match = SUPPORTED_LOCALES.find(l => l.toLowerCase().startsWith(prefix + '-'));
    return match || DEFAULT_LOCALE;
}

/**
 * Look up a translated term, falling back to the original value if not found.
 * @param {Object} map - translation map object
 * @param {string} value - original value
 * @returns {string}
 */
function translate(map, value) {
    if (!value || !map) return value || '';
    return map[value] !== undefined ? map[value] : value;
}

/**
 * Translate a referenceRange string by substituting known terms.
 * Handles plain values ("Negative") and range expressions ("< 0.4 ng/mL").
 * @param {Object} rangeMap - referenceRanges translation map
 * @param {string} range
 * @returns {string}
 */
function translateReferenceRange(rangeMap, range) {
    if (!range || !rangeMap) return range || '';
    // Try exact match first
    if (rangeMap[range] !== undefined) return rangeMap[range];
    // Substitute known terms within the string
    let result = range;
    for (const [eng, translated] of Object.entries(rangeMap)) {
        result = result.replace(new RegExp(`\\b${eng}\\b`, 'gi'), translated);
    }
    return result;
}

/**
 * Apply locale translations to a single ResultComponent.
 * @param {Object} component
 * @param {Object} translations
 * @returns {Object}
 */
function localizeComponent(component, translations) {
    const { referenceRanges } = translations.vocabulary;
    return {
        ...component,
        referenceRange: translateReferenceRange(referenceRanges, component.referenceRange)
    };
}

/**
 * Apply locale translations to a single OrderableLoinc.
 * @param {Object} orderable
 * @param {Object} translations
 * @returns {Object}
 */
function localizeOrderable(orderable, translations) {
    const { specimenTypes, referenceRanges } = translations.vocabulary;
    return {
        ...orderable,
        sampleType: translate(specimenTypes, orderable.sampleType),
        referenceRange: translateReferenceRange(referenceRanges, orderable.referenceRange),
        resultComponents: (orderable.resultComponents || []).map(c => localizeComponent(c, translations))
    };
}

/**
 * Apply locale translations to a single CompendiumTest.
 * Translation priority:
 *   1. Market-qualified override: tests["310-Veterinary"]
 *   2. Code-only override: tests["310"]
 *   3. Vocabulary lookup (category, methodology, status)
 *   4. Original value (pass-through)
 * @param {Object} test
 * @param {Object} translations
 * @returns {Object}
 */
function localizeTest(test, translations) {
    const { categories, methodologies, status } = translations.vocabulary;
    const testsMap = translations.tests || {};
    const qualifiedKey = `${test.mvdTestCode}-${test.market}`;
    const testOverride = testsMap[qualifiedKey] || testsMap[String(test.mvdTestCode)] || {};

    return {
        ...test,
        testName: testOverride.testName || test.testName,
        shortName: testOverride.shortName || test.shortName,
        category: translate(categories, test.category),
        methodology: translate(methodologies, test.methodology),
        status: translate(status, test.status),
        orderableLoincs: (test.orderableLoincs || []).map(ol => localizeOrderable(ol, translations))
    };
}

/**
 * Apply locale translations to an array of CompendiumTest objects.
 * @param {Array} tests
 * @param {string} locale - BCP 47 locale tag (e.g. 'fr-CA')
 * @returns {Array}
 */
function localizeTests(tests, locale) {
    const resolved = resolveLocale(locale);
    if (resolved === DEFAULT_LOCALE) return tests;
    const translations = loadLocale(resolved);
    return tests.map(t => localizeTest(t, translations));
}

/**
 * Apply locale translations to a single CompendiumTest.
 * @param {Object} test
 * @param {string} locale
 * @returns {Object}
 */
function localizeOne(test, locale) {
    const resolved = resolveLocale(locale);
    if (resolved === DEFAULT_LOCALE) return test;
    const translations = loadLocale(resolved);
    return localizeTest(test, translations);
}

module.exports = {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    resolveLocale,
    localizeTests,
    localizeOne,
    // Exported for unit testing
    translate,
    translateReferenceRange,
    localizeTest,
    loadLocale
};

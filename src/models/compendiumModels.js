/**
 * Compendium Data Models
 *
 * JSDoc typedefs and validation/factory functions for the MVD test compendium.
 * Two-tier grouping: Test → Orderable LOINCs → Result Components
 */

/**
 * @typedef {Object} ResultComponent
 * @property {string} resultLoincCode - LOINC code for the result observation
 * @property {string} resultLoincName - Full name of the result LOINC
 * @property {string} referenceRange - Reference range for the result
 * @property {string} units - Unit of measure
 */

/**
 * @typedef {Object} CptCode
 * @property {string} code - CPT code
 * @property {number} quantity - Number of times to bill (default 1)
 */

/**
 * @typedef {Object} AuditFields
 * @property {string} status - Record status: 'Active', 'New', 'Disabled'
 * @property {string} createdOn - ISO 8601 timestamp when record was created
 * @property {string} createdBy - User/system that created the record
 * @property {string} updatedOn - ISO 8601 timestamp when record was last updated
 * @property {string} updatedBy - User/system that last updated the record
 */

/**
 * @typedef {Object} OrderableLoinc
 * @property {string} orderLoincCode - Orderable LOINC code
 * @property {string} orderLoincName - Full name of the orderable test
 * @property {string} shortName - Short display name
 * @property {string} sampleType - Primary sample type (Urine, Serum/Plasma, CSF, etc.)
 * @property {string} sampleHandling - Specimen handling instructions
 * @property {string} sampleStorage - Storage/stability requirements
 * @property {string[]} acceptableSources - Valid specimen source strings for HL7 validation
 * @property {string} referenceRange - Reference range
 * @property {string} resultUnits - Unit of measure for results
 * @property {ResultComponent[]} resultComponents - Result observation components
 * @property {string} status - Record status: 'Active', 'New', 'Disabled'
 * @property {string} createdOn - ISO 8601 timestamp
 * @property {string} createdBy - Creator
 * @property {string} updatedOn - ISO 8601 timestamp
 * @property {string} updatedBy - Last updater
 */

/**
 * @typedef {Object} CompendiumTest
 * @property {string} mvdTestCode - MVD internal test code (e.g., "310")
 * @property {string} testName - Full test name
 * @property {string} shortName - Short display name
 * @property {string} category - Test category: Antigen, Antibody, PCR, Panel
 * @property {string} methodology - Test methodology: EIA, Immunodiffusion, PCR, etc.
 * @property {string} organism - Target organism
 * @property {CptCode[]} cptCodes - CPT billing codes
 * @property {string} tat - Turnaround time description
 * @property {OrderableLoinc[]} orderableLoincs - Orderable LOINC variants
 * @property {string} status - Record status: 'Active', 'New', 'Disabled'
 * @property {string} createdOn - ISO 8601 timestamp
 * @property {string} createdBy - Creator
 * @property {string} updatedOn - ISO 8601 timestamp
 * @property {string} updatedBy - Last updater
 */

/** Valid status values */
const VALID_STATUSES = ['Active', 'New', 'Disabled'];

/**
 * @typedef {Object} PerformingOrganization
 * @property {string} name
 * @property {string} cliaNumber
 * @property {string} address
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} phone
 * @property {string} labDirector
 */

/**
 * @typedef {Object} CompendiumEnvelope
 * @property {string} version - Compendium version (semver)
 * @property {string} lastUpdated - ISO 8601 timestamp
 * @property {string} generatedFrom - Source document description
 * @property {PerformingOrganization} performingOrganization
 * @property {Object} specimenSourceRules - Specimen validation reference data
 * @property {CompendiumTest[]} tests - Array of test groups
 */

// MVD performing organization constants (from HL7 spec)
const PERFORMING_ORGANIZATION = {
    name: 'MiraVista Diagnostics',
    cliaNumber: '15D0996282',
    address: '4705 Decatur Blvd.',
    city: 'Indianapolis',
    state: 'IN',
    zip: '46241',
    phone: '1-866-647-2847',
    labDirector: 'Lauren Cooper, PhD, MPH, D(ABMM)'
};

/**
 * Categorize a test by parsing its name to derive category, methodology, and organism.
 * @param {string} testName - Full test name from Excel
 * @returns {{ category: string, methodology: string, organism: string }}
 */
function categorizeTest(testName) {
    const name = testName.trim();

    // Determine methodology
    let methodology = 'Unknown';
    if (/EIA$/i.test(name) || /EIA\s/i.test(name)) methodology = 'EIA';
    else if (/Immunodiffu/i.test(name)) methodology = 'Immunodiffusion';
    else if (/PCR/i.test(name)) methodology = 'PCR';
    else if (/Colorimetric/i.test(name)) methodology = 'Colorimetric';
    else if (/Latex Agglutination/i.test(name)) methodology = 'Latex Agglutination';
    else if (/Panel/i.test(name)) methodology = 'PCR';

    // Determine category
    let category = 'Other';
    if (/\bAg\b|Antigen|Galactomannan|Glucan/i.test(name)) category = 'Antigen';
    else if (/\bAb\b|Antibody/i.test(name)) category = 'Antibody';
    else if (/PCR|DNA/i.test(name)) category = 'PCR';
    else if (/Panel/i.test(name)) category = 'Panel';

    // Determine organism
    let organism = 'Multiple';
    if (/Histoplasma/i.test(name)) organism = 'Histoplasma capsulatum';
    else if (/Blastomyces/i.test(name)) organism = 'Blastomyces dermatitidis';
    else if (/Coccidioides/i.test(name)) organism = 'Coccidioides immitis';
    else if (/Aspergillus/i.test(name)) organism = 'Aspergillus sp';
    else if (/Cryptococcal|Cryptococcus/i.test(name)) organism = 'Cryptococcus neoformans';
    else if (/Pneumocystis/i.test(name)) organism = 'Pneumocystis jirovecii';
    else if (/Beta-D-Glucan|Glucan/i.test(name)) organism = 'Pan-fungal';
    else if (/Pulmonary Fungal/i.test(name)) organism = 'Multiple (Histo, Blasto, Cocci, Pneumocystis)';

    return { category, methodology, organism };
}

/**
 * Normalize a CPT code string that may contain quantity notation.
 * Handles formats like "86698x2", "86635x2", or plain "87385".
 * @param {string|number} raw - Raw CPT code value from Excel
 * @returns {CptCode[]}
 */
function normalizeCptCode(raw) {
    const str = String(raw).trim();
    if (!str || str === 'undefined' || str === 'null') return [];

    const match = str.match(/^(\d+)\s*x\s*(\d+)$/i);
    if (match) {
        return [{ code: match[1], quantity: parseInt(match[2], 10) }];
    }

    return [{ code: str, quantity: 1 }];
}

/**
 * Parse multi-result LOINC codes from Excel.
 * Some cells contain multiple LOINCs separated by newlines or spaces.
 * E.g., "35732-7\n35733-5" or "93836-5     \n93835-7"
 * @param {string} resultLoincRaw - Raw result LOINC string
 * @param {string} resultNameRaw - Raw result name string
 * @param {string} referenceRange - Reference range
 * @param {string} units - Unit of measure
 * @returns {ResultComponent[]}
 */
function parseResultComponents(resultLoincRaw, resultNameRaw, referenceRange, units) {
    if (!resultLoincRaw) return [];

    const loincStr = String(resultLoincRaw);
    // Split on newlines, carriage returns, or large whitespace gaps (10+ spaces)
    const loincs = loincStr
        .split(/[\r\n]+|\s{10,}/)
        .map(s => s.trim())
        .filter(s => s && /^\d+-\d+$/.test(s));

    const nameStr = String(resultNameRaw || '');
    // Split names on newlines; if that doesn't yield enough, try other strategies
    let names = nameStr
        .split(/[\r\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

    // If we got fewer names than LOINCs, try splitting on long whitespace gaps
    if (names.length < loincs.length) {
        names = nameStr
            .split(/\s{10,}/)
            .map(s => s.trim())
            .filter(Boolean);
    }

    // If still fewer names, try splitting on ") " followed by uppercase (e.g., "(ID) Histoplasma...")
    if (names.length < loincs.length && names.length === 1) {
        const splitOnBoundary = names[0].split(/\)\s+(?=[A-Z])/);
        if (splitOnBoundary.length === loincs.length) {
            names = splitOnBoundary.map((s, i) =>
                i < splitOnBoundary.length - 1 ? s + ')' : s
            );
        }
    }

    return loincs.map((code, i) => ({
        resultLoincCode: code,
        resultLoincName: names[i] || `Result component ${i + 1}`,
        referenceRange: referenceRange || '',
        units: units === 'no units' ? '' : (units || '')
    }));
}

/**
 * Parse acceptable source formats from Sheet 2 data.
 * Handles formats like "Urine", "Specify either:\nSerum\nPlasma",
 * and "Rare Body Fluids\nSpecify either:\nFluid, Chest\n..."
 * @param {string} sourceText - Raw acceptable sources text
 * @returns {string[]}
 */
function parseAcceptableSources(sourceText) {
    if (!sourceText) return [];
    const text = String(sourceText);

    const lines = text
        .split(/[\r\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

    // Filter out header lines like "Specify either:", "Rare Body Fluids"
    return lines.filter(line =>
        !/^specify either:?$/i.test(line) &&
        !/^rare body fluids$/i.test(line)
    );
}

/**
 * Create audit fields for a new record.
 * @param {string} [status='New'] - Initial status
 * @param {string} [user='system'] - Creator
 * @returns {AuditFields}
 */
function createAuditFields(status = 'New', user = 'system') {
    const now = new Date().toISOString();
    return {
        status,
        createdOn: now,
        createdBy: user,
        updatedOn: now,
        updatedBy: user
    };
}

/**
 * Create updated audit fields (preserves createdOn/createdBy).
 * @param {AuditFields} existing - Existing audit fields
 * @param {string} [user='system'] - Updater
 * @param {string} [status] - New status (optional, keeps existing if not provided)
 * @returns {AuditFields}
 */
function updateAuditFields(existing, user = 'system', status) {
    return {
        status: status || existing.status,
        createdOn: existing.createdOn,
        createdBy: existing.createdBy,
        updatedOn: new Date().toISOString(),
        updatedBy: user
    };
}

/**
 * Check the effective status of an orderable LOINC, considering its parent test.
 * If the test is Disabled, the orderable is effectively Disabled regardless of its own status.
 * @param {CompendiumTest} test
 * @param {OrderableLoinc} orderable
 * @returns {string} Effective status
 */
function getEffectiveStatus(test, orderable) {
    if (test.status === 'Disabled') return 'Disabled';
    return orderable.status;
}

/**
 * Validate a CompendiumTest object for required fields.
 * @param {CompendiumTest} test
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCompendiumTest(test) {
    const errors = [];

    if (!test.mvdTestCode) errors.push('Missing mvdTestCode');
    if (!test.testName) errors.push('Missing testName');
    if (!test.category) errors.push('Missing category');
    if (!test.methodology) errors.push('Missing methodology');
    if (test.status && !VALID_STATUSES.includes(test.status)) {
        errors.push(`Invalid status "${test.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (!Array.isArray(test.orderableLoincs) || test.orderableLoincs.length === 0) {
        errors.push('Must have at least one orderable LOINC');
    }

    if (test.orderableLoincs) {
        test.orderableLoincs.forEach((ol, i) => {
            if (!ol.orderLoincCode) errors.push(`orderableLoincs[${i}]: missing orderLoincCode`);
            if (!ol.sampleType) errors.push(`orderableLoincs[${i}]: missing sampleType`);
            if (ol.status && !VALID_STATUSES.includes(ol.status)) {
                errors.push(`orderableLoincs[${i}]: invalid status "${ol.status}"`);
            }
            if (!Array.isArray(ol.resultComponents) || ol.resultComponents.length === 0) {
                errors.push(`orderableLoincs[${i}]: must have at least one result component`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

module.exports = {
    PERFORMING_ORGANIZATION,
    VALID_STATUSES,
    categorizeTest,
    normalizeCptCode,
    parseResultComponents,
    parseAcceptableSources,
    validateCompendiumTest,
    createAuditFields,
    updateAuditFields,
    getEffectiveStatus
};

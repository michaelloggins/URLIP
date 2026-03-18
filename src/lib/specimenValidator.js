/**
 * Specimen Source Validator
 *
 * Validates specimen source strings against HL7 spec rules for a given LOINC code.
 * Handles both human-readable names ("Serum") and HL7v2.5.1 OBR-15 coded values
 * ("SER", "SER^Serum^HL70070", "Serum^Serum").
 */

const { getTestByLoincCode, getSpecimenSourceRules } = require('./compendiumDataAccess');

// ============================================================================
// HL70070 Specimen Type Code Mapping
//
// Maps standard HL7 Table 0070 codes and common variants to the MVD
// acceptable source names used in the compendium.
// ============================================================================

const HL70070_TO_MVD = {
    // Serum / Plasma
    'SER':   'Serum',
    'PLAS':  'Plasma',
    'PL':    'Plasma',

    // Urine
    'UR':    'Urine',
    'URN':   'Urine',

    // Cerebral Spinal Fluid
    'CSF':   'Cerebral spinal fluid',

    // Bronchoalveolar Lavage / Lower Respiratory
    'BROL':  'Bronchial',       // BAL → maps to the generic bronchial source
    'BAL':   'Bronchial',       // common non-standard alias
    'LAVG':  'Lavage, Bronchial',
    'BRO':   'Bronchial Wash',
    'SPT':   'Sputum',
    'SPUT':  'Sputum',
    'TRAC':  'Aspirate, Tracheal',
    'TA':    'Aspirate, Tracheal',

    // Body Fluids (specific types — generic "FLU" is rejected)
    'PLR':   'Pleural fluid (thoracentesis fld)',
    'PLRF':  'Pleural fluid (thoracentesis fld)',
    'PER':   'Peritoneal fluid/ascites',
    'PERF':  'Peritoneal fluid/ascites',
    'ASC':   'Peritoneal fluid/ascites',
    'SNV':   'Synovial fluid (joint fluid)',
    'SYNV':  'Synovial fluid (joint fluid)',
    'PERI':  'Fluid, Pericardial',
    'PCFL':  'Fluid, Pericardial',
    'ABSC':  'Abscess',
    'AMN':   'Amniotic fluid',
    'VIT':   'Vitreous fluid',
    'SAL':   'Saliva',
    'NPH':   'Swab, Nasopharyngeal',
    'NPS':   'Swab, Nasopharyngeal',
};

// Rejection patterns — these generic terms must not be used
const REJECTED_PATTERNS = [
    { pattern: /^ser\/?plas$/i, reason: 'Must specify either "Serum" or "Plasma" individually, not "Ser/Plas"' },
    { pattern: /^serum\/?plasma$/i, reason: 'Must specify either "Serum" or "Plasma" individually, not "Serum/Plasma"' },
    { pattern: /^s\/?p$/i, reason: 'Must specify either "Serum" or "Plasma" individually, not "S/P"' },
    { pattern: /^body fluid$/i, reason: 'Must specify exact fluid type, not generic "Body Fluid". See acceptable sources list.' },
    { pattern: /^flu$/i, reason: 'HL70070 code "FLU" (Body fluid, unspecified) is not accepted. Specify exact fluid type.' },
    { pattern: /^bld$/i, reason: 'HL70070 code "BLD" (Whole blood) is not an accepted specimen type for any MVD test.' },
];

/**
 * Parse an OBR-15 specimen source value.
 * Handles multiple formats:
 *   "SER"                          → code only
 *   "SER^Serum^HL70070"            → code^text^system (standard)
 *   "Serum^Serum"                  → text^text (Epic-style)
 *   "Serum"                        → free text
 *   "SERUM^Serum^L"                → code^text^local
 *
 * @param {string} raw - Raw OBR-15 value
 * @returns {{ code: string|null, text: string, system: string|null }}
 */
function parseOBR15(raw) {
    const parts = raw.split('^').map(s => s.trim());

    if (parts.length >= 3) {
        // code^text^system  (e.g., "SER^Serum^HL70070")
        return { code: parts[0] || null, text: parts[1] || parts[0], system: parts[2] || null };
    }
    if (parts.length === 2) {
        // Could be code^text or text^text
        // If first part looks like a code (all uppercase, short), treat as code^text
        if (parts[0].length <= 5 && parts[0] === parts[0].toUpperCase() && /^[A-Z]+$/.test(parts[0])) {
            return { code: parts[0], text: parts[1], system: null };
        }
        // Otherwise treat as text^text (Epic-style)
        return { code: null, text: parts[0], system: null };
    }
    // Single value — could be a code or free text
    const val = parts[0];
    if (val.length <= 5 && val === val.toUpperCase() && /^[A-Z]+$/.test(val)) {
        return { code: val, text: val, system: null };
    }
    return { code: null, text: val, system: null };
}

/**
 * Resolve an OBR-15 value to an MVD acceptable source name.
 * Tries HL70070 code mapping first, then falls through to the raw text.
 *
 * @param {string} raw - Raw OBR-15 value
 * @returns {{ resolved: string, wasCodeMapped: boolean, parsed: Object }}
 */
function resolveSpecimenSource(raw) {
    const parsed = parseOBR15(raw);

    // Try code lookup first
    if (parsed.code) {
        const codeUpper = parsed.code.toUpperCase();
        if (HL70070_TO_MVD[codeUpper]) {
            return { resolved: HL70070_TO_MVD[codeUpper], wasCodeMapped: true, parsed };
        }
    }

    // Fall through to text value
    return { resolved: parsed.text, wasCodeMapped: false, parsed };
}

/**
 * Validate a specimen source string for a given LOINC code.
 * Accepts both human-readable names and HL7v2.5.1 OBR-15 coded values.
 *
 * @param {string} loincCode - The orderable LOINC code
 * @param {string} specimenSourceString - The specimen source to validate (raw OBR-15 or text)
 * @returns {{ valid: boolean, reason?: string, suggestions?: string[], resolved?: string, wasCodeMapped?: boolean }}
 */
function validateSpecimenSource(loincCode, specimenSourceString) {
    if (!loincCode || !specimenSourceString) {
        return {
            valid: false,
            reason: 'Both loincCode and specimenSourceString are required'
        };
    }

    const specimen = specimenSourceString.trim();

    // Check global rejection patterns on the raw input first
    for (const { pattern, reason } of REJECTED_PATTERNS) {
        if (pattern.test(specimen)) {
            const loincEntry = getTestByLoincCode(loincCode);
            return {
                valid: false,
                reason,
                suggestions: loincEntry ? loincEntry.orderable.acceptableSources : undefined
            };
        }
    }

    // Resolve OBR-15 → MVD source name
    const { resolved, wasCodeMapped, parsed } = resolveSpecimenSource(specimen);

    // Check rejection patterns on the resolved name too
    for (const { pattern, reason } of REJECTED_PATTERNS) {
        if (pattern.test(resolved)) {
            const loincEntry = getTestByLoincCode(loincCode);
            return {
                valid: false,
                reason,
                suggestions: loincEntry ? loincEntry.orderable.acceptableSources : undefined
            };
        }
    }

    // Look up LOINC-specific acceptable sources
    const loincEntry = getTestByLoincCode(loincCode);
    if (!loincEntry) {
        return {
            valid: false,
            reason: `Unknown LOINC code: ${loincCode}`
        };
    }

    const { orderable } = loincEntry;
    const acceptableSources = orderable.acceptableSources;

    // If no specific sources are defined, accept any non-rejected value
    if (!acceptableSources || acceptableSources.length === 0) {
        return { valid: true, resolved, wasCodeMapped };
    }

    // Case-insensitive matching against acceptable sources
    const resolvedLower = resolved.toLowerCase();
    const isAccepted = acceptableSources.some(source =>
        source.toLowerCase() === resolvedLower
    );

    if (isAccepted) {
        return { valid: true, resolved, wasCodeMapped };
    }

    return {
        valid: false,
        reason: wasCodeMapped
            ? `HL7 code "${parsed.code}" resolved to "${resolved}", which is not accepted for LOINC ${loincCode} (${orderable.sampleType})`
            : `"${specimen}" is not an accepted specimen source for LOINC ${loincCode} (${orderable.sampleType})`,
        suggestions: acceptableSources,
        resolved,
        wasCodeMapped
    };
}

module.exports = {
    validateSpecimenSource,
    parseOBR15,
    resolveSpecimenSource,
    HL70070_TO_MVD
};

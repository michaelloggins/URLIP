/**
 * Specimen Validator Unit Tests
 */

const path = require('path');
const { loadCompendium, clearCache } = require('../../src/lib/compendiumDataAccess');
const {
    validateSpecimenSource,
    parseOBR15,
    resolveSpecimenSource,
    HL70070_TO_MVD
} = require('../../src/lib/specimenValidator');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'compendium', 'mvd-compendium-v2.0.0.json');

beforeAll(() => {
    clearCache();
    loadCompendium(DATA_PATH);
});

afterAll(() => {
    clearCache();
});

// ============================================================================
// parseOBR15 — OBR-15 format parsing
// ============================================================================

describe('parseOBR15', () => {
    test('parses standard code^text^system format', () => {
        const result = parseOBR15('SER^Serum^HL70070');
        expect(result.code).toBe('SER');
        expect(result.text).toBe('Serum');
        expect(result.system).toBe('HL70070');
    });

    test('parses code^text (no system)', () => {
        const result = parseOBR15('CSF^Cerebral spinal fluid');
        expect(result.code).toBe('CSF');
        expect(result.text).toBe('Cerebral spinal fluid');
        expect(result.system).toBeNull();
    });

    test('parses Epic-style text^text', () => {
        const result = parseOBR15('Serum^Serum');
        expect(result.code).toBeNull();
        expect(result.text).toBe('Serum');
    });

    test('parses code-only short uppercase', () => {
        const result = parseOBR15('SER');
        expect(result.code).toBe('SER');
        expect(result.text).toBe('SER');
    });

    test('parses free text (no delimiters)', () => {
        const result = parseOBR15('Urine');
        expect(result.code).toBeNull();
        expect(result.text).toBe('Urine');
    });

    test('parses code^text^local system', () => {
        const result = parseOBR15('SERUM^Serum^L');
        expect(result.code).toBe('SERUM');
        expect(result.text).toBe('Serum');
        expect(result.system).toBe('L');
    });

    test('handles extra components gracefully', () => {
        const result = parseOBR15('SER^Serum^HL70070^extra');
        expect(result.code).toBe('SER');
        expect(result.text).toBe('Serum');
        expect(result.system).toBe('HL70070');
    });
});

// ============================================================================
// resolveSpecimenSource — HL70070 code resolution
// ============================================================================

describe('resolveSpecimenSource', () => {
    test('resolves SER to Serum', () => {
        const result = resolveSpecimenSource('SER');
        expect(result.resolved).toBe('Serum');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('resolves CSF to Cerebral spinal fluid', () => {
        const result = resolveSpecimenSource('CSF');
        expect(result.resolved).toBe('Cerebral spinal fluid');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('resolves BROL to Bronchial', () => {
        const result = resolveSpecimenSource('BROL');
        expect(result.resolved).toBe('Bronchial');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('resolves SPT to Sputum', () => {
        const result = resolveSpecimenSource('SPT');
        expect(result.resolved).toBe('Sputum');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('resolves PLR to Pleural fluid', () => {
        const result = resolveSpecimenSource('PLR');
        expect(result.resolved).toBe('Pleural fluid (thoracentesis fld)');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('resolves SER^Serum^HL70070 (full coded format)', () => {
        const result = resolveSpecimenSource('SER^Serum^HL70070');
        expect(result.resolved).toBe('Serum');
        expect(result.wasCodeMapped).toBe(true);
    });

    test('falls through to text for unknown code', () => {
        const result = resolveSpecimenSource('ZZZZ^Unknown Specimen^L');
        expect(result.resolved).toBe('Unknown Specimen');
        expect(result.wasCodeMapped).toBe(false);
    });

    test('falls through to text for free text input', () => {
        const result = resolveSpecimenSource('Urine');
        expect(result.resolved).toBe('Urine');
        expect(result.wasCodeMapped).toBe(false);
    });
});

// ============================================================================
// validateSpecimenSource — human-readable names (original tests)
// ============================================================================

describe('validateSpecimenSource', () => {
    describe('Serum/Plasma validation', () => {
        // LOINC 51753-2 = Histoplasma Ag Serum/Plasma
        test('accepts "Serum" for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'Serum');
            expect(result.valid).toBe(true);
        });

        test('accepts "Plasma" for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'Plasma');
            expect(result.valid).toBe(true);
        });

        test('rejects "Ser/Plas"', () => {
            const result = validateSpecimenSource('51753-2', 'Ser/Plas');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Serum');
            expect(result.reason).toContain('Plasma');
        });

        test('rejects "Serum/Plasma"', () => {
            const result = validateSpecimenSource('51753-2', 'Serum/Plasma');
            expect(result.valid).toBe(false);
        });

        test('rejects "S/P"', () => {
            const result = validateSpecimenSource('51753-2', 'S/P');
            expect(result.valid).toBe(false);
        });

        test('provides suggestions when rejected', () => {
            const result = validateSpecimenSource('51753-2', 'Ser/Plas');
            expect(result.suggestions).toBeDefined();
            expect(result.suggestions).toContain('Serum');
            expect(result.suggestions).toContain('Plasma');
        });
    });

    describe('Urine validation', () => {
        // LOINC 48952-6 = Histoplasma Ag Urine
        test('accepts "Urine"', () => {
            const result = validateSpecimenSource('48952-6', 'Urine');
            expect(result.valid).toBe(true);
        });

        test('rejects non-urine specimen for urine LOINC', () => {
            const result = validateSpecimenSource('48952-6', 'Serum');
            expect(result.valid).toBe(false);
        });
    });

    describe('BAL/Lower Respiratory validation', () => {
        // LOINC 95073-3 = Histoplasma Ag BAL
        test('accepts "Bronchial"', () => {
            const result = validateSpecimenSource('95073-3', 'Bronchial');
            expect(result.valid).toBe(true);
        });

        test('accepts "Bronchial Wash"', () => {
            const result = validateSpecimenSource('95073-3', 'Bronchial Wash');
            expect(result.valid).toBe(true);
        });

        test('accepts "Lavage, Bronchial"', () => {
            const result = validateSpecimenSource('95073-3', 'Lavage, Bronchial');
            expect(result.valid).toBe(true);
        });
    });

    describe('Body Fluid validation', () => {
        // LOINC 57766-8 = Histoplasma Ag Body Fluid
        test('rejects generic "Body Fluid"', () => {
            const result = validateSpecimenSource('57766-8', 'Body Fluid');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Body Fluid');
        });

        test('accepts specific fluid type "Fluid, Chest"', () => {
            const result = validateSpecimenSource('57766-8', 'Fluid, Chest');
            expect(result.valid).toBe(true);
        });

        test('accepts "Pleural fluid (thoracentesis fld)"', () => {
            const result = validateSpecimenSource('57766-8', 'Pleural fluid (thoracentesis fld)');
            expect(result.valid).toBe(true);
        });

        test('accepts "Synovial fluid (Joint fluid)"', () => {
            const result = validateSpecimenSource('57766-8', 'Synovial fluid (Joint fluid)');
            expect(result.valid).toBe(true);
        });
    });

    describe('CSF validation', () => {
        // LOINC 51754-0 = Histoplasma Ag CSF
        test('accepts "Cerebral spinal fluid"', () => {
            const result = validateSpecimenSource('51754-0', 'Cerebral spinal fluid');
            expect(result.valid).toBe(true);
        });
    });

    describe('Case insensitivity', () => {
        test('accepts "serum" (lowercase) for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'serum');
            expect(result.valid).toBe(true);
        });

        test('accepts "URINE" (uppercase) for Urine LOINC', () => {
            const result = validateSpecimenSource('48952-6', 'URINE');
            expect(result.valid).toBe(true);
        });
    });

    describe('PCR specimen validation', () => {
        // LOINC 95917-1 = Histoplasma PCR Lower Respiratory
        test('accepts "Bronchial" for PCR Lower Respiratory', () => {
            const result = validateSpecimenSource('95917-1', 'Bronchial');
            expect(result.valid).toBe(true);
        });

        test('accepts "Sputum" for PCR Lower Respiratory', () => {
            const result = validateSpecimenSource('95917-1', 'Sputum');
            expect(result.valid).toBe(true);
        });

        test('accepts "Aspirate, Tracheal" for PCR Lower Respiratory', () => {
            const result = validateSpecimenSource('95917-1', 'Aspirate, Tracheal');
            expect(result.valid).toBe(true);
        });
    });

    // ========================================================================
    // HL7v2.5.1 OBR-15 coded value tests
    // ========================================================================

    describe('HL70070 code validation — Serum/Plasma LOINCs', () => {
        // LOINC 51753-2 = Histoplasma Ag Serum/Plasma
        test('accepts HL7 code "SER" for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'SER');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Serum');
            expect(result.wasCodeMapped).toBe(true);
        });

        test('accepts "SER^Serum^HL70070" (full coded format)', () => {
            const result = validateSpecimenSource('51753-2', 'SER^Serum^HL70070');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Serum');
            expect(result.wasCodeMapped).toBe(true);
        });

        test('accepts "PLAS" for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'PLAS');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Plasma');
        });

        test('accepts "Serum^Serum" (Epic-style)', () => {
            const result = validateSpecimenSource('51753-2', 'Serum^Serum');
            expect(result.valid).toBe(true);
        });
    });

    describe('HL70070 code validation — Urine LOINCs', () => {
        // LOINC 48952-6 = Histoplasma Ag Urine
        test('accepts "UR" for Urine LOINC', () => {
            const result = validateSpecimenSource('48952-6', 'UR');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Urine');
            expect(result.wasCodeMapped).toBe(true);
        });

        test('accepts "UR^Urine^HL70070"', () => {
            const result = validateSpecimenSource('48952-6', 'UR^Urine^HL70070');
            expect(result.valid).toBe(true);
        });
    });

    describe('HL70070 code validation — CSF LOINCs', () => {
        // LOINC 51754-0 = Histoplasma Ag CSF
        test('accepts "CSF" code for CSF LOINC', () => {
            const result = validateSpecimenSource('51754-0', 'CSF');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Cerebral spinal fluid');
            expect(result.wasCodeMapped).toBe(true);
        });

        test('accepts "CSF^Cerebral spinal fluid^HL70070"', () => {
            const result = validateSpecimenSource('51754-0', 'CSF^Cerebral spinal fluid^HL70070');
            expect(result.valid).toBe(true);
        });
    });

    describe('HL70070 code validation — BAL/Lower Respiratory LOINCs', () => {
        // LOINC 95073-3 = Histoplasma Ag BAL
        test('accepts "BROL" for BAL LOINC', () => {
            const result = validateSpecimenSource('95073-3', 'BROL');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Bronchial');
        });

        test('accepts "BAL" (common alias) for BAL LOINC', () => {
            const result = validateSpecimenSource('95073-3', 'BAL');
            expect(result.valid).toBe(true);
        });

        // LOINC 95917-1 = Histoplasma PCR Lower Respiratory
        test('accepts "SPT" for PCR Lower Respiratory', () => {
            const result = validateSpecimenSource('95917-1', 'SPT');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Sputum');
        });

        test('accepts "TRAC" for PCR Lower Respiratory', () => {
            const result = validateSpecimenSource('95917-1', 'TRAC');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Aspirate, Tracheal');
        });

        test('accepts "SPT^Sputum^HL70070" for PCR', () => {
            const result = validateSpecimenSource('95917-1', 'SPT^Sputum^HL70070');
            expect(result.valid).toBe(true);
        });
    });

    describe('HL70070 code validation — Body Fluid LOINCs', () => {
        // LOINC 57766-8 = Histoplasma Ag Body Fluid
        test('rejects "FLU" (generic body fluid code)', () => {
            const result = validateSpecimenSource('57766-8', 'FLU');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('FLU');
        });

        test('accepts "PLR" (Pleural fluid) for Body Fluid LOINC', () => {
            const result = validateSpecimenSource('57766-8', 'PLR');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Pleural fluid (thoracentesis fld)');
        });

        test('accepts "SNV" (Synovial fluid) for Body Fluid LOINC', () => {
            const result = validateSpecimenSource('57766-8', 'SNV');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Synovial fluid (joint fluid)');
        });

        test('accepts "ASC" (Ascites) for Body Fluid LOINC', () => {
            const result = validateSpecimenSource('57766-8', 'ASC');
            expect(result.valid).toBe(true);
            expect(result.resolved).toBe('Peritoneal fluid/ascites');
        });

        test('accepts "PLR^Pleural fluid^HL70070"', () => {
            const result = validateSpecimenSource('57766-8', 'PLR^Pleural fluid^HL70070');
            expect(result.valid).toBe(true);
        });
    });

    describe('HL70070 cross-validation — wrong specimen for LOINC', () => {
        test('rejects "SER" for Urine-only LOINC', () => {
            const result = validateSpecimenSource('48952-6', 'SER');
            expect(result.valid).toBe(false);
            expect(result.wasCodeMapped).toBe(true);
            expect(result.resolved).toBe('Serum');
            expect(result.reason).toContain('HL7 code');
        });

        test('rejects "UR" for Serum/Plasma LOINC', () => {
            const result = validateSpecimenSource('51753-2', 'UR');
            expect(result.valid).toBe(false);
            expect(result.resolved).toBe('Urine');
        });

        test('rejects "BLD" (Whole blood)', () => {
            const result = validateSpecimenSource('51753-2', 'BLD');
            expect(result.valid).toBe(false);
        });
    });

    describe('Edge cases', () => {
        test('returns invalid for unknown LOINC', () => {
            const result = validateSpecimenSource('00000-0', 'Serum');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Unknown LOINC');
        });

        test('returns invalid for missing parameters', () => {
            const result = validateSpecimenSource('', '');
            expect(result.valid).toBe(false);
        });

        test('trims whitespace from specimen source', () => {
            const result = validateSpecimenSource('48952-6', '  Urine  ');
            expect(result.valid).toBe(true);
        });

        test('handles unknown HL7 code gracefully (falls to text)', () => {
            const result = validateSpecimenSource('48952-6', 'ZZZZ^Urine^L');
            expect(result.valid).toBe(true);
            expect(result.wasCodeMapped).toBe(false);
        });
    });
});

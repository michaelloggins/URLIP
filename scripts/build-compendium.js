#!/usr/bin/env node
/**
 * Build Compendium Script
 *
 * Reads the Assay LOINC List Excel file and HL7 spec data to produce
 * an enriched compendium JSON with 18 test groups and 42 orderable LOINCs.
 *
 * Usage: node scripts/build-compendium.js
 *
 * Outputs:
 *   data/compendium/mvd-compendium-v2.0.0.json
 *   data/compendium/specimen-source-rules.json
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const {
    PERFORMING_ORGANIZATION,
    categorizeTest,
    normalizeCptCode,
    parseResultComponents,
    parseAcceptableSources,
    validateCompendiumTest,
    createAuditFields
} = require('../src/models/compendiumModels');

// ============================================================================
// Configuration
// ============================================================================

const EXCEL_PATH = path.join(__dirname, '..', 'docs', 'Assay LOINC List for Clients - PFP Full (1).xlsx');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'compendium');
const COMPENDIUM_OUTPUT = path.join(OUTPUT_DIR, 'mvd-compendium-v2.0.0.json');
const SPECIMEN_RULES_OUTPUT = path.join(OUTPUT_DIR, 'specimen-source-rules.json');

// MVD Test Code mapping derived from HL7 spec (test name → MVD code)
const MVD_TEST_CODE_MAP = {
    'Aspergillus Galactomannan EIA': '309',
    'MVista® Histoplasma Ag Quantitative EIA': '310',
    'MVista® Coccidioides Ag Quantitative EIA': '315',
    'MVista® Blastomyces Ag Quantitative EIA': '316',
    '(1-3)-Beta-D-Glucan Colorimetric Assay': '317',
    'Cryptococcal Antigen by Latex Agglutination': '319',
    'Coccidioides Antibody by Immunodiffusion': '320',
    'Coccidioides Antibody by Immunodiffu on': '320',  // typo in source Excel
    'Histoplasma Antibody by Immunodiffusion': '321',
    'Blastomyces Antibody by Immunodiffusion': '322',
    'Aspergillus Antibody by Immunodiffusion': '324',
    'MVista® Coccidioides Antibody IgG, IgM EIA': '325',
    'MVista® Histoplasma Antibody IgG, IgM EIA': '326',
    'MVista® Blastomyces Antibody IgG EIA': '331',
    'MVista® Pneumocystis DNA, PCR': '402',
    'MVista® Histoplasma DNA, PCR': '403',
    'MVista® Blastomyces DNA, PCR': '404',
    'MVista® Coccidioides DNA, PCR': '405',
    'MVista® Pulmonary Fungal PCR Panel': '1000'
};

// ============================================================================
// Main Build
// ============================================================================

function main() {
    console.log('Building MVD Compendium v2.0.0...\n');

    // 1. Read Excel
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`ERROR: Excel file not found: ${EXCEL_PATH}`);
        process.exit(1);
    }

    const wb = XLSX.readFile(EXCEL_PATH);
    const sheet1Data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const sheet2Data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { header: 1 });

    const buildRows = sheet1Data.slice(1); // skip header
    const sourceRows = sheet2Data.slice(1);

    console.log(`Sheet 1 (Build Info): ${buildRows.length} rows`);
    console.log(`Sheet 2 (Acceptable Sources): ${sourceRows.length} rows`);

    // 2. Build acceptable sources lookup by LOINC
    const acceptableSourcesByLoinc = {};
    for (const row of sourceRows) {
        const loinc = String(row[0] || '').trim();
        const sourcesText = row[3] || '';
        if (loinc) {
            acceptableSourcesByLoinc[loinc] = parseAcceptableSources(sourcesText);
        }
    }

    // 3. Build flat orderable LOINC records
    const flatRecords = buildRows.map(row => {
        const orderLoinc = String(row[0] || '').trim();
        const testName = String(row[1] || '').trim();
        const shortName = String(row[2] || '').trim();
        const sampleType = String(row[3] || '').trim();
        const tat = String(row[4] || '').trim();
        const sampleHandling = String(row[5] || '').trim();
        const sampleStorage = String(row[6] || '').trim();
        const cptRaw = row[7];
        const resultLoincRaw = String(row[8] || '');
        const resultNameRaw = String(row[9] || '');
        const referenceRange = String(row[10] || '').trim();
        const resultUnits = String(row[11] || '').trim();

        return {
            orderLoinc,
            testName,
            shortName,
            sampleType,
            tat,
            sampleHandling,
            sampleStorage,
            cptCodes: normalizeCptCode(cptRaw),
            resultComponents: parseResultComponents(resultLoincRaw, resultNameRaw, referenceRange, resultUnits),
            acceptableSources: acceptableSourcesByLoinc[orderLoinc] || [],
            referenceRange,
            resultUnits: resultUnits === 'no units' ? '' : resultUnits
        };
    });

    console.log(`\nFlat orderable records: ${flatRecords.length}`);

    // 4. Group into tests by test name
    const testGroups = new Map();
    for (const record of flatRecords) {
        const normalizedName = normalizeTestName(record.testName);
        if (!testGroups.has(normalizedName)) {
            testGroups.set(normalizedName, {
                originalName: record.testName,
                records: []
            });
        }
        testGroups.get(normalizedName).records.push(record);
    }

    console.log(`Test groups: ${testGroups.size}`);

    // 5. Build CompendiumTest objects
    const tests = [];
    for (const [normalizedName, group] of testGroups) {
        const firstRecord = group.records[0];
        const { category, methodology, organism } = categorizeTest(firstRecord.testName);

        // Look up MVD test code
        const mvdTestCode = lookupMvdTestCode(firstRecord.testName);
        if (!mvdTestCode) {
            console.warn(`WARNING: No MVD test code found for: "${firstRecord.testName}"`);
        }

        const auditFields = createAuditFields('Active', 'system');

        const test = {
            mvdTestCode: mvdTestCode || 'UNKNOWN',
            testName: cleanTestName(firstRecord.testName),
            shortName: firstRecord.shortName,
            category,
            methodology,
            organism,
            cptCodes: firstRecord.cptCodes,
            tat: firstRecord.tat,
            ...auditFields,
            orderableLoincs: group.records.map(r => ({
                orderLoincCode: r.orderLoinc,
                orderLoincName: r.testName,
                shortName: r.shortName,
                sampleType: r.sampleType,
                sampleHandling: r.sampleHandling,
                sampleStorage: r.sampleStorage,
                acceptableSources: r.acceptableSources,
                referenceRange: r.referenceRange,
                resultUnits: r.resultUnits,
                resultComponents: r.resultComponents,
                ...createAuditFields('Active', 'system')
            }))
        };

        const validation = validateCompendiumTest(test);
        if (!validation.valid) {
            console.warn(`WARNING: Validation errors for ${test.testName}:`, validation.errors);
        }

        tests.push(test);
    }

    // Sort by MVD test code (numeric)
    tests.sort((a, b) => {
        const numA = parseInt(a.mvdTestCode, 10) || 9999;
        const numB = parseInt(b.mvdTestCode, 10) || 9999;
        return numA - numB;
    });

    // 6. Build specimen source rules from HL7 spec
    const specimenSourceRules = buildSpecimenSourceRules();

    // 7. Build envelope
    const totalLoincs = tests.reduce((sum, t) => sum + t.orderableLoincs.length, 0);

    const envelope = {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
        generatedFrom: 'Assay LOINC List for Clients - PFP Full.xlsx + HL7 Connection.2025Sep23.pdf',
        performingOrganization: PERFORMING_ORGANIZATION,
        specimenSourceRules,
        summary: {
            totalTests: tests.length,
            totalOrderableLoincs: totalLoincs,
            categories: [...new Set(tests.map(t => t.category))],
            organisms: [...new Set(tests.map(t => t.organism))]
        },
        tests
    };

    // 8. Write output
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(COMPENDIUM_OUTPUT, JSON.stringify(envelope, null, 2));
    fs.writeFileSync(SPECIMEN_RULES_OUTPUT, JSON.stringify(specimenSourceRules, null, 2));

    // 9. Summary
    console.log('\n=== Build Summary ===');
    console.log(`Tests: ${tests.length}`);
    console.log(`Orderable LOINCs: ${totalLoincs}`);
    console.log(`Categories: ${envelope.summary.categories.join(', ')}`);
    console.log(`\nOutput files:`);
    console.log(`  ${COMPENDIUM_OUTPUT}`);
    console.log(`  ${SPECIMEN_RULES_OUTPUT}`);

    // Verify expected counts
    if (tests.length !== 18) {
        console.warn(`\nWARNING: Expected 18 test groups, got ${tests.length}`);
    }
    if (totalLoincs !== 42) {
        console.warn(`\nWARNING: Expected 42 orderable LOINCs, got ${totalLoincs}`);
    }

    console.log('\nBuild complete.');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize test name for grouping (strip trademark symbols, trailing spaces, etc.)
 */
function normalizeTestName(name) {
    return name
        .replace(/®/g, '')
        .replace(/\u00a0/g, ' ')  // non-breaking space
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Clean test name for display (preserve MVista® but fix whitespace and known typos)
 */
function cleanTestName(name) {
    return name
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/Immunodiffu\s+on/g, 'Immunodiffusion')  // typo in source Excel
        .trim();
}

/**
 * Look up MVD test code by test name.
 * Handles the leading space in "(1-3)-Beta-D-Glucan" and trailing spaces/nbsp.
 */
function lookupMvdTestCode(testName) {
    const cleaned = cleanTestName(testName);
    // Direct match
    if (MVD_TEST_CODE_MAP[cleaned]) return MVD_TEST_CODE_MAP[cleaned];

    // Try normalized matching
    for (const [key, code] of Object.entries(MVD_TEST_CODE_MAP)) {
        const normalizedKey = key.replace(/\s+/g, ' ').trim().toLowerCase();
        const normalizedName = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
        if (normalizedKey === normalizedName) return code;
    }

    // Try partial match for names with slight variations (e.g., "Immunodiffu on" typo)
    const nameLower = cleaned.toLowerCase();
    for (const [key, code] of Object.entries(MVD_TEST_CODE_MAP)) {
        const keyLower = key.toLowerCase();
        // Match if the key is a substantial substring
        if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) return code;
    }

    return null;
}

/**
 * Build specimen source validation rules from HL7 spec.
 */
function buildSpecimenSourceRules() {
    return {
        serumPlasma: {
            description: 'Serum/Plasma specimens must specify type individually',
            rejected: ['Ser/Plas', 'Serum/Plasma', 'S/P'],
            accepted: ['Serum', 'Plasma'],
            rule: 'Must specify either Serum or Plasma individually. Do not use combined terms.'
        },
        bronchoalveolarLavage: {
            description: 'BAL/Lower respiratory specimen source formats',
            accepted: ['Bronchial', 'Bronchial Wash', 'Lavage, Bronchial', 'Aspirate, Tracheal', 'Sputum'],
            rule: 'Use specific BAL-type source names. Generic terms not accepted.'
        },
        bodyFluid: {
            description: 'Body fluid specimens must use specific fluid type',
            rejected: ['Body Fluid', 'Body fluid', 'Fluid'],
            accepted: [
                'Abscess', 'Amniotic fluid', 'Body fluid, unsp',
                'Drainage, Tube', 'Fluid, Abdomen', 'Fluid, Cerebral Cyst',
                'Fluid, Chest', 'Fluid, Corpus Vitreum', 'Fluid, Cyst',
                'Fluid, Flank', 'Fluid, Hepatic', 'Fluid, Hilum',
                'Fluid, Hydrocele', 'Fluid, JP Drainage', 'Fluid, Knee Joint',
                'Fluid, joint', 'Fluid, Kidney', 'Fluid, Liver',
                'Fluid, Lymph Node', 'Fluid, Mass', 'Fluid, Maxillary Sinus',
                'Fluid, Mediastinal', 'Fluid, Neck Mass', 'Fluid, Other',
                'Fluid, Pancreatic Cyst', 'Fluid, Paracentesis', 'Fluid, Pelvic',
                'Fluid, Pericardial', 'Fluid, Peripheral', 'Fluid, Pneumocystis',
                'Fluid, Prostate', 'Fluid, Respiratory', 'Fluid, Trochanter',
                'Fluid, Ventricular', 'Fluid, Wrist',
                'Flush, Esophagus', 'Lavage, Peritoneal',
                'Pancreatic fluid', 'Peritoneal fluid/ascites',
                'Pleural fluid (thoracentesis fld)', 'Saliva',
                'Swab, Nasopharyngeal', 'Synovial fluid (joint fluid)',
                'Tracheal Lavage', 'Vitreous fluid', 'Wash',
                'Wash, Bladder', 'Wash, Lymph node', 'Wash, Tracheal'
            ],
            rule: 'Do NOT use generic "Body Fluid". Specify the exact fluid type from the accepted list.'
        },
        csf: {
            description: 'Cerebral Spinal Fluid specimen source',
            accepted: ['Cerebral spinal fluid', 'CSF'],
            rule: 'Use "Cerebral spinal fluid" or "CSF".'
        },
        urine: {
            description: 'Urine specimen source',
            accepted: ['Urine'],
            rule: 'Use "Urine".'
        }
    };
}

// Run
main();

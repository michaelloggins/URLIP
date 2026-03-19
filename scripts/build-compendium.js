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

// Veterinary test definitions (from MiraVista-Veterinary-Test-Menu.pdf)
// These don't have LOINCs — identified by MVD test code only.
const VET_TESTS = [
    // ANTIGEN — shared codes, different specimen requirements
    { mvdTestCode: '310', species: 'All', testName: 'MVista® Histoplasma Antigen EIA', shortName: 'Histoplasma Ag (Vet)', category: 'Antigen', methodology: 'EIA', organism: 'Histoplasma capsulatum',
      tat: '12-24 hours', specimens: ['Urine', 'Serum', 'Plasma', 'CSF', 'BAL'], volume: '0.8 mL',
      handling: 'Specimen: Urine, serum, plasma, CSF, BAL. Anticoagulant: Heparin, EDTA, NaCit. Container: Serum in separator or transfer tube. Urine, CSF and BAL in a leak-proof container.',
      storage: 'Histo: 2 weeks RT/RF, Indefinitely FZ. Shipping: Overnight or 2nd day - ambient.' },
    { mvdTestCode: '316', species: 'All', testName: 'MVista® Blastomyces Antigen EIA', shortName: 'Blastomyces Ag (Vet)', category: 'Antigen', methodology: 'EIA', organism: 'Blastomyces dermatitidis',
      tat: '8-24 hours', specimens: ['Urine', 'Serum', 'Plasma', 'CSF', 'BAL'], volume: '0.8 mL',
      handling: 'Specimen: Urine, serum, plasma, CSF, BAL. Anticoagulant: Heparin, EDTA, NaCit. Container: Serum in separator or transfer tube. Urine, CSF and BAL in a leak-proof container.',
      storage: 'Blasto: 2 weeks RT/RF, 60 days FZ. Shipping: Overnight or 2nd day - ambient.' },
    { mvdTestCode: '315', species: 'All', testName: 'MVista® Coccidioides Antigen EIA', shortName: 'Coccidioides Ag (Vet)', category: 'Antigen', methodology: 'EIA', organism: 'Coccidioides immitis',
      tat: '12-24 hours', specimens: ['Urine', 'Serum', 'Plasma', 'CSF', 'BAL'], volume: '0.8 mL',
      handling: 'Specimen: Urine, serum, plasma, CSF, BAL. Anticoagulant: Heparin, EDTA, NaCit. Container: Serum in separator or transfer tube. Urine, CSF and BAL in a leak-proof container.',
      storage: 'Cocci: 28 days RT/RF, 60 days FZ. Shipping: Overnight or 2nd day - ambient.' },
    { mvdTestCode: '309', species: 'All', testName: 'Aspergillus Antigen EIA (Vet)', shortName: 'Galactomannan Ag (Vet)', category: 'Antigen', methodology: 'EIA', organism: 'Aspergillus sp',
      tat: '12-24 hours', specimens: ['Urine', 'Serum', 'Plasma', 'CSF', 'BAL'], volume: '0.4 mL',
      handling: 'Specimen: Urine, serum, plasma, CSF, BAL. Anticoagulant: EDTA. Container: Serum in separator or transfer tube.',
      storage: 'Serum/BAL: RT=48hrs, RF=5 days, FZ=5 months. CSF: RT=30 days, RF=30 days, FZ=60 days. Shipping: Overnight or 2nd day - with cold pack.' },
    { mvdTestCode: '317', species: 'All', testName: 'β-D-Glucan Antigen Colorimetric Assay (Vet)', shortName: 'Beta-D-Glucan (Vet)', category: 'Antigen', methodology: 'Colorimetric', organism: 'Pan-fungal',
      tat: '12-24 hours', specimens: ['Serum', 'CSF'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF. Container: Serum in separator or sterile plastic tube.',
      storage: 'RF=15 days, FZ=27 days. Shipping: Overnight - with cold pack.' },
    { mvdTestCode: '319', species: 'All', testName: 'Cryptococcus Antigen Latex Agglutination (Vet)', shortName: 'Cryptococcus Ag (Vet)', category: 'Antigen', methodology: 'Latex Agglutination', organism: 'Cryptococcus neoformans',
      tat: '12-24 hours', specimens: ['Serum', 'CSF'], volume: '0.25 mL',
      handling: 'Specimen: Serum, CSF. Container: Serum in separator or transfer tube. CSF in leak-proof container.',
      storage: 'RT=7 days, RF=2 months, FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.' },

    // ANTIBODY — shared codes
    { mvdTestCode: '320', species: 'All', testName: 'Coccidioides Antibody by Immunodiffusion (Vet)', shortName: 'Coccidioides Ab ID (Vet)', category: 'Antibody', methodology: 'Immunodiffusion', organism: 'Coccidioides immitis',
      tat: '72 hours from set up', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight - with cold pack.' },
    { mvdTestCode: '321', species: 'All', testName: 'Histoplasma Antibody by Immunodiffusion (Vet)', shortName: 'Histoplasma Ab ID (Vet)', category: 'Antibody', methodology: 'Immunodiffusion', organism: 'Histoplasma capsulatum',
      tat: '72 hours from set up', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight - with cold pack.' },
    { mvdTestCode: '322', species: 'All', testName: 'Blastomyces Antibody by Immunodiffusion (Vet)', shortName: 'Blastomyces Ab ID (Vet)', category: 'Antibody', methodology: 'Immunodiffusion', organism: 'Blastomyces dermatitidis',
      tat: '72 hours from set up', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight - with cold pack.' },
    { mvdTestCode: '324', species: 'All', testName: 'Aspergillus Antibody by Immunodiffusion (Vet)', shortName: 'Aspergillus Ab ID (Vet)', category: 'Antibody', methodology: 'Immunodiffusion', organism: 'Aspergillus sp',
      tat: '72 hours from set up', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight - with cold pack.' },

    // ANTIBODY — vet-only
    { mvdTestCode: '327', species: 'Canine', testName: 'MVista® Histoplasma Canine IgG Antibody EIA', shortName: 'Histo Canine IgG Ab', category: 'Antibody', methodology: 'EIA', organism: 'Histoplasma capsulatum',
      tat: '24-48 hours', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Anticoagulant: Heparin, EDTA, NaCit. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.' },
    { mvdTestCode: '328', species: 'Feline', testName: 'MVista® Histoplasma Feline IgG Antibody EIA', shortName: 'Histo Feline IgG Ab', category: 'Antibody', methodology: 'EIA', organism: 'Histoplasma capsulatum',
      tat: '24-48 hours', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Anticoagulant: Heparin, EDTA, NaCit. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.' },
    { mvdTestCode: '329', species: 'Canine', testName: 'MVista® Coccidioides Canine IgG Antibody EIA', shortName: 'Cocci Canine IgG Ab', category: 'Antibody', methodology: 'EIA', organism: 'Coccidioides immitis',
      tat: '24-48 hours', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Anticoagulant: Heparin, EDTA, NaCit. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.' },
    { mvdTestCode: '330', species: 'Canine', testName: 'MVista® Blastomyces Canine IgG Antibody EIA', shortName: 'Blasto Canine IgG Ab', category: 'Antibody', methodology: 'EIA', organism: 'Blastomyces dermatitidis',
      tat: '24-48 hours', specimens: ['Serum', 'CSF', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF, plasma. Anticoagulant: Heparin, EDTA, NaCit. Container: Separator or transfer tube.',
      storage: 'RT=28 days, RF=6 months, FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.' },
    { mvdTestCode: '332', species: 'Canine and Feline', testName: 'MVista® Pythium IgG Antibody EIA', shortName: 'Pythium IgG Ab', category: 'Antibody', methodology: 'EIA', organism: 'Pythium insidiosum',
      tat: '12-24 hours', specimens: ['Serum', 'Plasma'], volume: '0.25 mL',
      handling: 'Specimen: Serum, plasma. Anticoagulant: Heparin, EDTA, NaCit. Container: Separator or transfer tube.',
      storage: 'RT=30 days, RF=30 days, FZ=30 days. Shipping: Overnight or 2nd day - ambient or with cold pack.' },

    // THERAPEUTIC DRUG MONITORING — vet-only
    { mvdTestCode: '312', species: 'All', testName: 'MVista® Itraconazole Bioassay', shortName: 'Itraconazole Level', category: 'Therapeutic Drug Monitoring', methodology: 'Bioassay', organism: 'N/A',
      tat: 'Reported on Thursdays', specimens: ['Serum', 'CSF'], volume: '0.25 mL',
      handling: 'Specimen: Serum. Uncommon: CSF. Container: Separator or transfer tube.',
      storage: 'RT=10 days, RF=10 days, FZ=Indefinite. Shipping: Overnight or 2nd day - with cold pack.' },

    // PCR — shared codes
    { mvdTestCode: '403', species: 'All', testName: 'MVista® Histoplasma DNA, PCR (Vet)', shortName: 'Histo PCR (Vet)', category: 'PCR', methodology: 'PCR', organism: 'Histoplasma capsulatum',
      tat: '24-48 hours', specimens: ['BAL', 'Cavitary Effusion', 'Tracheal aspirate', 'Bronchial wash'], volume: '0.5 mL',
      handling: 'Specimen: BAL or Cavitary Effusion. Uncommon: Tracheal aspirate or bronchial wash. Container: Transfer tube.',
      storage: 'RT=30 days, RF=30 days, FZ=30 days. Shipping: Dry ice, frozen ice packs, or ambient.' },
    { mvdTestCode: '404', species: 'All', testName: 'MVista® Blastomyces DNA, PCR (Vet)', shortName: 'Blasto PCR (Vet)', category: 'PCR', methodology: 'PCR', organism: 'Blastomyces dermatitidis',
      tat: '24-48 hours', specimens: ['BAL', 'Cavitary Effusion', 'Tracheal aspirate', 'Bronchial wash'], volume: '0.5 mL',
      handling: 'Specimen: BAL or Cavitary Effusion. Uncommon: Tracheal aspirate or bronchial wash. Container: Transfer tube.',
      storage: 'RT=30 days, RF=30 days, FZ=30 days. Shipping: Dry ice, frozen ice packs, or ambient.' },
    { mvdTestCode: '405', species: 'All', testName: 'MVista® Coccidioides DNA, PCR (Vet)', shortName: 'Cocci PCR (Vet)', category: 'PCR', methodology: 'PCR', organism: 'Coccidioides immitis',
      tat: '24-48 hours', specimens: ['BAL', 'Cavitary Effusion', 'Tracheal aspirate', 'Bronchial wash'], volume: '0.5 mL',
      handling: 'Specimen: BAL or Cavitary Effusion. Uncommon: Tracheal aspirate or bronchial wash. Container: Transfer tube.',
      storage: 'RT=30 days, RF=30 days, FZ=30 days. Shipping: Dry ice, frozen ice packs, or ambient.' },

    // PCR — vet-only (different code from human 402)
    { mvdTestCode: '406', species: 'Canine', testName: 'MVista® Pneumocystis Canine DNA, PCR', shortName: 'Pneumocystis Canine PCR', category: 'PCR', methodology: 'PCR', organism: 'Pneumocystis canis',
      tat: '24-48 hours', specimens: ['BAL', 'Tracheal aspirate', 'Bronchial wash'], volume: '0.5 mL',
      handling: 'Specimen: BAL. Uncommon: Tracheal aspirate or bronchial wash. Container: Transfer tube.',
      storage: 'RT=21 days, RF=21 days, FZ=30 days. Shipping: Dry ice, frozen ice packs, or ambient.' },

    // PANELS — vet-only
    { mvdTestCode: '900', species: 'Feline', testName: 'MVista® Feline Fungal Panel, Extended', shortName: 'Feline Panel Ext', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '1 mL each urine and serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '319', '320', '309'] },
    { mvdTestCode: '901', species: 'Canine', testName: 'MVista® Canine Fungal Panel West, Extended', shortName: 'Canine Panel West Ext', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-2 days', specimens: ['Urine', 'Serum'], volume: '1 mL each urine and serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '329', '309', '319'] },
    { mvdTestCode: '902', species: 'Canine', testName: 'MVista® Canine Fungal Panel East, Extended', shortName: 'Canine Panel East Ext', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-2 days', specimens: ['Urine', 'Serum'], volume: '1 mL each urine and serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '329', '309', '319'] },
    { mvdTestCode: '903', species: 'Feline', testName: 'MVista® Feline Fungal Panel', shortName: 'Feline Panel', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 7 days serum; RF=2 weeks; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '319', '320'] },
    { mvdTestCode: '904', species: 'Canine', testName: 'MVista® Canine Fungal Panel West', shortName: 'Canine Panel West', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-2 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '329', '309'] },
    { mvdTestCode: '905', species: 'Canine', testName: 'MVista® Canine Fungal Panel East', shortName: 'Canine Panel East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-2 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '319', '309'] },
    { mvdTestCode: '906', species: 'All', testName: 'MVista® Pulmonary Fungal PCR Panel (Vet)', shortName: 'Pulm Fungal PCR Panel (Vet)', category: 'Panel', methodology: 'PCR', organism: 'Multiple',
      tat: '24-48 hours', specimens: ['BAL', 'Cavitary Effusion', 'Tracheal aspirate', 'Bronchial wash'], volume: '0.5 mL',
      handling: 'Specimen: BAL or Cavitary Effusion. Uncommon: Tracheal aspirate or bronchial wash. Container: Transfer tube.',
      storage: 'RT=21 days, RF=21 days, FZ=30 days. Shipping: Dry ice, frozen ice packs, or ambient.',
      componentTests: ['403', '404', '405', '406'] },
    { mvdTestCode: '907', species: 'Feline', testName: 'MVista® Feline Fungal Panel East', shortName: 'Feline Panel East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['319', '310', '309'] },
    { mvdTestCode: '908', species: 'Canine', testName: 'MVista® Canine Fungal Panel, Comprehensive', shortName: 'Canine Comprehensive', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 1.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '309', '319', '329', '327', '330', '320'] },
    { mvdTestCode: '909', species: 'Feline', testName: 'MVista® Feline Fungal Panel, Comprehensive', shortName: 'Feline Comprehensive', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 1.25 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '309', '319', '328', '320'] },
    { mvdTestCode: '910', species: 'Canine', testName: 'MVista® Canine Blastomycosis Panel', shortName: 'Canine Blasto Panel', category: 'Panel', methodology: 'Multiple', organism: 'Blastomyces dermatitidis',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks; RF=2 weeks; FZ=2 months urine, indefinite serum. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '330'] },
    { mvdTestCode: '911', species: 'Canine', testName: 'MVista® Canine Histoplasmosis Panel', shortName: 'Canine Histo Panel', category: 'Panel', methodology: 'Multiple', organism: 'Histoplasma capsulatum',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks; RF=2 weeks; FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '327'] },
    { mvdTestCode: '912', species: 'Canine', testName: 'MVista® Canine Coccidioidomycosis Panel', shortName: 'Canine Cocci Panel', category: 'Panel', methodology: 'Multiple', organism: 'Coccidioides immitis',
      tat: '1-6 days', specimens: ['Serum'], volume: '0.5 mL',
      handling: 'Specimen: Serum. Container: Separator or transfer tube.',
      storage: 'RT=28 days; RF=6 months; FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['329', '320'] },
    { mvdTestCode: '913', species: 'Feline', testName: 'MVista® Feline Histoplasmosis Panel', shortName: 'Feline Histo Panel', category: 'Panel', methodology: 'Multiple', organism: 'Histoplasma capsulatum',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks; RF=2 weeks; FZ=indefinite. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '328'] },
    { mvdTestCode: '914', species: 'Canine and Feline', testName: 'MVista® Canine & Feline Mold-Hyphae Panel', shortName: 'Mold-Hyphae Panel', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Serum'], volume: '1 mL',
      handling: 'Specimen: Serum. Container: Separator or transfer tube.',
      storage: 'RF=5 days; FZ=1 month. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['309', '317', '332'] },
    { mvdTestCode: '915', species: 'Canine and Feline', testName: 'MVista® Canine & Feline Fungal Nasal Panel', shortName: 'Fungal Nasal Panel', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Serum'], volume: '0.5 mL',
      handling: 'Specimen: Serum. Container: Separator or transfer tube.',
      storage: 'RT=7 days; RF=28 days; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['319', '324'] },
    { mvdTestCode: '916', species: 'Canine', testName: 'MVista® Canine Fungal GI Panel', shortName: 'Canine GI Panel', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 28 days serum; RF=2 weeks urine, 30 days serum; FZ=30 days. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '327', '332'] },
    { mvdTestCode: '917', species: 'Feline', testName: 'MVista® Feline Fungal GI Panel', shortName: 'Feline GI Panel', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 28 days serum; RF=2 weeks urine, 30 days serum; FZ=30 days. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '328', '332'] },
    { mvdTestCode: '918', species: 'Canine', testName: 'MVista® Canine Fungal Bone Panel East', shortName: 'Canine Bone East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '330', '327', '309'] },
    { mvdTestCode: '919', species: 'Canine', testName: 'MVista® Canine Fungal Bone Panel West', shortName: 'Canine Bone West', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '329', '327', '309'] },
    { mvdTestCode: '920', species: 'Feline', testName: 'MVista® Feline Fungal Bone Panel West', shortName: 'Feline Bone West', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '320', '328', '309'] },
    { mvdTestCode: '921', species: 'Feline', testName: 'MVista® Feline Fungal Bone Panel East', shortName: 'Feline Bone East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL each',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=5 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '328', '309'] },
    { mvdTestCode: '922', species: 'Canine', testName: 'MVista® Canine Fungal Eye Panel West', shortName: 'Canine Eye West', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 1 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '329', '327', '309', '319'] },
    { mvdTestCode: '923', species: 'Canine', testName: 'MVista® Canine Fungal Eye Panel East', shortName: 'Canine Eye East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 1 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['316', '330', '327', '309', '319'] },
    { mvdTestCode: '924', species: 'Feline', testName: 'MVista® Feline Fungal Eye Panel West', shortName: 'Feline Eye West', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 1 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '320', '319', '328', '309'] },
    { mvdTestCode: '925', species: 'Feline', testName: 'MVista® Feline Fungal Eye Panel East', shortName: 'Feline Eye East', category: 'Panel', methodology: 'Multiple', organism: 'Multiple',
      tat: '1-6 days', specimens: ['Urine', 'Serum'], volume: '0.5 mL urine, 0.75 mL serum',
      handling: 'Specimen: Urine and Serum. Container: Separator or transfer tube.',
      storage: 'RT=2 weeks urine, 2 days serum; RF=2 weeks urine, 5 days serum; FZ=2 months. Shipping: Overnight or 2nd day - ambient or with cold pack.',
      componentTests: ['310', '328', '319', '309'] },
];

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
            market: 'Human',
            species: 'Human',
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

    // 5b. Build veterinary tests from PDF-extracted data
    console.log(`\nBuilding ${VET_TESTS.length} veterinary tests...`);
    for (const vt of VET_TESTS) {
        const auditFields = createAuditFields('Active', 'system');
        const test = {
            mvdTestCode: vt.mvdTestCode,
            market: 'Veterinary',
            species: vt.species,
            testName: vt.testName,
            shortName: vt.shortName,
            category: vt.category,
            methodology: vt.methodology,
            organism: vt.organism,
            cptCodes: [],  // Vet tests don't have CPT codes
            tat: vt.tat,
            ...auditFields,
            ...(vt.componentTests ? { componentTests: vt.componentTests } : {}),
            orderableLoincs: vt.specimens.map(specimen => ({
                orderLoincCode: '',  // Vet tests don't have LOINCs
                orderLoincName: vt.testName,
                shortName: vt.shortName,
                sampleType: specimen,
                sampleHandling: vt.handling + '\n\nVolume: ' + vt.volume,
                sampleStorage: vt.storage,
                acceptableSources: [specimen],
                referenceRange: '',
                resultUnits: '',
                resultComponents: [],
                ...createAuditFields('Active', 'system')
            }))
        };
        tests.push(test);
    }
    console.log(`Total tests (Human + Vet): ${tests.length}`);

    // Sort by market (Human first), then MVD test code (numeric)
    tests.sort((a, b) => {
        if (a.market !== b.market) return a.market === 'Human' ? -1 : 1;
        const numA = parseInt(a.mvdTestCode, 10) || 9999;
        const numB = parseInt(b.mvdTestCode, 10) || 9999;
        return numA - numB;
    });

    // 6. Build specimen source rules from HL7 spec
    const specimenSourceRules = buildSpecimenSourceRules();

    // 7. Build envelope
    const totalLoincs = tests.reduce((sum, t) => sum + t.orderableLoincs.length, 0);

    const envelope = {
        version: '2.1.0',
        lastUpdated: new Date().toISOString(),
        generatedFrom: 'Assay LOINC List for Clients.xlsx + HL7 Spec + Veterinary Test Menu PDF + Medical Test Menu PDF',
        performingOrganization: PERFORMING_ORGANIZATION,
        specimenSourceRules,
        summary: {
            totalTests: tests.length,
            totalOrderableLoincs: totalLoincs,
            humanTests: tests.filter(t => t.market === 'Human').length,
            veterinaryTests: tests.filter(t => t.market === 'Veterinary').length,
            categories: [...new Set(tests.map(t => t.category))],
            markets: [...new Set(tests.map(t => t.market))],
            species: [...new Set(tests.map(t => t.species))],
            organisms: [...new Set(tests.map(t => t.organism))]
        },
        tests
    };

    // 8. Write output
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(COMPENDIUM_OUTPUT, JSON.stringify(envelope, null, 2));
    fs.writeFileSync(SPECIMEN_RULES_OUTPUT, JSON.stringify(specimenSourceRules, null, 2));

    // 9. Summary
    const humanCount = tests.filter(t => t.market === 'Human').length;
    const vetCount = tests.filter(t => t.market === 'Veterinary').length;
    console.log('\n=== Build Summary ===');
    console.log(`Total tests: ${tests.length} (Human: ${humanCount}, Veterinary: ${vetCount})`);
    console.log(`Orderable entries: ${totalLoincs}`);
    console.log(`Categories: ${envelope.summary.categories.join(', ')}`);
    console.log(`Species: ${envelope.summary.species.join(', ')}`);
    console.log(`\nOutput files:`);
    console.log(`  ${COMPENDIUM_OUTPUT}`);
    console.log(`  ${SPECIMEN_RULES_OUTPUT}`);

    // Verify expected counts
    if (humanCount !== 18) {
        console.warn(`\nWARNING: Expected 18 human tests, got ${humanCount}`);
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

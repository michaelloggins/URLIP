# Compendium API

MVD Test Compendium REST API — 42 orderable LOINCs across 18 logical tests.

**Base URL:** `/api/compendium`

---

## Endpoints

### 1. List All Tests

```
GET /api/compendium
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `view` | string | `grouped` | `grouped` (18 test groups) or `flat` (42 orderable LOINCs) |
| `category` | string | — | Filter: `Antigen`, `Antibody`, `PCR` |
| `organism` | string | — | Filter by organism (partial match) |
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 50 | Items per page (max 200) |

**Example:**
```
GET /api/compendium?view=flat&category=Antigen&page=1&pageSize=10
```

---

### 2. Search Tests

```
GET /api/compendium/search
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free text search (name, LOINC, CPT code) |
| `category` | string | Filter: `Antigen`, `Antibody`, `PCR` |
| `organism` | string | Filter by organism |
| `sampleType` | string | Filter by sample type |
| `cptCode` | string | Filter by CPT code |

**Example:**
```
GET /api/compendium/search?q=histoplasma&category=Antigen
```

---

### 3. Version / Metadata

```
GET /api/compendium/version
```

Returns compendium version, summary counts, performing organization, and category/organism lists.

---

### 4. Validate Specimen Source

```
GET /api/compendium/validate-specimen?loinc={code}&specimen={source}
```

Validates that a specimen source string is acceptable for a given LOINC code per HL7 spec rules.

**Query Parameters (required):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `loinc` | string | Orderable LOINC code |
| `specimen` | string | Specimen source string to validate |

**Examples:**
```
GET /api/compendium/validate-specimen?loinc=51753-2&specimen=Serum
→ { "valid": true }

GET /api/compendium/validate-specimen?loinc=51753-2&specimen=Ser/Plas
→ { "valid": false, "reason": "Must specify either...", "suggestions": ["Serum", "Plasma"] }
```

---

### 5. Export Compendium

```
GET /api/compendium/export?format={json|csv}
```

Downloads the full compendium as a file attachment.

| Format | Content-Type | Description |
|--------|-------------|-------------|
| `json` | application/json | Full compendium with all metadata |
| `csv` | text/csv | Flattened 42-row spreadsheet format |

---

### 6. Get by Identifier

```
GET /api/compendium/{identifier}
```

Auto-detects identifier format:
- **LOINC** (`48952-6`) — returns test + matched orderable LOINC
- **MVD Code** (`310`) — returns full test group with all orderables

**Examples:**
```
GET /api/compendium/48952-6  → Histoplasma Ag Urine (LOINC lookup)
GET /api/compendium/310      → Full Histoplasma Ag test (MVD code lookup)
```

---

## Data Model

### Test Group (18 total)

```json
{
  "mvdTestCode": "310",
  "testName": "MVista® Histoplasma Ag Quantitative EIA",
  "category": "Antigen",
  "methodology": "EIA",
  "organism": "Histoplasma capsulatum",
  "cptCodes": [{ "code": "87385", "quantity": 1 }],
  "tat": "M-Sa, 1-2 days",
  "orderableLoincs": [...]
}
```

### Orderable LOINC (42 total)

```json
{
  "orderLoincCode": "48952-6",
  "sampleType": "Urine",
  "acceptableSources": ["Urine"],
  "resultComponents": [{
    "resultLoincCode": "48952-6",
    "resultLoincName": "Histoplasma capsulatum Ag [Mass/volume] in Urine by Immunoassay",
    "referenceRange": "None Detected",
    "units": "ng/mL"
  }]
}
```

---

## Specimen Validation Rules

| Rule | Rejected | Accepted |
|------|----------|----------|
| Serum/Plasma | `Ser/Plas`, `Serum/Plasma`, `S/P` | `Serum`, `Plasma` (specify individually) |
| Body Fluid | `Body Fluid` (generic) | Specific types: `Fluid, Chest`, `Pleural fluid (thoracentesis fld)`, etc. |
| BAL | — | `Bronchial`, `Bronchial Wash`, `Lavage, Bronchial` |
| PCR Lower Resp | — | `Bronchial`, `Bronchial Wash`, `Lavage, Bronchial`, `Aspirate, Tracheal`, `Sputum` |

# StarLIMS Integration Templates Specification

**Document Version:** 1.0.0  
**Created:** 2026-02-19  
**Status:** Draft  
**Workstream:** WS-1 Clinical Integration Core

---

## Overview

This document specifies the Rhapsody message templates for communication between the URLIP platform and StarLIMS (MVD's Laboratory Information System).

### Message Flow Architecture

```
ORDERS (Inbound to StarLIMS):
Customer EHR -> Rhapsody -> [Canonical Model] -> Rhapsody -> StarLIMS
(ORM^O01)      (Parser)    (Normalized JSON)   (Builder)   (StarLIMS API)

RESULTS (Outbound from StarLIMS):
StarLIMS -> Rhapsody -> [Canonical Model] -> Rhapsody -> Customer EHR
(DB/API)   (Extract)   (Normalized JSON)   (Builder)   (ORU^R01)
```

---

## 1. StarLIMS Inbound Order Template

### 1.1 Purpose
Transforms the MVD Canonical Order Model into StarLIMS-compatible format.

### 1.2 Canonical Order Model (Input)

```json
{
  "messageType": "ORDER",
  "messageId": "MSG-2026021900001",
  "patient": {
    "mrn": "12345",
    "lastName": "Smith",
    "firstName": "John",
    "dob": "1980-05-15",
    "gender": "M"
  },
  "order": {
    "placerOrderNumber": "ORD-ABC-001",
    "orderingProvider": {
      "npi": "1234567890",
      "lastName": "Jones",
      "firstName": "Sarah"
    },
    "collectionDateTime": "2026-02-19T09:30:00Z",
    "tests": [
      {
        "mvdTestCode": "HISTO_AG",
        "specimenType": "URINE",
        "aoeResponses": [
          { "questionId": "AOE_IMMUNOCOMP", "answer": "Y" }
        ]
      }
    ]
  },
  "billing": {
    "clientCode": "ACME_HOSP"
  }
}
```

### 1.3 StarLIMS Output Format (TBD)

Requires investigation into StarLIMS API/interface.

---

## 2. StarLIMS Outbound Result Template

### 2.1 Purpose
Extracts result data from StarLIMS and transforms to Canonical Result Model.

### 2.2 StarLIMS Result (Input - TBD)

Requires investigation into StarLIMS database views/API.

### 2.3 Canonical Result Model (Output)

```json
{
  "messageType": "RESULT",
  "messageId": "RES-2026022100001",
  "order": {
    "accessionNumber": "MVD-2026-001234",
    "placerOrderNumber": "ORD-ABC-001"
  },
  "results": {
    "testCode": "HISTO_AG",
    "status": "FINAL",
    "observations": [
      {
        "observationId": "HISTO_AG_QUAL",
        "value": "POSITIVE",
        "referenceRange": "Negative",
        "abnormalFlag": "A"
      },
      {
        "observationId": "HISTO_AG_QUANT",
        "value": "2.3",
        "units": "ng/mL",
        "referenceRange": "<=0.4",
        "abnormalFlag": "H"
      }
    ],
    "interpretation": "Result consistent with active Histoplasma infection.",
    "pdfReportAvailable": true
  }
}
```

---

## 3. Investigation Required

| Item | Question | Status |
|------|----------|--------|
| 1 | What API/interface does StarLIMS expose for order intake? | Pending |
| 2 | What database views/procedures exist for result extraction? | Pending |
| 3 | Does StarLIMS support HL7v2 internally or only REST/JSON? | Pending |
| 4 | What is the StarLIMS internal test code format? | Pending |
| 5 | How are PDF reports generated and stored? | Pending |
| 6 | What events trigger result availability? | Pending |

---

## 4. Rhapsody Route Configuration

### 4.1 Inbound Order Route
```
Route: URLIP_TO_STARLIMS_ORDER
Input: REST/JSON from URLIP Canonical Model
Transform: Canonical -> StarLIMS format
Output: StarLIMS API/Interface
Error Handler: Dead Letter Queue + Alert
```

### 4.2 Outbound Result Route
```
Route: STARLIMS_TO_URLIP_RESULT
Input: StarLIMS Database Poll or Event Hook
Transform: StarLIMS -> Canonical JSON
Output: URLIP Result Queue
Post-Process: Mark result as transmitted in StarLIMS
Error Handler: Dead Letter Queue + Alert
```

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-19 | Claude | Initial draft specification |

# Product Requirements Document: MVD Universal Reference Lab Integration Platform

**Document ID:** MVD-PRD-2026-001
**Version:** 1.2 DRAFT
**Date:** February 12, 2026
**Author:** Mike Loggins, Senior GRC & Security Engineer — MiraVista Diagnostics
**Status:** Draft — Living Document for Iterative Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Strategic Vision](#3-strategic-vision)
4. [Stakeholders & Personas](#4-stakeholders--personas)
5. [Current State Architecture](#5-current-state-architecture)
6. [Target State Architecture](#6-target-state-architecture)
7. [Product Components](#7-product-components)
   - 7.1 [MVD–Epic Beaker Integration Companion Guide](#71-mvdepic-beaker-integration-companion-guide)
   - 7.2 [Reference Cloverleaf Translation Assets](#72-reference-cloverleaf-translation-assets)
   - 7.3 [Compendium Management & Distribution System](#73-compendium-management--distribution-system)
   - 7.4 [Rhapsody Interface Templates](#74-rhapsody-interface-templates)
   - 7.5 [Testing & Validation Toolkit](#75-testing--validation-toolkit)
   - 7.6 [Change Management Process](#76-change-management-process)
   - 7.7 [Connectivity & Transport Layer](#77-connectivity--transport-layer)
   - 7.8 [Epic App Market / Open.Epic Integration](#78-epic-app-market--openepic-integration)
   - 7.9 [EDI / Revenue Cycle Integration](#79-edi--revenue-cycle-integration)
   - 7.10 [Multi-Platform Customer Support](#710-multi-platform-customer-support)
8. [Security & Compliance Requirements](#8-security--compliance-requirements)
9. [Phased Roadmap](#9-phased-roadmap)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Open Questions & Future Topics](#12-open-questions--future-topics)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

MiraVista Diagnostics (MVD) is a specialized fungal reference laboratory serving both human healthcare and veterinary markets. MVD's customer base spans a diverse technology landscape: **Epic EHR / Beaker LIS** (the fastest-growing segment, typically with Infor Cloverleaf as the integration engine), **Oracle Health (Cerner)** with CareAware ConnectWorks, **MEDITECH** (across multiple generations from Magic to Expanse), and veterinary platforms including **IDEXX** and **Antechwin**. MVD's internal technology stack centers on **StarLIMS** as our laboratory information system, **Rhapsody Integration Engine** for healthcare messaging, and **Epicor ERP** for billing and financial management.

This PRD defines a **universal reference lab integration platform** — a repeatable, scalable set of artifacts, tools, processes, and technical standards — that transforms each new customer integration from a bespoke multi-month project into a streamlined configuration exercise. The platform is built on a **common core with platform-specific adapters**, enabling MVD to support the full breadth of customer systems while maintaining a single set of compendium data, processing logic, and operational processes.

Beyond initial implementation, this platform addresses the ongoing operational burden of maintaining integrations as MVD's test compendium evolves (new assays, updated LOINCs, changed reference ranges, etc.).

Additionally, this PRD extends the integration platform to encompass **EDI / revenue cycle transactions** — leveraging Rhapsody's native X12 EDI capabilities to automate client direct billing via 810 invoices and 820 remittance processing, along with alternative cash application strategies for customers using EFT, check, or other payment methods.

The platform is designed to meet or exceed the integration quality bar set by national reference labs like **Quest Diagnostics** and **LabCorp**, while leveraging MVD's niche expertise, personalized service, and dual human/veterinary market capability as competitive differentiators.

---

## 2. Problem Statement

### 2.1 Current Pain Points

**For MVD:**
- Every new Epic/Cloverleaf customer integration is treated as a greenfield project, requiring repeated design decisions, message mapping, and testing from scratch.
- Changes to MVD's test compendium (new assays, LOINC updates, reference range modifications) require manual, ad-hoc communication to each connected customer, often via PDF bulletins that must be manually interpreted and rekeyed.
- No standardized Rhapsody route templates exist, leading to inconsistency across customer interfaces and increased maintenance burden.
- Integration timelines are unpredictable, often driven by VPN setup delays and iterative message mapping negotiations.

**For MVD's Customers:**
- Customer integration teams (Epic analysts, Cloverleaf analysts, IT leadership) receive insufficient upfront documentation, leading to extended discovery phases and repeated clarification cycles.
- Cloverleaf translation maps and crosswalk tables must be built from scratch for each implementation, even though the source/target systems are functionally identical across customers.
- Compendium changes from MVD arrive as unstructured communications, requiring manual translation into Epic Beaker and Cloverleaf configurations.
- Testing is ad-hoc, with no standardized test message library or validation criteria.

### 2.2 Root Cause

MVD lacks a **product mindset** around integration. The technology stack on both sides is known and highly consistent (StarLIMS/Rhapsody ↔ Cloverleaf ↔ Epic Beaker), but MVD has not capitalized on this consistency to build reusable, distributable integration assets.

---

## 3. Strategic Vision

**Transform "MVD ↔ Epic/Cloverleaf connectivity" from a project into a product.**

The integration platform becomes a maintained, versioned, distributable set of assets that MVD owns and evolves. Each new customer receives a **deployment** of this product with customer-specific configuration layered on top of a common foundation.

### 3.1 Guiding Principles

1. **Standardize First, Customize Second:** Build for the 80% common case. Customer-specific variations are handled through configuration, not custom development.
2. **Machine-Readable Over Human-Readable:** Wherever possible, integration artifacts (compendium, crosswalks, test messages) should be structured data that systems can consume directly, with human-readable documentation generated from the same source of truth.
3. **Shift Left on Quality:** Provide comprehensive testing tools and validation criteria upfront so issues are caught before go-live, not after.
4. **Reduce Time-to-First-Result:** The primary success metric is how quickly a new customer can send their first real order and receive their first real result through the interface.
5. **Operationalize Change:** Compendium changes, LOINC updates, and interface modifications follow a defined, predictable, well-communicated process.

---

## 4. Stakeholders & Personas

### 4.1 Internal Stakeholders (MVD)

| Role | Responsibilities | Key Needs |
|---|---|---|
| **Integration Engineer** | Builds and maintains Rhapsody routes, manages customer connectivity, troubleshoots interface issues | Standardized templates, reduced per-customer effort, clear change management process |
| **Laboratory Director** | Approves new assays, defines result components, manages LOINC mappings | Simple process for communicating test changes to integration layer |
| **Quality/Compliance Manager** | Ensures interfaces meet CLIA, HIPAA, and QMS requirements | Documented validation, audit trails, change control records |
| **IT Security (GRC)** | Manages connectivity security, VPN/TLS configurations, access controls | Standardized security requirements, documented connectivity options |
| **Business Development / Account Management** | Manages customer relationships, sets expectations during sales cycle | Clear onboarding timeline, professional integration documentation to share during sales |

### 4.2 External Stakeholders (Customer Side)

| Role | Responsibilities | Key Needs |
|---|---|---|
| **Epic Analyst (Beaker)** | Configures reference lab settings in Epic Beaker, maps order/result codes | MVD compendium in Epic-importable format, clear mapping documentation |
| **Cloverleaf Analyst** | Builds/maintains Cloverleaf routes and translations between Epic and external interfaces | Reference translation maps, crosswalk tables, message specifications |
| **IT/Network Engineer** | Manages connectivity infrastructure (VPN, firewall rules, certificates) | Clear connectivity requirements, pre-documented network parameters |
| **Integration Project Manager** | Coordinates the overall integration effort on the customer side | Defined project plan, milestones, testing criteria, timeline expectations |
| **Laboratory Leadership** | Authorizes the reference lab relationship and validates clinical accuracy of results | Confidence in result integrity, clear compendium documentation |

---

## 5. Current State Architecture

### 5.1 MVD Internal Stack

```
┌─────────────────────────────────────────────────┐
│                  MiraVista Diagnostics           │
│                                                  │
│  ┌───────────┐    ┌──────────────────────────┐  │
│  │ StarLIMS  │◄──►│ Rhapsody Integration     │  │
│  │ (LIS)     │    │ Engine                   │  │
│  │           │    │  - Inbound Order Routes   │  │
│  │           │    │  - Outbound Result Routes │  │
│  │           │    │  - ACK/NAK Management     │  │
│  └───────────┘    └────────────┬─────────────┘  │
│                                │                 │
│                     HL7v2 MLLP │ (per customer)  │
└────────────────────────────────┼─────────────────┘
                                 │
                        [VPN / TLS / SFTP]
                                 │
┌────────────────────────────────┼─────────────────┐
│            Customer Environment│                  │
│                                │                  │
│  ┌──────────────────────────┐  │                  │
│  │ Infor Cloverleaf         │◄─┘                  │
│  │  - Translation/Routing   │                     │
│  │  - Code Crosswalks       │                     │
│  │  - Error Handling        │                     │
│  └────────────┬─────────────┘                     │
│               │                                   │
│               │ HL7v2                              │
│               ▼                                   │
│  ┌───────────────────────┐                        │
│  │ Epic EHR              │                        │
│  │  ├── Epic Beaker LIS  │                        │
│  │  ├── Orders (ORM/OML) │                        │
│  │  └── Results (ORU)    │                        │
│  └───────────────────────┘                        │
└───────────────────────────────────────────────────┘
```

### 5.2 Current Integration Workflow (Per Customer)

1. Customer expresses interest in electronic ordering/resulting → **Weeks 1–2**
2. Kick-off meeting, discovery of customer's Epic/Cloverleaf configuration → **Weeks 2–4**
3. VPN tunnel negotiation and setup → **Weeks 4–12** (highly variable, often the critical path)
4. Message specification negotiation → **Weeks 4–8** (parallel with VPN)
5. Rhapsody route development (MVD side) → **Weeks 8–12**
6. Cloverleaf route development (customer side) → **Weeks 8–12** (parallel)
7. Unit testing → **Weeks 12–14**
8. Integration testing → **Weeks 14–16**
9. UAT and go-live → **Weeks 16–18+**

**Typical elapsed time: 4–5 months.** Target: **3–4 weeks** for the integration-specific work (connectivity setup will always have some customer-dependent variability).

---

## 6. Target State Architecture

### 6.1 Product Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                MVD Integration Platform                        │
│                                                                │
│  ┌────────────────────┐  ┌─────────────────────────────────┐  │
│  │ StarLIMS            │  │ Rhapsody Integration Engine     │  │
│  │                     │  │                                 │  │
│  │  - Test Compendium  │  │  ┌───────────────────────────┐ │  │
│  │  - LOINC Master     │──►  │ Epic/Cloverleaf Template  │ │  │
│  │  - Result Configs   │  │  │ Routes (Standardized)     │ │  │
│  │                     │  │  │  - Inbound Order Template │ │  │
│  └────────────────────┘  │  │  - Outbound Result Template│ │  │
│                           │  │  - ACK Management         │ │  │
│  ┌────────────────────┐  │  │  - Error Handling          │ │  │
│  │ Compendium         │  │  └───────────────────────────┘ │  │
│  │ Distribution       │  │                                 │  │
│  │ System             │  │  ┌───────────────────────────┐ │  │
│  │  - Versioned Files │  │  │ Per-Customer Config Layer  │ │  │
│  │  - Change Packages │  │  │  - Connection Parameters   │ │  │
│  │  - API Endpoint    │  │  │  - Code Crosswalks         │ │  │
│  │  - Customer Portal │  │  │  - Customer-Specific Rules │ │  │
│  └────────────────────┘  │  └───────────────────────────┘ │  │
│                           └─────────────────────────────────┘  │
│  ┌────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Integration        │  │ Test & Validation Toolkit       │  │
│  │ Companion Guide    │  │  - Sample Message Library       │  │
│  │  - Message Profiles│  │  - Connectivity Validators      │  │
│  │  - Field Mappings  │  │  - Structured Test Plans        │  │
│  │  - Cloverleaf Refs │  │  - Expected Result Specs        │  │
│  └────────────────────┘  └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────┼──────────┐
                   │          │          │
                   ▼          ▼          ▼
              ┌─────────┐ ┌────────┐ ┌────────┐
              │Customer │ │Customer│ │Customer│
              │   A     │ │   B    │ │   C    │
              │(Epic/CL)│ │(Epic/CL│ │(Epic/CL│
              └─────────┘ └────────┘ └────────┘
```

### 6.2 Target Integration Workflow (Per Customer)

1. Sales/BD provides Integration Companion Guide during prospect phase → **Pre-engagement**
2. Kick-off: Hand off Companion Guide, connectivity options, test toolkit → **Day 1**
3. Connectivity setup (MLLPS preferred, VPN if required) → **Days 1–10** (parallel)
4. Customer Cloverleaf team imports reference translation assets and crosswalks → **Days 1–7**
5. MVD deploys Rhapsody template routes with customer-specific config → **Days 1–5**
6. Connectivity validation using toolkit scripts → **Days 10–12**
7. Message flow testing using standardized test message library → **Days 12–17**
8. UAT with real orders/results → **Days 17–21**
9. Go-live → **Day 21**

**Target elapsed time: 3–4 weeks** (connectivity permitting).

---

## 7. Product Components

### 7.1 MVD–Epic Beaker Integration Companion Guide

#### 7.1.1 Purpose
A published, version-controlled document that serves as the single source of truth for any customer or integration partner implementing an electronic interface with MVD. This document is provided at the start of every engagement and eliminates the multi-week discovery phase.

#### 7.1.2 Contents

**Section 1: Overview**
- MVD company profile and service description
- Supported integration patterns (HL7v2 order/result, future FHIR)
- High-level message flow diagrams
- Glossary of MVD-specific terminology

**Section 2: Connectivity Requirements**
- Supported transport options (see Section 7.7)
- Network requirements per transport type
- Certificate requirements for TLS/MLLPS
- IP addressing and port assignments
- Firewall rule specifications
- VPN parameters (IKE Phase 1/2 proposals, encryption, hashing, DH groups)

**Section 3: HL7v2 Message Specifications**

*Inbound Orders (ORM^O01 / OML^O21):*
- Complete segment-by-segment specification with field-level detail
- Required vs. optional fields
- MVD-expected coding systems (order codes, specimen types, priorities)
- Patient identifier handling (MRN, account number, etc.)
- Ordering provider identification requirements
- Specimen information requirements specific to fungal diagnostics
- AOE (Ask at Order Entry) questions and expected formats
- Example messages for each major test category

*Outbound Results (ORU^R01):*
- Complete segment-by-segment specification
- Result component structure per test (OBR/OBX hierarchy)
- LOINC coding per result component
- Units of measure
- Reference range reporting format
- Result status workflow (preliminary, final, corrected, amended)
- Reflex/add-on test result reporting
- Comment/note handling (NTE segments)
- PDF report attachment methodology (OBX with ED datatype)
- Example messages for each major result type

*Acknowledgments:*
- ACK/NAK expectations and handling
- Enhanced mode vs. original mode acknowledgment
- Error code definitions and retry behavior

**Section 4: Code Mapping & Compendium**
- MVD test compendium overview
- Code mapping methodology (MVD codes ↔ LOINC ↔ customer order codes)
- How to access the machine-readable compendium (see Section 7.3)
- Guidance for Epic Beaker reference lab configuration

**Section 5: Testing & Validation**
- Overview of the testing toolkit (see Section 7.5)
- Phased test plan summary
- Go-live readiness criteria

**Section 6: Ongoing Operations**
- Change notification process (see Section 7.6)
- Support contact information and escalation paths
- Monitoring and error resolution procedures
- Scheduled maintenance windows

#### 7.1.3 Format & Distribution
- Primary format: PDF (generated from Markdown/LaTeX source for version control)
- Source maintained in version control (Git)
- Versioned with semantic versioning (MAJOR.MINOR.PATCH)
- Distributed via MVD customer portal and directly by BD/account management
- Updated at minimum quarterly or upon any material change

#### 7.1.4 Acceptance Criteria
- [ ] Reviewed and approved by MVD Laboratory Director, IT, and Quality
- [ ] Validated against at least 2 existing customer implementations
- [ ] Feedback incorporated from at least 1 external Epic analyst and 1 Cloverleaf analyst
- [ ] All example messages validated as parseable by Rhapsody and a Cloverleaf test instance (if available)

---

### 7.2 Reference Cloverleaf Translation Assets

#### 7.2.1 Purpose
Provide MVD's customers' Cloverleaf analysts with pre-built or reference translation logic, crosswalk tables, and route configuration guidance that dramatically reduces the effort to build the Cloverleaf side of the interface.

#### 7.2.2 Asset Inventory

**Code Crosswalk Tables:**
- MVD Order Code ↔ LOINC mapping table
- MVD Result Component Code ↔ LOINC mapping table
- MVD Specimen Type codes ↔ HL7 Specimen Type (SPM-4) values
- MVD Priority codes ↔ HL7 Priority (ORC-7) values
- MVD Result Status codes ↔ HL7 Result Status (OBR-25/OBX-11) values
- Format: Pipe-delimited flat files (Cloverleaf's native crosswalk import format), plus CSV and JSON equivalents

**Translation Logic Documentation:**
- Inbound Order Translation Guide: Field-by-field mapping from Epic Beaker's standard ORM output to MVD's expected ORM format, including transformation rules (e.g., date format conversions, code translations, segment reordering)
- Outbound Result Translation Guide: Field-by-field mapping from MVD's ORU output to Epic Beaker's expected ORU format
- Documented in a structured format that Cloverleaf analysts can directly implement as XLATE maps

**Reference Route Topology:**
- Recommended Cloverleaf process/thread configuration for the MVD interface
- Inbound thread (from MVD): connection parameters, TPS process definitions, error handling
- Outbound thread (to MVD): connection parameters, TPS process definitions, acknowledgment handling
- Error/dead-letter routing recommendations

**Sample TCL/JavaScript Procedures (if feasible):**
- Common transformation functions (date reformatting, code lookup, segment manipulation)
- Validation procedures for pre-send and post-receive quality checks
- These are provided as reference implementations, not production-ready code, since each Cloverleaf environment has its own conventions

#### 7.2.3 Maintenance
- Updated in lockstep with compendium changes (see Section 7.3)
- Version-controlled alongside the compendium
- Crosswalk tables are generated programmatically from the master compendium data

#### 7.2.4 Acceptance Criteria
- [ ] Crosswalk tables validated against current MVD test compendium in StarLIMS
- [ ] Translation logic documentation reviewed by at least 1 certified Cloverleaf analyst (external consultant or customer partner)
- [ ] All code crosswalks import cleanly into a reference Cloverleaf instance (if available for testing)

---

### 7.3 Compendium Management & Distribution System

#### 7.3.1 Purpose
This is the **highest-impact component** of the integration platform. It directly addresses the ongoing operational pain of communicating test compendium changes to connected customers. The system replaces ad-hoc PDF bulletins and email notifications with structured, machine-readable, versioned compendium data that customers and their integration engines can consume programmatically.

#### 7.3.2 Master Compendium Data Model

Each orderable test in MVD's compendium will be represented with the following structured data:

```json
{
  "compendium_version": "2026.02.1",
  "release_date": "2026-02-11",
  "tests": [
    {
      "mvd_test_code": "HISTO_AG",
      "test_name": "Histoplasma Antigen, Quantitative",
      "test_category": "Fungal Antigen",
      "orderable": true,
      "loinc_order_code": "XXXXX-X",
      "loinc_order_name": "Histoplasma capsulatum Ag [Units/volume] in Serum by Immunoassay",
      "cpt_codes": ["87449"],
      "specimen_requirements": {
        "preferred_specimen": "Serum",
        "acceptable_specimens": ["Urine", "BAL", "CSF"],
        "minimum_volume_ml": 1.0,
        "container": "Red top or SST",
        "transport_conditions": "Ambient or refrigerated",
        "stability": "7 days refrigerated"
      },
      "result_components": [
        {
          "component_code": "HISTO_AG_QUANT",
          "component_name": "Histoplasma Antigen Level",
          "loinc_result_code": "XXXXX-X",
          "data_type": "NM",
          "units": "ng/mL",
          "reference_range": {
            "normal_low": null,
            "normal_high": 0.4,
            "interpretation": "<=0.4 ng/mL: Negative"
          },
          "result_status_codes": ["F", "C", "X"]
        },
        {
          "component_code": "HISTO_AG_INTERP",
          "component_name": "Histoplasma Antigen Interpretation",
          "loinc_result_code": "XXXXX-X",
          "data_type": "CE",
          "coded_values": [
            {"code": "NEG", "display": "Negative"},
            {"code": "POS", "display": "Positive"},
            {"code": "EQV", "display": "Equivocal"}
          ]
        }
      ],
      "aoe_questions": [
        {
          "question_code": "SPECIMEN_SOURCE",
          "question_text": "Specimen Source",
          "data_type": "CE",
          "required": true,
          "allowed_values": ["Serum", "Urine", "BAL", "CSF", "Other"]
        },
        {
          "question_code": "CLINICAL_HISTORY",
          "question_text": "Relevant Clinical History",
          "data_type": "TX",
          "required": false
        }
      ],
      "expected_tat_days": 3,
      "reflex_tests": [],
      "effective_date": "2024-01-15",
      "retired_date": null,
      "change_history": [
        {
          "date": "2025-09-01",
          "change_type": "reference_range_update",
          "description": "Updated cutoff from 0.5 to 0.4 ng/mL based on validation study",
          "previous_value": "0.5",
          "new_value": "0.4"
        }
      ]
    }
  ]
}
```

#### 7.3.3 Distribution Channels

**Channel 1: Customer Portal (Primary)**
- Authenticated HTTPS download from MVD's customer-facing web portal
- Current full compendium file (JSON and CSV formats)
- Incremental change packages (delta files showing only what changed since a given version)
- Cloverleaf-formatted crosswalk tables (auto-generated from master data)
- Human-readable changelog (Markdown/PDF)

**Channel 2: API Endpoint (Future / Advanced)**
- RESTful API for programmatic access
- Endpoints: `/compendium/current`, `/compendium/changes?since=VERSION`, `/compendium/test/{test_code}`
- Authenticated via API key per customer
- Enables future automation where customer systems pull updates directly

**Channel 3: Email Notification (Supplementary)**
- Automated email notification to registered contacts when a new compendium version is published
- Email includes: version number, summary of changes, link to portal download, and categorized impact level

#### 7.3.4 Versioning & Release Cadence

- **Semantic versioning:** YYYY.MM.PATCH (e.g., 2026.02.1)
- **Scheduled releases:** Monthly, on a predictable date (e.g., first Monday of each month)
- **Emergency releases:** As needed for critical corrections, with expedited notification
- **Lead times:**
  - New assay additions: Published at least 30 days before go-live
  - LOINC mapping changes: Published at least 30 days before effective date
  - Reference range changes: Published at least 30 days before effective date
  - Test retirements: Published at least 90 days before retirement date
  - Breaking changes (message structure): Published at least 90 days before effective date

#### 7.3.5 Data Source & Generation Pipeline

```
StarLIMS Test Configuration
         │
         ▼
  Extract Script (Scheduled)
         │
         ▼
  Master Compendium (JSON)  ──►  Version Control (Git)
         │
         ├──► JSON distribution file
         ├──► CSV distribution file
         ├──► Cloverleaf crosswalk tables (pipe-delimited)
         ├──► Epic Beaker import format (if feasible)
         ├──► Human-readable changelog (Markdown → PDF)
         └──► FHIR ValueSet / CodeSystem resources (future)
```

#### 7.3.6 Acceptance Criteria
- [ ] Master compendium data model validated against all current MVD orderable tests
- [ ] JSON and CSV exports generate without error from StarLIMS extract
- [ ] Cloverleaf crosswalk format validated with at least 1 customer's Cloverleaf instance
- [ ] Versioning system operational with at least 2 test releases
- [ ] Customer portal prototype accessible and functional
- [ ] Change detection logic correctly identifies additions, modifications, and retirements
- [ ] Notification system delivers emails to registered contacts within 1 hour of release

---

### 7.4 Rhapsody Interface Templates

#### 7.4.1 Purpose
Standardize MVD's internal Rhapsody configuration so that deploying a new Epic/Cloverleaf customer interface is a configuration exercise (populate lookup tables, set connection parameters) rather than a development exercise.

#### 7.4.2 Template Components

**Inbound Order Route Template:**
- Communication Point: TCP Server (MLLPS) or TCP Client, configurable per customer
- Message parsing: HL7v2 ORM^O01 / OML^O21 parser with validation
- Pre-processing filters:
  - Message structure validation (required segments/fields present)
  - Patient identifier validation
  - Order code lookup against MVD compendium (reject unknown codes with informative NAK)
  - Specimen type validation
  - Duplicate order detection
- Transformation layer:
  - Customer code → MVD internal code translation (driven by per-customer lookup table)
  - Date/time normalization
  - Identifier mapping
- Output: Formatted message for StarLIMS inbound interface
- ACK generation: Immediate AA (accept) or AE (error) with descriptive error text
- Error handling: Dead-letter queue with alerting for messages that fail processing
- Logging: Full message audit trail (inbound raw, transformed, ACK sent)

**Outbound Result Route Template:**
- Input: StarLIMS result message (internal format)
- Transformation layer:
  - MVD internal codes → LOINC mapping (from master compendium)
  - Result component assembly (OBR/OBX hierarchy per test definition)
  - Reference range population
  - PDF report attachment encoding (Base64 in OBX-5 with ED datatype)
  - Customer-specific code translations (driven by per-customer lookup table)
- Communication Point: TCP Client (MLLPS) or TCP Server, configurable per customer
- ACK processing: Wait for AA, retry on AE/AR per configurable retry policy
- Error handling: Retry queue with escalating alerts, dead-letter after max retries
- Logging: Full message audit trail (pre-transform, post-transform, ACK received)

**Per-Customer Configuration Layer:**
- Customer identifier (used for routing and lookup table selection)
- Connection parameters (IP, port, TLS certificate references)
- Code crosswalk lookup table (customer order codes ↔ MVD codes)
- Customer-specific field mapping overrides (if any)
- Retry policy parameters (interval, max attempts, backoff)
- Alerting configuration (email recipients, escalation thresholds)

#### 7.4.3 Naming & Organization Convention
- Route naming: `EPIC_[CustomerCode]_ORD_IN`, `EPIC_[CustomerCode]_RES_OUT`
- Lookup table naming: `XWALK_[CustomerCode]_ORDCODES`, `XWALK_[CustomerCode]_RESCODES`
- Communication point naming: `CP_[CustomerCode]_MLLPS_IN`, `CP_[CustomerCode]_MLLPS_OUT`

#### 7.4.4 Monitoring & Alerting
- Dashboard showing per-customer:
  - Messages received/sent (last 1hr, 24hr, 7d)
  - Error rates and error categories
  - Queue depths
  - Connection status (up/down, last successful message)
- Alert thresholds:
  - Connection down > 15 minutes
  - Error rate > 5% over rolling 1-hour window
  - Dead-letter queue depth > 0
  - No messages received in > 24 hours (for active customers)

#### 7.4.5 Acceptance Criteria
- [ ] Template routes successfully process all messages in the standardized test message library
- [ ] New customer can be onboarded by copying template and populating configuration only (no route logic changes)
- [ ] Monitoring dashboard displays accurate real-time data for at least 2 customer connections
- [ ] Error handling correctly routes failed messages to dead-letter queue with appropriate alerts
- [ ] ACK/NAK processing handles all expected acknowledgment scenarios

---

### 7.5 Testing & Validation Toolkit

#### 7.5.1 Purpose
Provide a comprehensive, reusable testing package that ensures consistent validation quality across all customer implementations and reduces the testing phase from weeks to days.

#### 7.5.2 Components

**Sample Message Library:**

Organized by test phase and message type:

*Phase 1 — Connectivity Validation:*
- Minimal valid ORM message (single order, common test)
- Expected ACK response
- Minimal valid ORU message (single result, common test)
- Expected ACK response

*Phase 2 — Message Parsing & Code Mapping:*
- ORM messages for each MVD test category (antigen, antibody, culture, molecular)
- ORM messages with various specimen types
- ORM messages with AOE responses
- ORU messages for each result type (quantitative, qualitative, coded, text)
- ORU messages with multiple result components (OBR with multiple OBX)
- ORU messages with PDF attachments

*Phase 3 — Workflow & Edge Cases:*
- Order cancellation message
- Result amendment/correction (ORU with corrected status)
- Reflex test result (additional unsolicited result from original order)
- Add-on test order
- Multiple orders in single message (batch)
- Messages with special characters, long field values, Unicode content
- Messages with missing optional fields (graceful handling)
- Duplicate message detection test
- Malformed messages (expected rejection with informative error)

*Phase 4 — End-to-End (UAT):*
- Defined set of "real-world" test scenarios that exercise the complete workflow:
  1. Place order in Epic → order arrives in StarLIMS
  2. Result entered in StarLIMS → result displays correctly in Epic
  3. Result amended in StarLIMS → amendment reflects in Epic
  4. Order canceled in Epic → cancellation processed in StarLIMS
  5. Reflex test triggered → additional result sent to Epic without new order

**Connectivity Validation Tools:**
- TCP connectivity test script (validates port reachability)
- TLS handshake validator (confirms certificate acceptance, cipher suite negotiation)
- MLLP echo test (sends minimal MLLP-wrapped message, expects ACK)
- Throughput test (sends N messages, measures delivery rate and latency)
- Format: PowerShell 5.1 scripts (per MVD standard) and/or standalone executables

**Structured Test Plan Template:**
- Pre-formatted document (Word/Markdown) with:
  - Test case ID, description, preconditions, steps, expected results, actual results, pass/fail
  - Sign-off fields for MVD and customer testers
  - Organized by test phase
  - Pre-populated with all standard test cases from the sample message library
  - Space for customer-specific test cases

**Expected Result Specifications:**
- For each sample message in the library, a companion document describing:
  - What the receiving system should do with the message
  - Expected field values in the destination system
  - Screenshots or field-level detail for Epic Beaker display expectations (where feasible)

#### 7.5.3 Acceptance Criteria
- [ ] Sample message library covers 100% of MVD's current test compendium categories
- [ ] All sample messages pass validation in Rhapsody's HL7 message parser
- [ ] Connectivity validation scripts work on Windows (PowerShell 5.1) and are documented
- [ ] Test plan template reviewed and approved by MVD Quality/Compliance
- [ ] At least 1 customer implementation has been validated using the toolkit

---

### 7.6 Change Management Process

#### 7.6.1 Purpose
Define a predictable, structured process for communicating changes that affect integrations, ensuring customers have adequate time and information to update their systems.

#### 7.6.2 Change Categories

| Category | Description | Examples | Lead Time | Notification Method |
|---|---|---|---|---|
| **Informational** | Changes with no interface impact | Internal workflow changes, TAT adjustments | 15 days | Email bulletin |
| **Additive** | New capabilities that don't break existing interfaces | New orderable test, new result component on existing test | 30 days | Compendium release + email + portal |
| **Modification** | Changes to existing interface elements | LOINC code update, reference range change, unit change | 30 days | Compendium release + email + portal |
| **Deprecation** | Removal of existing capabilities | Test retirement, code retirement | 90 days | Compendium release + email + portal + direct outreach |
| **Breaking** | Changes that require customer-side interface modifications | Message structure change, segment additions/removals, protocol change | 90 days | Compendium release + email + portal + direct outreach + coordination call |

#### 7.6.3 Change Bulletin Format

Each change communication includes:
1. **Change ID:** Unique identifier (e.g., MVD-CHG-2026-015)
2. **Category:** From the table above
3. **Effective Date:** When the change takes effect in production
4. **Summary:** Plain-language description of the change
5. **Technical Impact:** Which message types, segments, and fields are affected
6. **Action Required:** Specific steps the customer/Cloverleaf team needs to take
7. **Updated Compendium Reference:** Version number and download link
8. **Updated Crosswalk Reference:** If code mappings changed
9. **Updated Sample Messages:** If message structure changed
10. **Contact:** MVD integration engineer for questions

#### 7.6.4 Internal Change Control Alignment

This process integrates with MVD's existing Quality Management System (QMS):
- All interface changes are documented as change requests in the QMS
- Changes are reviewed and approved by appropriate stakeholders (Lab Director for clinical changes, IT for technical changes, Quality for compliance impact)
- Validation evidence is documented per CLIA/CAP requirements before changes are promoted to production
- Customer notification is a tracked step in the change control workflow

#### 7.6.5 Acceptance Criteria
- [ ] Change category definitions approved by MVD leadership
- [ ] Change bulletin template created and approved by Quality
- [ ] Process integrated into existing QMS change control workflow
- [ ] Lead time commitments reviewed with at least 2 existing customers for feasibility
- [ ] Automated notification system tested end-to-end

---

### 7.7 Connectivity & Transport Layer

#### 7.7.1 Purpose
Define MVD's supported connectivity options, with a clear recommendation to accelerate onboarding and reduce the VPN bottleneck.

#### 7.7.2 Tiered Connectivity Model

**Tier 1 — Preferred: MLLP over TLS (MLLPS)**

- HL7v2 messages transported via MLLP wrapped in TLS 1.2+
- Mutual TLS authentication (both sides present certificates)
- Single port per direction (configurable, MVD defaults: inbound 6661, outbound 6662)
- Customer opens firewall for MVD's published IP range; MVD opens firewall for customer's IP
- Certificate management: MVD provides its public certificate; customer provides theirs; both parties install CA chains as needed
- Supported cipher suites: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (minimum)
- No VPN required — traffic encrypted at transport layer
- IHE ATNA profile compliant

**Advantages:** Fastest onboarding (days vs. weeks), minimal network team involvement, standard HTTPS-like infrastructure.

**Tier 2 — Supported: Site-to-Site VPN with MLLP**

- IPsec VPN tunnel between MVD and customer networks
- Standard MLLP (unencrypted) inside the encrypted tunnel
- MVD pre-documented VPN parameters:
  - IKE Phase 1: AES-256, SHA-256, DH Group 14 (2048-bit), lifetime 86400s
  - IKE Phase 2: AES-256, SHA-256, PFS Group 14, lifetime 3600s
  - NAT-T: Supported
  - Dead Peer Detection: Enabled, interval 10s, timeout 30s
- MVD provides: VPN gateway IP, local subnet(s), pre-shared key or certificate
- Customer provides: VPN gateway IP, local subnet(s), pre-shared key or certificate

**Advantages:** Familiar to most healthcare IT teams, well-understood security model.
**Disadvantages:** Weeks-to-months setup time, requires network team coordination on both sides, ongoing tunnel maintenance.

**Tier 3 — Supported: SFTP Batch Exchange**

- HL7v2 messages written as batch files to SFTP server
- MVD hosts SFTP server (or customer hosts, configurable)
- Polling interval: Configurable (default 5 minutes for orders, 5 minutes for results)
- File naming convention: `MVD_[CustomerCode]_[MessageType]_[Timestamp].hl7`
- Authentication: SSH key-based (password authentication not supported)
- File lifecycle: Processed files moved to archive directory, retained for 90 days

**Advantages:** Simplest network requirements (single SFTP port), works through most firewalls, good fallback option.
**Disadvantages:** Not real-time (polling latency), file management overhead, less suitable for STAT orders.

**Tier 4 — Future: FHIR over HTTPS (Epic App Market)**

- See Section 7.8

#### 7.7.3 Connectivity Onboarding Checklist

Regardless of transport tier, the following must be established:

- [ ] Transport tier agreed upon by both parties
- [ ] IP addresses / hostnames exchanged
- [ ] Port numbers confirmed
- [ ] Firewall rules requested and implemented (both sides)
- [ ] Certificates exchanged (for TLS/MLLPS) or VPN parameters exchanged (for VPN)
- [ ] Test environment connectivity validated using toolkit scripts
- [ ] Production environment connectivity validated
- [ ] Failover/redundancy requirements discussed and documented
- [ ] Monitoring and alerting configured (both sides)
- [ ] Escalation contacts exchanged for connectivity issues

#### 7.7.4 Acceptance Criteria
- [ ] MLLPS connectivity validated between Rhapsody and at least 1 Cloverleaf instance
- [ ] VPN parameters documented and validated with at least 1 customer
- [ ] SFTP exchange validated end-to-end with file pickup and processing
- [ ] Connectivity validation scripts functional for all three tiers
- [ ] Companion Guide Section 2 accurately reflects all supported options

---

### 7.8 Epic App Market / Open.Epic Integration

#### 7.8.1 Purpose
Establish a strategic pathway for direct FHIR-based integration with Epic, reducing or eliminating middleware dependency and positioning MVD for the future of healthcare interoperability.

#### 7.8.2 Overview of Open.Epic

Open.Epic is Epic's interoperability platform providing RESTful FHIR R4 APIs for external system integration. For reference laboratories, the key capabilities include:

- **Receiving orders** via FHIR ServiceRequest resources
- **Sending results** via FHIR DiagnosticReport and Observation resources
- **Workflow management** via FHIR Task resources
- **Authentication** via OAuth 2.0 (SMART on FHIR)
- **Transport** via HTTPS — no VPN, no MLLP, no Cloverleaf required

#### 7.8.3 Epic App Market Registration

To offer direct Epic integration, MVD must:

1. **Register as a developer** on the Epic App Market (formerly App Orchard)
2. **Build a FHIR-compliant application** that implements the reference lab order/result workflow using Epic's published FHIR profiles
3. **Complete Epic's review and certification process**, which includes:
   - Technical review of API usage patterns
   - Security review (OAuth implementation, data handling)
   - Privacy review (HIPAA compliance, data minimization)
   - Functional testing against Epic's sandbox environment
4. **Publish the app** on the App Market, making it available for any Epic customer to activate
5. **Per-customer activation:** Each Epic customer enables MVD's app from their Epic admin console, authorizes the OAuth connection, and configures the integration — without building Cloverleaf routes

#### 7.8.4 FHIR Resource Mapping

| HL7v2 Concept | FHIR R4 Resource | Key Fields |
|---|---|---|
| ORM Order | ServiceRequest | code, subject, requester, specimen, supportingInfo (AOE) |
| ORU Result | DiagnosticReport + Observation | code, status, result (references Observations), conclusion |
| OBX Result Component | Observation | code (LOINC), value, referenceRange, interpretation, status |
| Patient (PID) | Patient | identifier, name, birthDate, gender |
| Specimen (SPM) | Specimen | type, collection, container |
| PDF Report | DiagnosticReport.presentedForm | contentType, data (base64) |

#### 7.8.5 Advantages of FHIR / App Market Approach

- **Drastically simplified onboarding:** Customer enables app, configures OAuth — no Cloverleaf routes, no VPN tunnels
- **Standardized API:** Epic's FHIR profiles are highly consistent across implementations, even more so than their HL7v2 output
- **Modern security model:** OAuth 2.0, HTTPS, no persistent network tunnels
- **Bidirectional notifications:** FHIR Subscriptions can push real-time updates
- **Market visibility:** Presence on Epic App Market is a credibility signal and discovery channel for potential customers

#### 7.8.6 Challenges & Considerations

- **Certification timeline:** Epic's review process can take 3–6 months
- **Development investment:** Building and maintaining a FHIR-compliant application requires dedicated development resources
- **Customer adoption curve:** Many Epic customers still prefer HL7v2/Cloverleaf and may be slow to adopt FHIR-based reference lab integration
- **Compendium management:** LOINC/code mapping challenges remain regardless of transport — they just shift from HL7v2 crosswalks to FHIR ValueSets
- **StarLIMS integration:** Need to build or adapt StarLIMS interfaces to consume FHIR orders and produce FHIR results (or translate FHIR↔HL7v2 within Rhapsody)
- **Hybrid period:** MVD will need to support both HL7v2 and FHIR simultaneously for an extended period

#### 7.8.7 Recommended Approach

**Phase 1 (Near-term):** Research and planning
- Register for Epic App Market developer access
- Inventory Epic's reference lab FHIR profiles and APIs
- Assess StarLIMS FHIR capability and identify integration architecture (direct vs. Rhapsody-mediated)
- Develop business case with estimated costs and timeline

**Phase 2 (Mid-term):** Development and certification
- Build FHIR reference lab application against Epic's sandbox
- Implement OAuth 2.0 / SMART on FHIR authentication
- Map MVD compendium to FHIR ValueSets and CodeSystems
- Submit for Epic certification

**Phase 3 (Long-term):** Deployment and adoption
- Publish on Epic App Market
- Pilot with 1–2 willing customers
- Iterate based on feedback
- Offer as alternative onboarding path alongside HL7v2

#### 7.8.8 Acceptance Criteria
- [ ] Epic App Market developer registration completed
- [ ] FHIR profile gap analysis documented (Epic's profiles vs. MVD's data model)
- [ ] Architecture decision documented (direct StarLIMS↔FHIR vs. Rhapsody-mediated translation)
- [ ] Business case with cost estimate and timeline approved by MVD leadership
- [ ] Sandbox application successfully receives test order and returns test result via FHIR

---

### 7.9 EDI / Revenue Cycle Integration (Client Direct Billing)

#### 7.9.1 Purpose

Extend MVD's integration platform beyond clinical data exchange to encompass **revenue cycle transactions**. Rhapsody's native EDI/X12 capabilities allow MVD to apply the same "product not project" methodology to financial integrations that we're building for clinical HL7v2 integrations.

**Billing Model Context:** MVD operates exclusively as a **client direct billing** reference laboratory. MVD does not participate in third-party insurance billing. The referring institution (customer) is always the payer — MVD invoices the customer, and the customer pays MVD. The customer is then responsible for billing their own patients/payers for the reference lab charges as part of their overall billing workflow.

This simplifies the EDI scope considerably. There is no need for 837P claims, 835 remittance from insurance payers, 270/271 eligibility verification, or clearinghouse connectivity. The focus is purely on the **B2B financial relationship** between MVD and its customer institutions.

#### 7.9.2 EDI Transaction Inventory

**Core Transactions (Client Direct Billing)**

| Transaction | Direction | X12 Standard | Purpose | Priority |
|---|---|---|---|---|
| **810** | Outbound | X12 810 | Invoice — bill referring institution for reference lab services performed | **Critical** |
| **820** | Inbound | X12 820 | Payment Order/Remittance — institution's payment and remittance detail against MVD invoices | **Critical** |
| **997/999** | Inbound | X12 997/999 | Functional acknowledgment — confirms syntactic acceptance of 810 invoices | **High** |
| **812** | Outbound | X12 812 | Credit/Debit Adjustment — issue credits for canceled tests, billing corrections, or volume discounts | **Medium** |
| **850** | Inbound | X12 850 | Purchase Order — if customers want to formalize reference lab orders via EDI PO (aligns with their procurement/AP workflow) | **Low** |
| **855** | Outbound | X12 855 | Purchase Order Acknowledgment — confirm receipt and acceptance of 850 PO | **Low** |

**Supplementary Transactions (Future)**

| Transaction | Direction | X12 Standard | Purpose | Priority |
|---|---|---|---|---|
| **846** | Outbound | X12 846 | Inventory Inquiry/Advice — communicate test compendium availability and pricing updates to customers (non-traditional use but applicable) | **Low** |
| **864** | Outbound | X12 864 | Text Message — structured notifications (test menu changes, service bulletins) as EDI transactions | **Low** |

**Note on 837P/835/270/271:** Since MVD does not participate in third-party insurance billing, these HIPAA healthcare transactions are **out of scope**. The customer institution is responsible for their own payer billing. However, MVD's HL7v2 result messages should include sufficient clinical and coding data (LOINC, CPT, diagnosis codes if provided on the order) to support the customer's downstream billing workflow.

#### 7.9.3 Architecture: Rhapsody as Unified Integration Hub

The recommended approach routes EDI transactions through Rhapsody alongside clinical HL7v2/FHIR traffic, creating a unified integration layer per customer. This is particularly powerful for client direct billing because **the same connectivity infrastructure** (VPN, MLLPS, or SFTP) used for clinical message exchange can carry financial transactions.

```
┌───────────────────────────────────────────────────────────────────┐
│                    MVD Internal Systems                            │
│                                                                    │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────────────┐  │
│  │ StarLIMS  │  │ Epicor    │  │ Rhapsody Integration Engine  │  │
│  │ (LIS)     │  │ (ERP /    │  │                              │  │
│  │           │  │  Billing) │  │  Clinical Routes:            │  │
│  │ Orders ──►│  │           │  │  ├─ HL7v2 Order/Result       │  │
│  │ Results◄──│  │ A/R ◄────│──│──├─ FHIR (future)            │  │
│  │           │  │ Invoices──│──│──│                            │  │
│  │ Charges──►│──│──►Billing │  │  Client Billing Routes:      │  │
│  │           │  │           │  │  ├─ 810 Invoices (outbound)  │  │
│  └───────────┘  └───────────┘  │  ├─ 820 Remittance (inbound) │  │
│                                │  ├─ 812 Adjustments (outbound)│  │
│                                │  └─ 997/999 Acknowledgments   │  │
│                                └───────────────┬──────────────┘  │
│                                                │                  │
└────────────────────────────────────────────────┼──────────────────┘
                                                 │
                    Same connectivity as clinical │ (VPN/MLLPS/SFTP)
                                                 │
                              ┌──────────────────┼────────────────┐
                              │                  │                │
                              ▼                  ▼                ▼
                     ┌──────────────┐   ┌──────────────┐  ┌────────────┐
                     │ Customer A   │   │ Customer B   │  │ Customer C │
                     │ Epic/Beaker  │   │ Epic/Beaker  │  │ Epic/Beaker│
                     │ + ERP/AP     │   │ + ERP/AP     │  │ + ERP/AP   │
                     │ (Workday,    │   │ (PeopleSoft, │  │ (SAP,      │
                     │  Lawson,     │   │  Oracle,     │  │  Infor,    │
                     │  etc.)       │   │  etc.)       │  │  etc.)     │
                     └──────────────┘   └──────────────┘  └────────────┘
```

**Why Rhapsody as the hub:**
- Single platform for all integration engineering — clinical and financial staff work in the same tool
- Unified monitoring, alerting, and logging across all transaction types
- Shared connectivity infrastructure (same VPN/TLS tunnels can carry both clinical and financial traffic to the same customer)
- Rhapsody's X12 EDI parsing/generation is a native capability, not a bolt-on
- Enables correlation between clinical events and financial events (e.g., result released → claim generated, using the same order/accession number)

#### 7.9.4 Shared Connectivity Advantage

A major benefit of the direct billing model is that **EDI transactions can ride the same connectivity infrastructure** already established for clinical integration. If MVD has a VPN, MLLPS, or SFTP connection to a customer for HL7v2 order/result exchange, the 810/820 traffic can flow over that same channel — potentially through the same Cloverleaf instance on the customer side.

This means:
- No separate connectivity setup for billing (no additional VPN tunnels, firewall rules, or certificates)
- The customer's Cloverleaf or integration engine can route both clinical and financial transactions
- Onboarding EDI billing for an existing clinical integration customer is primarily a **configuration exercise**, not a connectivity project
- For customers not yet on clinical EDI, the 810/820 relationship can be established independently over SFTP as a lightweight first step

#### 7.9.5 Outbound Invoice Flow (810)

The 810 invoice replaces or supplements paper/PDF invoicing to customer institutions. Invoices are generated from Epicor based on completed tests and transmitted electronically.

```
StarLIMS (Result Released, Test Completed)
         │
         ▼
  Charge Capture
  (test performed, CPT assigned, accession linked)
         │
         ▼
  Epicor Billing Module
  (accumulated charges per customer, billing period,
   customer account info, pricing/contract terms)
         │
         ▼
  Rhapsody EDI Route (810 Outbound Template)
  ├─ Generate X12 810 envelope (ISA/GS/ST headers)
  ├─ Populate invoice segments:
  │   ├─ Invoice header (BIG segment)
  │   │   ├─ Invoice number (from Epicor)
  │   │   ├─ Invoice date
  │   │   └─ Customer PO reference (if applicable)
  │   ├─ MVD identification (N1 loop, qualifier "SE" — Seller)
  │   │   ├─ Company name, address
  │   │   ├─ Tax ID / EIN
  │   │   └─ NPI (for healthcare context)
  │   ├─ Customer identification (N1 loop, qualifier "BT" — Bill-To)
  │   │   ├─ Institution name, address
  │   │   └─ Customer account number
  │   ├─ Line items (IT1 loop — one per test/service)
  │   │   ├─ MVD accession number (for traceability back to clinical order)
  │   │   ├─ CPT code and description
  │   │   ├─ Date of service
  │   │   ├─ Quantity
  │   │   ├─ Unit price (per contract/fee schedule)
  │   │   ├─ Line total
  │   │   └─ Patient name/MRN (for customer reconciliation)
  │   ├─ Summary (TDS segment — total invoice amount)
  │   └─ Payment terms (ITD segment — Net 30, Net 45, etc.)
  ├─ Apply customer-specific formatting (per trading partner agreement)
  ├─ Validate against Epicor source data (totals match, no missing fields)
  └─ Transmit to customer via:
      ├─ SFTP (preferred — simple, reliable, customer drops into AP import)
      ├─ AS2 (if customer requires)
      └─ Same MLLPS/VPN channel as clinical traffic (if customer supports)
         │
         ▼
  Customer ERP / Accounts Payable System
  (Workday, PeopleSoft, Oracle, SAP, Lawson, Infor, etc.)
```

**Invoice Frequency Options:**
- Per-accession (invoice generated when each result is released — high volume, real-time)
- Batch/periodic (daily, weekly, or monthly consolidated invoice — most common for reference labs)
- Customer-configurable, driven by contract terms and customer AP preferences

**Key Design Decision:** The invoice must include enough detail for the customer to reconcile against their clinical orders. The **accession number** is the critical linking field — it ties the 810 line item back to the HL7v2 ORM order and ORU result, giving the customer end-to-end traceability from order placement through result receipt through invoice payment.

#### 7.9.6 Inbound Remittance Flow (820)

The 820 payment order/remittance provides structured payment detail from the customer, enabling automated cash application in Epicor.

```
  Customer ERP / AP System
  (generates 820 when payment is issued)
         │
         ▼
  Rhapsody EDI Route (820 Inbound Template)
  ├─ Receive via SFTP pickup, AS2, or direct connection
  ├─ Parse X12 820 envelope
  ├─ Extract payment detail:
  │   ├─ Payer identification (customer institution)
  │   ├─ Payment amount and method (check, EFT, ACH, wire)
  │   ├─ Payment date
  │   ├─ Check/EFT reference number
  │   ├─ Invoice references being paid (RMR loop):
  │   │   ├─ MVD invoice number
  │   │   ├─ Invoice amount
  │   │   ├─ Amount paid against this invoice
  │   │   └─ Adjustment amount and reason (if partial payment)
  │   └─ Deduction/adjustment detail (if any):
  │       ├─ Discount taken (early payment, volume)
  │       ├─ Disputed line items
  │       └─ Short-pay reasons
  ├─ Match against outstanding invoices in Epicor
  ├─ Transform to Epicor A/R cash application format
  ├─ Flag exceptions for manual review:
  │   ├─ Payment doesn't match any open invoice
  │   ├─ Partial payment / short-pay
  │   ├─ Unapplied cash (payment received, no invoice reference)
  │   └─ Overpayment
  └─ Route to Epicor A/R module for posting
         │
         ▼
  Epicor (Payment Posted, A/R Updated, Exceptions Queued)
```

**Realistic Adoption Note:** Not all customers will send 820s. Many health systems still pay by check with a paper remittance advice, or via EFT with a separate remittance email/portal. The 820 capability should be offered as a **value-add** for customers with mature AP automation. For customers who don't send 820s, MVD needs alternative cash application strategies (see Section 7.9.7).

#### 7.9.7 Cash Application Alternatives & Strategy

The reality of reference lab billing is that most health systems **do not send structured 820 remittance files.** Waiting for customers to adopt 820 before automating cash application would leave MVD in a manual process indefinitely. This section defines a tiered approach to cash application automation that meets customers where they are.

**Tier 1 — X12 820 (Ideal State)**
- Fully structured, machine-parseable remittance detail
- Direct Rhapsody → Epicor posting
- Lowest manual effort, highest accuracy
- Realistic adoption: < 20% of customers in the near term

**Tier 2 — EFT/ACH with Addenda Records (Most Common for Large Health Systems)**

Many health systems pay via ACH/EFT and include structured remittance data in the ACH addenda records (CTX or CCD+ payment formats). This is the most realistic near-term automation path for large institutional customers.

```
Customer AP System → ACH/EFT Payment with Addenda
         │
         ▼
  MVD's Bank
  ├─ Receives EFT payment
  ├─ Provides bank reporting file (BAI2 / MT940 / CSV export)
  │   containing:
  │   ├─ Payment amount
  │   ├─ Originator (customer institution)
  │   ├─ Addenda records with:
  │   │   ├─ Invoice number references
  │   │   ├─ Payment amounts per invoice
  │   │   └─ Adjustment/deduction notations
  │   └─ Transaction reference number
         │
         ▼
  Rhapsody (or scheduled script)
  ├─ Pick up bank reporting file via SFTP from bank portal
  ├─ Parse payment and addenda detail
  ├─ Match against open invoices in Epicor (by invoice number)
  ├─ Generate Epicor cash application import
  ├─ Flag unmatched or partial payments for review
  └─ Route to Epicor A/R module
```

**Key implementation detail:** MVD's bank must provide structured reporting files (BAI2 format is standard in US commercial banking). Most commercial banks offer automated file delivery via SFTP. Rhapsody can parse BAI2 files natively or via custom filter.

**Tier 3 — Email Remittance Advice Parsing**

Many customers send a remittance advice document (PDF or Excel) attached to an email alongside their EFT payment. These can be semi-automated.

```
Customer AP System → Email with PDF/Excel Remittance Attachment
         │
         ▼
  MVD Shared Mailbox (e.g., remittance@miravista.com)
         │
         ▼
  Automated Processing
  ├─ Option A: Rhapsody Email Communication Point
  │   ├─ Monitor mailbox via IMAP/POP3
  │   ├─ Extract attachment
  │   ├─ Parse PDF (structured PDF with consistent layout) or Excel
  │   ├─ Extract invoice numbers, amounts, adjustments
  │   └─ Feed to Epicor cash application
  │
  ├─ Option B: RPA / Intelligent Document Processing
  │   ├─ Tool like Power Automate, UiPath, or ABBYY
  │   ├─ Monitor mailbox, extract attachments
  │   ├─ OCR/template-based extraction of remittance data
  │   ├─ Output structured CSV/JSON
  │   └─ Rhapsody or Epicor picks up structured output
  │
  └─ Option C: AI-Assisted Extraction (emerging)
      ├─ LLM-based document understanding
      ├─ Handle variable remittance formats across customers
      ├─ Extract to structured format
      └─ Human review queue for low-confidence extractions
```

**Practical note:** Email remittance parsing is imperfect because every customer's remittance format is different. Start with the highest-volume customers and build templates for their specific formats. For low-volume customers, manual posting may remain the most cost-effective approach.

**Tier 4 — Check Payment with Paper Remittance (Lockbox)**

For customers that still pay by check, a bank lockbox service can provide structured deposit data.

```
Customer AP System → Mailed Check + Paper Remittance
         │
         ▼
  MVD's Bank Lockbox
  ├─ Bank receives and deposits check
  ├─ Bank images remittance document
  ├─ Bank provides lockbox file (BAI2 or proprietary format) via SFTP
  │   containing:
  │   ├─ Check amount and check number
  │   ├─ Payer identification
  │   ├─ Scanned remittance image (for manual reference)
  │   └─ Extracted data fields (if bank offers OCR/keying service)
         │
         ▼
  Rhapsody or Epicor Import
  ├─ Parse lockbox file
  ├─ Match against open invoices (limited matching data — may need manual assist)
  └─ Post to Epicor A/R
```

**Tier 5 — Customer Payment Portal (MVD-Hosted)**

For maximum control, MVD could offer a simple web-based payment portal where customers can view outstanding invoices and submit payment with structured remittance data.

```
Customer AP Staff → MVD Payment Portal (web)
         │
         ├─ View outstanding invoices (pulled from Epicor A/R)
         ├─ Select invoices to pay
         ├─ Enter payment details (check number, EFT reference)
         ├─ Note any adjustments/disputes per line item
         └─ Submit
                │
                ▼
         Portal Database / API
                │
                ▼
         Rhapsody or Direct Epicor Import
         ├─ Structured cash application (invoice-to-payment match is guaranteed)
         ├─ Adjustments/disputes routed to billing team work queue
         └─ Post to Epicor A/R
```

**Advantages:** Perfect data quality (customer tells you exactly what they're paying), real-time visibility, dispute capture at point of payment.
**Disadvantages:** Requires customer adoption (one more portal for their AP team to use), development and maintenance cost for MVD.
**Pragmatic approach:** This could be as simple as a SharePoint form or a lightweight web app — it doesn't need to be a full-featured payment platform initially.

**Recommended Cash Application Strategy:**

| Customer Segment | Payment Method | Cash Application Approach | Automation Level |
|---|---|---|---|
| Large health systems with mature AP | ACH/EFT with addenda | Tier 2 — Bank file parsing | High |
| Large health systems, EDI-capable | ACH/EFT + X12 820 | Tier 1 — Direct 820 parsing | Highest |
| Mid-size hospitals | ACH/EFT + email remittance | Tier 3 — Email parsing (template per customer) | Medium |
| Smaller facilities | Check + paper remittance | Tier 4 — Lockbox (if volume justifies) or manual | Low |
| Any customer willing to adopt | Portal self-service | Tier 5 — Portal (future) | High |

**Priority recommendation:** Start with **Tier 2 (bank file parsing)** — it covers the largest payment volume with the least customer-side change required. MVD's bank is already receiving these payments; the question is just getting structured reporting files delivered automatically. This can be implemented independently of any customer EDI capability.

#### 7.9.8 Credit/Debit Adjustment Flow (812)

The 812 handles billing corrections without requiring a full invoice reversal.

**Use cases:**
- Test canceled after order was invoiced
- Pricing correction (wrong fee schedule applied)
- Volume discount or contractual adjustment applied retroactively
- Duplicate billing correction

```
  Epicor (Credit Memo / Adjustment Generated)
         │
         ▼
  Rhapsody EDI Route (812 Outbound Template)
  ├─ Generate X12 812 envelope
  ├─ Reference original invoice (BIG segment — original invoice number)
  ├─ Populate adjustment detail:
  │   ├─ Line items being adjusted (IT1 loop)
  │   ├─ Adjustment reason code
  │   ├─ Original amount vs. adjusted amount
  │   └─ Net adjustment (credit or debit)
  └─ Transmit to customer (same channel as 810)
         │
         ▼
  Customer ERP / AP System (applies adjustment to open balance)
```

#### 7.9.9 Clinical-to-Financial Data Linkage

A critical advantage of running both clinical and financial integration through Rhapsody is the ability to **correlate clinical events with financial events** using common identifiers.

**Key linking fields:**

| Field | Clinical Context (HL7v2) | Financial Context (X12 810) | Purpose |
|---|---|---|---|
| Accession Number | ORC-2 / OBR-2 (Placer Order #) | IT1-07 (Product ID) | Primary link between order, result, and invoice line |
| Customer Account | MSH-4/6 (Sending/Receiving Facility) | N1 loop (Bill-To) | Identifies the customer institution |
| Patient ID/MRN | PID-3 (Patient Identifier) | REF segment or IT1 reference | Enables customer-side reconciliation |
| Date of Service | OBR-7 (Observation Date) | IT1 date fields | Ties service date to invoice |
| Test Code / CPT | OBR-4 (Universal Service ID) | IT1-02 (Product Code, CPT) | Identifies what was performed and billed |

**This linkage enables:**
- Automated charge capture: Result released in StarLIMS → charge record created → flows to Epicor → appears on next 810 invoice
- Reconciliation support: Customer can match 810 line items against ORU results they received via the clinical interface
- Dispute resolution: When a customer questions an invoice line, MVD can trace from 810 → Epicor charge → StarLIMS result → original HL7v2 order
- Audit trail: Complete chain of custody from clinical order through financial settlement

#### 7.9.10 Productization Approach — Applying the Clinical Integration Model

Just as with the clinical HL7v2 integration, the EDI layer benefits from standardization:

**Reusable Rhapsody EDI Templates:**
- 810 invoice generation route (configurable per customer trading partner via lookup tables)
- 820 remittance parsing route (configurable output format for Epicor)
- 812 credit/debit route (configurable per customer)
- 997/999 acknowledgment processing route
- All templates follow the same pattern as clinical routes: common logic + per-partner configuration layer

**Per-Customer Configuration (EDI):**
- Customer trading partner ID (ISA identifiers — sender/receiver qualifier and ID)
- Invoice frequency and consolidation rules
- Fee schedule / pricing table (or reference to Epicor contract)
- Payment terms
- Connectivity parameters (SFTP path, AS2 settings, or shared clinical channel)
- Customer-specific 810 formatting preferences (line item detail level, reference fields)

**Code Crosswalk Tables (EDI-Specific):**
- MVD test codes → CPT code mapping (maintained alongside LOINC mappings in the master compendium)
- Customer account codes → Epicor customer IDs
- Adjustment reason codes → human-readable descriptions

**Trading Partner Onboarding Checklist (EDI):**
- For each customer adding EDI billing:
  - [ ] Trading partner agreement executed (ISA qualifier/ID exchanged)
  - [ ] Fee schedule / pricing confirmed and loaded in Epicor
  - [ ] Connectivity established (SFTP credentials, or confirm shared clinical channel)
  - [ ] Test 810 invoice generated and transmitted
  - [ ] Customer confirms 810 received and parsed into their AP system
  - [ ] 997/999 acknowledgment flow validated
  - [ ] Test 820 remittance received and parsed (if customer will send 820s)
  - [ ] Epicor cash application validated (payment matches remittance)
  - [ ] Production cutover
  - [ ] First production invoice cycle completed and reconciled

**Monitoring & Alerting (EDI-Specific):**
- Invoice volume dashboard (daily/weekly/monthly, by customer)
- 810 delivery confirmation tracking (997/999 received for each invoice)
- Outstanding invoice aging (Epicor A/R data surfaced in dashboard)
- 820 processing status (received, parsed, posted, exceptions)
- Exception queue depth (unmatched payments, short-pays, disputes)
- Revenue trend analysis (invoiced amounts over time, by customer)

#### 7.9.11 Epicor Integration Considerations

Since MVD runs Epicor ERP for billing and accounts receivable, the Rhapsody↔Epicor connection is a critical **internal** integration that underpins the entire EDI billing capability:

**Outbound (Epicor → Rhapsody → Customer):**
- **Charge capture flow:** StarLIMS result release → charge record → Epicor billing module. This may already exist in some form; the question is whether it feeds cleanly into the Rhapsody 810 generation pipeline.
- **Invoice generation trigger:** How does Epicor signal that an invoice is ready for EDI transmission? File export? API event? Database trigger? This determines the Rhapsody inbound communication point design.
- **Fee schedule management:** Customer-specific pricing must be maintained in Epicor and accurately reflected in 810 line items. Contract management and fee schedule updates are an Epicor-side concern but directly impact EDI accuracy.

**Inbound (Customer → Rhapsody → Epicor):**
- **Payment posting:** Rhapsody parses 820 → transforms to Epicor-compatible import format. The format depends on Epicor version and modules — likely CSV, XML, or Epicor's REST API (Epicor 10/Kinetic).
- **Cash application matching:** Epicor must match incoming payments against open invoices. The MVD invoice number is the primary matching key — this must be consistent between the 810 sent and the 820 received.
- **Exception handling:** Partial payments, unapplied cash, and disputes need to flow into Epicor's A/R exception workflow for manual review.

**Open question:** What is MVD's current billing workflow? Understanding the existing Epicor configuration, charge capture process, invoice generation method, and payment posting procedure is essential before designing the Rhapsody EDI routes. This should be a dedicated discovery exercise involving both IT and the billing/finance team.

#### 7.9.12 Compliance & Regulatory Requirements (EDI-Specific)

| Requirement | Applicability | Notes |
|---|---|---|
| **HIPAA Privacy Rule** | 810/820 transactions if they contain patient identifiers | If invoice line items include patient name/MRN for reconciliation purposes, these are PHI and must be transmitted securely. Consider whether patient-level detail is necessary or if accession-level summary is sufficient. |
| **X12 Standards (ASC X12)** | All EDI transactions | While 810/820 are B2B transactions (not HIPAA-mandated like 837/835), adhering to X12 standards ensures interoperability with customer ERP systems |
| **Trading Partner Agreements** | Each customer EDI relationship | Document agreed-upon transaction sets, formats, connectivity, and dispute resolution procedures |
| **CPT Licensing** | 810 line items referencing CPT codes | MVD must maintain appropriate AMA CPT license for use in billing transactions |
| **State Sales Tax** | 810 invoices | Confirm whether MVD's reference lab services are subject to sales tax in any customer jurisdictions (clinical lab services are generally exempt, but this varies) |
| **Record Retention** | All EDI transactions | Maintain transaction records per HIPAA (6 years) and applicable state requirements |

#### 7.9.13 Phased Implementation

**Phase A (Months 1–2): Discovery & Foundation**
- Document current billing workflow end-to-end (StarLIMS → Epicor → current invoicing method)
- Identify Epicor data export/import capabilities for invoice generation and payment posting
- Define 810 message specification (segment-level detail, per X12 standards)
- Define 820 message specification (inbound parsing requirements)
- Identify 1–2 pilot customers willing to receive EDI invoices

**Phase B (Months 2–4): Build & Internal Testing**
- Build Rhapsody 810 outbound template route
- Build Rhapsody 820 inbound template route
- Build Rhapsody 997/999 acknowledgment route
- Build Epicor → Rhapsody invoice data feed
- Build Rhapsody → Epicor payment posting feed
- Internal end-to-end testing with sample data

**Phase C (Months 4–6): Pilot & Validate**
- Establish EDI connectivity with pilot customer(s)
- Exchange test 810 invoices → validate customer can import into their AP system
- Exchange test 820 remittances (if customer supports) → validate Epicor posting
- Run parallel period (EDI + existing invoicing method) for at least 1 billing cycle
- Reconcile EDI invoices against existing invoices to confirm accuracy
- Production cutover for pilot customers

**Phase D (Months 6–9): Scale & Optimize**
- Build 812 credit/debit adjustment route
- Onboard additional customers onto EDI billing
- Build monitoring dashboard and alerting
- Add customer-specific configuration for fee schedules, invoice frequency, formatting
- Measure and report on A/R improvements

#### 7.9.14 Success Metrics (EDI-Specific)

| Metric | Current Baseline | Target | Measurement |
|---|---|---|---|
| Invoice delivery method | Paper / PDF / email? | Automated X12 810 via Rhapsody | Process audit |
| Average days from service to invoice delivery | TBD (measure current) | < 3 business days (or per billing cycle) | Rhapsody + Epicor reporting |
| Invoice accuracy (line items matching services performed) | TBD | > 99.5% | Reconciliation audit |
| Payment posting method | Manual | Automated 820 → Epicor (where customer supports) | Process audit |
| Average days in A/R | TBD | Reduce by 15–20% from baseline | Epicor reporting |
| Invoice disputes / corrections per billing cycle | TBD | Reduce by 50% from baseline (via improved accuracy) | Billing team tracking |
| Customers on EDI billing | 0 | 5+ within 12 months | Customer count |
| 810 delivery confirmation rate (997/999 received) | N/A | > 99% | Rhapsody monitoring |

#### 7.9.15 Acceptance Criteria
- [ ] Current billing workflow documented end-to-end (StarLIMS → Epicor → invoicing)
- [ ] Epicor invoice data export method identified and tested
- [ ] Epicor payment import method identified and tested
- [ ] Rhapsody 810 route generates valid X12 invoices matching Epicor source data
- [ ] Rhapsody 820 route parses remittance and feeds Epicor correctly
- [ ] At least 1 pilot customer successfully receives and imports 810 into their AP system
- [ ] At least 1 full billing cycle completed in parallel (EDI + existing) with successful reconciliation
- [ ] 997/999 acknowledgment flow operational
- [ ] Monitoring dashboard shows invoice delivery status and exception tracking
- [ ] Trading partner agreement template created for EDI billing customers

---

### 7.10 Multi-Platform Customer Support

#### 7.10.1 Purpose

While Epic/Cloverleaf represents the fastest-growing segment of MVD's customer base, a significant portion of current and prospective customers operate on other EHR, LIS, and veterinary practice management platforms. Additionally, MVD's customers and prospects are accustomed to the integration experience provided by large national reference labs like **Quest Diagnostics** and **LabCorp**. To be a credible, scalable reference lab partner, MVD must support the full breadth of systems its customers run — and meet or exceed the integration quality bar set by national competitors.

This section defines the platform-specific considerations, message profile variations, and connectivity patterns for each major system in MVD's customer landscape.

#### 7.10.2 Customer Platform Landscape

**Human Healthcare:**

| Platform | Market Position | Integration Engine | HL7v2 Characteristics | Prevalence in MVD Customer Base |
|---|---|---|---|---|
| **Epic / Beaker** | Dominant in large health systems, growing in mid-size | Cloverleaf (Infor), Bridges (some), or native Epic integration | Highly standardized HL7v2; well-documented companion guides; FHIR-forward | Growing — primary focus of Sections 7.1–7.8 |
| **Oracle Health (Cerner)** | Major competitor to Epic; strong in federal/VA, mid-to-large hospitals | CareAware ConnectWorks (formerly Open Engine), some Cloverleaf | Generally standard HL7v2 but different conventions than Epic; Millennium-specific quirks in PID, ORC, OBR segment usage | Significant existing customer base |
| **MEDITECH** | Strong in community hospitals and critical access facilities | MEDITECH Gateway/Integration Platform, some Cloverleaf, some Rhapsody | **Highly variable by MEDITECH generation** — Magic and C/S have very non-standard HL7v2; Expanse is closer to standard but still has MEDITECH-specific patterns | Significant — many smaller hospital customers |

**Veterinary:**

| Platform | Market Position | Integration Approach | Data Characteristics | Prevalence in MVD Customer Base |
|---|---|---|---|---|
| **IDEXX VetConnect PLUS / Cornerstone** | Dominant in vet diagnostics and practice management | IDEXX proprietary integration protocols; some HL7v2 support via VetConnect PLUS API | Non-LOINC coding; species-specific specimen types; different demographic model (patient = animal, client = owner) | Significant — key vet market platform |
| **Antechwin (Antech/Mars)** | Major vet reference lab with practice management integration | Proprietary protocols; limited standard HL7v2 | Similar to IDEXX — proprietary coding, vet-specific data model | Present in MVD vet customer base |

#### 7.10.3 Architecture: Platform-Specific Adapters on a Common Core

The integration platform architecture separates the **common core** (compendium, Rhapsody processing logic, monitoring, change management) from **platform-specific adapters** that handle the message translation and connectivity differences.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MVD Integration Platform — Common Core                │
│                                                                          │
│  ┌───────────┐  ┌──────────────────────────────────────────────────┐    │
│  │ StarLIMS  │  │ Rhapsody Integration Engine                      │    │
│  │           │  │                                                   │    │
│  │           │  │  Common Processing Layer:                         │    │
│  │           │──│  ├─ Canonical message model (internal format)     │    │
│  │           │  │  ├─ Master compendium lookups                     │    │
│  │           │  │  ├─ Validation rules                              │    │
│  │           │  │  ├─ ACK/error handling                            │    │
│  │           │  │  └─ Monitoring & alerting                         │    │
│  └───────────┘  │                                                   │    │
│                  │  Platform-Specific Adapter Layer:                 │    │
│  ┌───────────┐  │  ├─ Epic/Beaker Adapter (HL7v2 profile)          │    │
│  │ Epicor    │  │  ├─ Cerner/Oracle Adapter (HL7v2 profile)        │    │
│  │ (ERP)     │  │  ├─ MEDITECH Adapter (per generation)            │    │
│  │           │──│  ├─ IDEXX Adapter (API/proprietary)               │    │
│  │           │  │  ├─ Antechwin Adapter (proprietary)               │    │
│  │           │  │  └─ Generic HL7v2 Adapter (catch-all)             │    │
│  └───────────┘  │                                                   │    │
│                  └──────────────┬───────────────────────────────────┘    │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
          ┌──────────┬───────────┼───────────┬──────────┐
          │          │           │           │          │
          ▼          ▼           ▼           ▼          ▼
   ┌──────────┐ ┌─────────┐ ┌────────┐ ┌───────┐ ┌────────┐
   │Epic/     │ │Cerner/  │ │MEDITECH│ │IDEXX  │ │Antech- │
   │Cloverleaf│ │CareAware│ │Gateway │ │VetCon.│ │win     │
   └──────────┘ └─────────┘ └────────┘ └───────┘ └────────┘
```

**Canonical Message Model:** Internally, Rhapsody translates all inbound orders to a common internal format before StarLIMS processing, and all outbound results from StarLIMS are first rendered in the internal format before being translated to the platform-specific output profile. This means the core processing logic (compendium validation, code mapping, duplicate detection, etc.) is written once and shared across all adapters.

#### 7.10.4 Oracle Health (Cerner) — Platform Profile

**Background:** Cerner (now Oracle Health) is Epic's primary competitor in the acute care EHR market. Many MVD customers currently run Cerner Millennium, and while some are migrating to Epic, many will remain on Cerner for years. The Cerner integration experience differs from Epic in several important ways.

**Integration Engine:**
- **CareAware ConnectWorks** (formerly Open Engine / Cerner Integration Architecture) is Cerner's native integration engine, analogous to Cloverleaf for Epic
- Some Cerner sites use **Cloverleaf** (same as Epic customers — this is a bonus, as MVD's Cloverleaf reference assets partially apply)
- Some sites use **Rhapsody** or **Mirth Connect** as their integration engine
- Connectivity patterns are similar to Epic: MLLP/MLLPS, VPN, SFTP all apply

**HL7v2 Message Profile Differences (vs. Epic):**

| Area | Epic Pattern | Cerner Pattern | Impact on MVD |
|---|---|---|---|
| Order code placement | OBR-4 (Universal Service ID) | OBR-4, but Cerner often uses different code set conventions | Adapter must handle Cerner-specific order code mappings |
| Result status workflow | Standard OBR-25 statuses | Generally standard, but Cerner has specific expectations for preliminary/final/corrected flow | Adapter result status mapping |
| Patient ID handling | PID-3 with assigning authority | PID-3, but Cerner often uses different identifier type codes and assigning authority formats | Adapter PID parsing rules |
| Ordering provider | ORC-12, OBR-16 | Similar but Cerner NPI/provider ID formatting varies | Adapter provider ID handling |
| Specimen handling | SPM segment (newer) or OBR-15 (legacy) | Varies — some Cerner sites still use OBR-15 heavily | Adapter must support both patterns |
| PDF report handling | OBX with ED datatype, Base64 | Similar, but Cerner's PowerChart display may have different size/format preferences | Test PDF rendering in both environments |
| AOE questions | OBR/OBX-based AOE | Cerner has specific AOE conventions tied to their order entry workflow | Adapter AOE mapping |

**Cerner-Specific Companion Guide Additions:**
- Cerner Millennium reference lab configuration guide (how to set up MVD in Cerner's reference lab module)
- CareAware ConnectWorks route configuration reference (analogous to the Cloverleaf reference assets)
- Cerner-specific code crosswalk tables
- Cerner-specific sample message library (order and result examples as Cerner generates/expects them)

**Key Opportunity:** Many Cerner sites are migrating to **Oracle Health's cloud platform**, which is FHIR-forward. MVD's FHIR investment (Section 7.8) may pay dividends in the Cerner customer base sooner than expected.

#### 7.10.5 MEDITECH — Platform Profile

**Background:** MEDITECH is the third major EHR vendor, dominant in community hospitals, critical access hospitals, and smaller health systems. MEDITECH integration is often the most challenging due to significant variations across platform generations.

**MEDITECH Generations:**

| Generation | Era | HL7v2 Compliance | Integration Complexity | Notes |
|---|---|---|---|---|
| **MEDITECH Magic** | Legacy (1990s–2000s) | Very non-standard; fixed-width fields, truncated segments, non-compliant date formats | **High** | Still running at many small hospitals; declining but not gone |
| **MEDITECH Client/Server (C/S)** | 2000s–2010s | Improved but still non-standard in many areas; MEDITECH-specific extensions | **Medium-High** | Common in community hospitals |
| **MEDITECH 6.x (Web/Performance)** | 2010s | More standard HL7v2 but still has MEDITECH quirks | **Medium** | Current generation for many sites |
| **MEDITECH Expanse** | Current | Closest to standard HL7v2; modern web-based platform; improving FHIR support | **Medium-Low** | New installations and migrations; converging toward standard |

**MEDITECH-Specific Challenges:**

*Message Structure Issues (especially Magic/C/S):*
- Truncated field lengths (e.g., patient name fields shorter than HL7 spec)
- Non-standard date/time formats (MEDITECH date format vs. HL7 YYYYMMDDHHMMSS)
- Missing or non-standard MSH fields (processing ID, version ID)
- Segment ordering deviations
- Fixed-width padding in variable-length fields
- Character encoding issues (especially with special characters in patient names)

*Integration Engine:*
- MEDITECH has its own built-in integration platform (NPR-based in legacy, Gateway in newer versions)
- Some MEDITECH sites use **Cloverleaf** (again, MVD's Cloverleaf assets help here)
- Some use **Rhapsody** (the Rhapsody community has MEDITECH-specific connectors)
- Some smaller sites use **Mirth Connect**
- MEDITECH sites are less likely to have dedicated integration analysts — the IT team may be 2–3 people

**Rhapsody Adapter Requirements (MEDITECH):**
- Inbound order parsing must handle MEDITECH-specific HL7v2 deviations per generation
- Outbound results must be formatted to match MEDITECH's expected structure (which may be more restrictive than standard HL7v2)
- Date/time format translation layer
- Field length management (truncate gracefully rather than reject)
- Generation-specific profiles (Magic profile vs. C/S profile vs. Expanse profile)

**MEDITECH-Specific Companion Guide Additions:**
- Generation-specific message profiles (at minimum: Expanse and C/S)
- MEDITECH-specific troubleshooting guide (common message rejection reasons)
- Simplified connectivity guide (MEDITECH sites may have less integration expertise)

#### 7.10.6 Veterinary Platforms — IDEXX & Antechwin

**Background:** MVD's veterinary market is a distinct integration domain with fundamentally different data models, regulatory requirements, and customer expectations. Veterinary practices are typically much smaller than hospitals, with less IT infrastructure and different software ecosystems.

**Key Differences from Human Healthcare Integration:**

| Dimension | Human Healthcare | Veterinary | Impact on MVD |
|---|---|---|---|
| **Patient model** | Patient = human person | Patient = animal; Client = animal owner | Different PID structure; species, breed, weight fields |
| **Identifiers** | MRN, SSN, insurance ID | Pet ID, microchip number, client account number | Different PID-3 usage |
| **Coding standards** | LOINC, CPT, ICD-10 mandatory | No LOINC mandate; proprietary codes common; VMDL codes emerging | Must maintain separate vet compendium coding |
| **Regulatory framework** | HIPAA, CLIA, CAP | No HIPAA (animal data isn't PHI); state vet lab regulations vary; AAVLD accreditation standards | Simplified compliance but different quality requirements |
| **Practice size** | 50–10,000+ bed hospitals | 1–20 veterinarian practices | Simpler integration needs but lower IT capability |
| **Connectivity** | MLLPS, VPN, dedicated integration engines | Often cloud-based APIs, simpler protocols | May need API-based rather than MLLP-based integration |
| **Specimen types** | Human specimen types | Species-specific specimens (canine serum, feline urine, equine BAL, avian tissue, etc.) | Compendium must include species-specific specimen requirements |
| **Reference ranges** | Human reference ranges | Species-specific reference ranges | Results must include species-appropriate ranges |

**IDEXX Integration:**

IDEXX is the dominant veterinary diagnostics company with both in-house analyzers and reference lab services. Their ecosystem includes:
- **IDEXX VetConnect PLUS** — cloud-based platform for reference lab results; has API access
- **Cornerstone** — practice management software with built-in integration
- **IDEXX proprietary protocols** — IDEXX has their own integration specifications for third-party reference labs

**MVD's IDEXX integration approach:**
- Determine whether IDEXX offers a **third-party reference lab integration pathway** through VetConnect PLUS (this is the cleanest path — results appear in the same portal veterinarians already use for IDEXX results)
- If not available, build direct integration to the veterinary practice's PMS (Practice Management System) which may be Cornerstone, AVImark, Impromed, or others
- Consider whether Rhapsody or a simpler integration method (API-to-API, SFTP file exchange) is appropriate given the smaller scale of vet practices

**Antechwin Integration:**

Antechwin is Antech Diagnostics' (Mars Petcare) practice management integration. Antech is MVD's direct competitor in veterinary fungal diagnostics reference lab services, so the integration approach here is sensitive:
- MVD needs to integrate with practices that **also use Antech** for other tests
- The integration must coexist with Antech's existing interface without conflicts
- Antechwin typically connects via proprietary protocols to the practice management system
- MVD's integration would likely be a **separate connection** to the practice management system, not through Antechwin itself

**Veterinary Compendium Considerations:**
The master compendium (Section 7.3) must be extended with veterinary-specific data:

```json
{
  "mvd_test_code": "HISTO_AG_VET",
  "test_name": "Histoplasma Antigen, Quantitative (Veterinary)",
  "test_category": "Fungal Antigen",
  "market": "veterinary",
  "applicable_species": ["canine", "feline", "equine", "other"],
  "specimen_requirements": {
    "canine": {
      "preferred_specimen": "Serum",
      "minimum_volume_ml": 0.5,
      "container": "Red top or SST"
    },
    "feline": {
      "preferred_specimen": "Serum",
      "minimum_volume_ml": 0.3,
      "container": "Red top or SST"
    }
  },
  "result_components": [
    {
      "component_code": "HISTO_AG_QUANT_VET",
      "reference_ranges": {
        "canine": { "normal_high": 0.4, "units": "ng/mL" },
        "feline": { "normal_high": 0.4, "units": "ng/mL" }
      }
    }
  ],
  "coding": {
    "loinc": null,
    "mvd_internal": "HISTO_AG_VET",
    "idexx_equivalent": null,
    "vmdl_code": null
  }
}
```

#### 7.10.7 Quest Diagnostics — Competitive Reference Model

**Why Quest Matters:** Quest Diagnostics is the largest reference laboratory in the United States. Nearly every hospital and health system that uses MVD for fungal diagnostics also has a Quest interface for their broad-menu reference lab needs. Quest's integration program sets the **de facto standard** that MVD's customers will benchmark against.

**What Quest Does Well (and MVD Should Emulate):**

| Quest Capability | Description | MVD Equivalent |
|---|---|---|
| **Published Companion Guide** | Quest publishes a comprehensive HL7v2 interface specification (the "Quest Connectivity Guide") that covers message profiles, code mappings, and connectivity requirements | Section 7.1 — MVD Integration Companion Guide |
| **Standardized Compendium Distribution** | Quest provides a machine-readable test directory (the "Quest Test Menu") with LOINC mappings, specimen requirements, and CPT codes, updated regularly | Section 7.3 — Compendium Management & Distribution System |
| **Pre-Built EHR Integration Packages** | Quest has certified integrations with Epic (via App Orchard/App Market), Cerner, MEDITECH, and others. Customers can enable Quest integration with minimal custom work. | Sections 7.8, 7.10 — Platform-specific adapters and Epic App Market |
| **Standardized Connectivity** | Quest offers multiple connectivity tiers (direct connect, VPN, clearinghouse-mediated, web portal) with documented parameters | Section 7.7 — Connectivity & Transport Layer |
| **Web Portal for Order Entry/Results** | Quest Care360 provides a web-based portal for customers without EHR integration, plus results delivery and compendium search | Section 12.3 — Future: Electronic Order Requisition |
| **Proactive Change Communication** | Quest publishes test updates, LOINC changes, and compendium updates on a regular cadence with structured notifications | Section 7.6 — Change Management Process |
| **Dedicated Integration Support Team** | Quest has a dedicated team for onboarding and supporting customer integrations | Resource/staffing consideration for MVD |

**What MVD Can Do Better Than Quest (Niche Advantages):**

- **Fungal Diagnostics Expertise:** MVD's compendium is focused and specialized — customers get deep fungal diagnostics expertise rather than one lab among thousands in a mega-menu. The companion guide can include clinical guidance that Quest's generic guide wouldn't.
- **Personalized Service:** MVD can offer direct access to integration engineers and lab directors. Quest's scale means customers often navigate call centers and ticketing systems.
- **Agility:** MVD can respond to integration requests, compendium changes, and custom requirements faster than Quest's change management process allows.
- **Veterinary Market:** Quest is primarily human healthcare. MVD's dual human/vet capability is a differentiator that Quest doesn't address.

**Tactical Recommendation:** Obtain a copy of Quest's current HL7v2 companion guide (customers can usually share it, or it may be available through Quest's partner portal). Study its structure and conventions. Where possible, align MVD's companion guide structure and terminology with Quest's — not to copy, but so that **customers' integration teams encounter a familiar document format** when onboarding MVD. If a Cloverleaf analyst has built a Quest interface before, the MVD interface should feel like a natural extension, not a completely foreign exercise.

**Additional Competitive Intel to Gather:**
- LabCorp's integration specifications (similar to Quest's, second-largest national reference lab)
- ARUP Laboratories' integration approach (academic reference lab, strong in specialty testing — most analogous to MVD's model)
- Mayo Clinic Laboratories' integration model (another specialty reference lab)

#### 7.10.8 Platform-Specific Companion Guide Strategy

Rather than one monolithic companion guide, MVD should maintain a **modular documentation structure:**

```
MVD Integration Companion Guide
├── Volume 1: Universal Specification (platform-agnostic)
│   ├── MVD overview and service description
│   ├── Test compendium overview and access instructions
│   ├── General HL7v2 message specifications (canonical profiles)
│   ├── Connectivity options (all tiers)
│   ├── Testing methodology and toolkit overview
│   └── Change management process
│
├── Volume 2: Platform-Specific Supplements
│   ├── Supplement A: Epic / Beaker
│   │   ├── Epic-specific message profile variations
│   │   ├── Cloverleaf reference assets
│   │   ├── Epic Beaker reference lab configuration guide
│   │   └── Epic-specific sample messages
│   │
│   ├── Supplement B: Oracle Health (Cerner)
│   │   ├── Cerner-specific message profile variations
│   │   ├── CareAware ConnectWorks configuration reference
│   │   └── Cerner-specific sample messages
│   │
│   ├── Supplement C: MEDITECH
│   │   ├── Generation-specific message profiles (Expanse, 6.x, C/S)
│   │   ├── MEDITECH Gateway/integration platform notes
│   │   ├── Common MEDITECH integration issues and solutions
│   │   └── MEDITECH-specific sample messages
│   │
│   ├── Supplement D: Veterinary (IDEXX/General Vet PMS)
│   │   ├── Veterinary data model differences
│   │   ├── Species-specific compendium
│   │   ├── IDEXX VetConnect integration pathway (if applicable)
│   │   └── Vet-specific sample messages
│   │
│   └── Supplement E: Generic HL7v2 (Other Systems)
│       ├── Generic HL7v2 2.5.1 profile (for systems not covered above)
│       └── Integration questionnaire for unknown platforms
│
└── Volume 3: EDI / Client Billing
    ├── 810 Invoice specification
    ├── 820 Remittance specification
    ├── Trading partner onboarding guide
    └── Cash application integration options
```

**Benefit:** A customer running Cerner receives Volume 1 + Supplement B. A vet customer running IDEXX receives Volume 1 + Supplement D. This keeps the core consistent while allowing platform-specific detail without overwhelming anyone with irrelevant information.

#### 7.10.9 Rhapsody Adapter Template Matrix

Each platform adapter in Rhapsody consists of:

| Component | Epic Adapter | Cerner Adapter | MEDITECH Adapter | Vet/IDEXX Adapter | Generic HL7v2 |
|---|---|---|---|---|---|
| **Inbound Order Parser** | Epic ORM profile | Cerner ORM profile | MEDITECH ORM profile (per generation) | Vet-specific order format | Standard HL7v2 ORM |
| **Outbound Result Builder** | Epic ORU profile | Cerner ORU profile | MEDITECH ORU profile (per generation) | Vet-specific result format | Standard HL7v2 ORU |
| **Code Crosswalk Tables** | Epic order codes ↔ MVD | Cerner order codes ↔ MVD | MEDITECH order codes ↔ MVD | IDEXX codes ↔ MVD | Customer-specific |
| **Connectivity Template** | MLLPS/Cloverleaf | MLLPS/CareAware | MLLPS/MEDITECH Gateway | API/SFTP | MLLPS/VPN/SFTP |
| **Sample Message Library** | Epic-flavored messages | Cerner-flavored messages | MEDITECH-flavored messages (per gen) | Vet-format messages | Standard messages |
| **Known Quirk Handling** | Epic-specific transformations | Cerner-specific transformations | MEDITECH date/field/encoding fixes | Species/breed field handling | Minimal |

**Implementation Priority:**

| Adapter | Priority | Rationale |
|---|---|---|
| Epic / Beaker | **P1 — Immediate** | Fastest-growing customer segment; best-documented; Sections 7.1–7.8 already address |
| Generic HL7v2 | **P1 — Immediate** | Catch-all for customers not in other categories; built as part of the canonical message model |
| Cerner / Oracle | **P2 — Near-term** | Significant existing customer base; similar enough to Epic that the Delta is manageable |
| MEDITECH | **P3 — Mid-term** | Important customer segment but higher per-customer variability; start with Expanse, then work backward to C/S |
| Vet / IDEXX | **P3 — Mid-term** | Different data model requires dedicated design; need to investigate IDEXX integration pathways first |
| Vet / Antechwin | **P4 — Long-term** | Competitive sensitivity; smaller volume; investigate after IDEXX pathway is established |

#### 7.10.10 Regulatory Considerations by Market

| Requirement | Human Healthcare | Veterinary | Notes |
|---|---|---|---|
| **HIPAA** | Required (all patient data is PHI) | **Not applicable** (animal health data is not PHI) | Vet interfaces may use simpler security; client/owner contact info may still warrant protection |
| **CLIA** | Required (clinical lab testing) | Generally not applicable for vet-only testing; some states have vet lab regs | Confirm per-state requirements |
| **CAP Accreditation** | Applicable | AAVLD accreditation is the vet equivalent | Different quality standards and inspection processes |
| **LOINC Coding** | Required for interoperability and ELR | Not required; proprietary codes acceptable | Maintain separate coding systems for vet compendium |
| **Electronic Lab Reporting (ELR)** | Required for reportable conditions (e.g., fungal infections in some jurisdictions) | Not typically required via ELR; NAHLN/state vet labs have separate reporting | MVD's HL7v2 ELR system (human side) is separate from vet integration |
| **State Licensing** | State clinical lab license required per state where MVD reports results | State vet lab licensing varies | Confirm licensure requirements for each state MVD serves in both markets |

#### 7.10.11 Acceptance Criteria
- [ ] Platform landscape documented with current customer counts per EHR/LIS/PMS
- [ ] Canonical internal message model defined in Rhapsody (platform-agnostic)
- [ ] Epic adapter operational (baseline — already in progress per Sections 7.1–7.8)
- [ ] Cerner message profile differences documented from at least 2 existing Cerner customers
- [ ] MEDITECH generation inventory completed (which customers run which generation)
- [ ] IDEXX VetConnect PLUS third-party integration pathway investigated and documented
- [ ] Quest Diagnostics companion guide obtained and analyzed for structural alignment
- [ ] Modular companion guide structure implemented (Volume 1 + at least 2 Supplements)
- [ ] Veterinary compendium data model defined (species, breed, species-specific reference ranges)
- [ ] Rhapsody adapter template architecture implemented with at least Epic + Generic adapters

---

## 8. Security & Compliance Requirements

### 8.1 HIPAA

All integration components must comply with HIPAA Security Rule requirements:
- **Encryption in transit:** All ePHI transmitted over public networks must be encrypted (TLS 1.2+ for MLLPS, IPsec for VPN, SSH for SFTP)
- **Access controls:** Customer portal and API access authenticated and authorized per customer
- **Audit logging:** All message transactions logged with sufficient detail for audit (timestamp, source, destination, message type, patient identifier hash, status)
- **BAA coverage:** Integration services covered under existing Business Associate Agreements with customers
- **Breach notification:** Message logging and monitoring sufficient to identify and report unauthorized access

### 8.2 CLIA / CAP

- Interface validation must be documented per CLIA requirements for electronic reporting
- Test result accuracy through the interface must be validated before go-live (part of UAT)
- Changes to interfaces that affect result reporting must follow QMS change control
- Interface validation documentation maintained as quality records

### 8.3 State Electronic Laboratory Reporting (ELR)

- Some MVD results may require public health reporting. The integration architecture should not interfere with or duplicate ELR obligations.
- Clarify with each customer whether MVD or the customer is responsible for ELR submission for reference lab results.

### 8.4 Security Standards for Connectivity

| Transport | Encryption | Authentication | Key/Certificate Management |
|---|---|---|---|
| MLLPS | TLS 1.2+ | Mutual TLS (client + server certs) | Annual certificate rotation, 2048-bit RSA minimum |
| VPN | IPsec (AES-256) | Pre-shared key or certificate | Annual key rotation |
| SFTP | SSH | SSH key pair | Annual key rotation, password auth disabled |
| FHIR/HTTPS | TLS 1.2+ | OAuth 2.0 (SMART on FHIR) | Token expiry per OAuth spec |

---

## 9. Phased Roadmap

### 9.1 Roadmap Overview

The roadmap is organized into **6 phases over 24 months**, with work distributed across **5 parallel workstreams**. Each phase has a clear theme and gate criteria that must be met before advancing. The phases are designed so that high-value, low-dependency items are delivered first, and each phase builds on the foundation of the previous one.

**Workstreams:**

| ID | Workstream | Description | PRD Sections |
|---|---|---|---|
| **WS-1** | Clinical Integration Core | Companion guide, Rhapsody templates, compendium system, testing toolkit, change management | 7.1–7.6 |
| **WS-2** | Connectivity & Transport | MLLPS, VPN, SFTP standardization; Epic App Market/FHIR exploration | 7.7, 7.8 |
| **WS-3** | EDI / Client Billing | 810 invoicing, 820/cash application, Epicor integration | 7.9 |
| **WS-4** | Multi-Platform Expansion | Cerner, MEDITECH, IDEXX, Antechwin adapters; Quest competitive alignment | 7.10 |
| **WS-5** | Operational Excellence | Monitoring, alerting, dashboards, process maturity, staffing | Cross-cutting |

**Visual Roadmap:**

```
Month:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24
        ├───────────┼───────────┼───────────┼───────────┼───────────────────┼───────────────────────┤
Phase:  │  Phase 1  │  Phase 2  │  Phase 3  │  Phase 4  │     Phase 5       │       Phase 6         │
        │Foundation │ Validate  │Operatn'lz │  Scale    │  Multi-Platform   │    Modernize          │
        │& Discovery│ & Pilot   │ & EDI     │  Epic     │   Expansion       │    & Optimize         │
        │           │           │           │           │                   │                       │
WS-1:   ██████████████████████████████████████████████████ ─ ─ ─ ─ ─ ─ ─ ─ ─  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
WS-2:   ████████████████████████ ─ ─ ─ ─ ─ ██████████████ ─ ─ ─ ─ ─ ─ ─ ─ ─ ████████████████████████
WS-3:   ─ ─ ─ ─ ─ ████████████████████████████████████████████████████████████ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
WS-4:   ████ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ─ ─ ─ ─ ─ ─ ████████████████████████████████████████████
WS-5:   ─ ─ ─ ─ ─ ─ ─ ─ ████████████████████████████████████████████████████████████████████████████

Legend: ████ = Active build/delivery    ─ ─ = Maintenance/iteration    (blank) = Not started
```

---

### 9.2 Phase 1: Foundation & Discovery (Months 1–3)

**Theme:** Build the core artifacts and conduct critical discovery that unblocks everything else.
**Gate Criteria:** Companion Guide v1.0 published. Rhapsody Epic template routes functional. StarLIMS compendium extract working. Current-state billing workflow documented.

#### WS-1: Clinical Integration Core

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.1 | Obtain and analyze Quest Diagnostics companion guide | None | Integration Engineer | Month 1 | Study structure, conventions, and scope as reference model |
| 1.2 | Obtain and analyze LabCorp / ARUP integration specs | None | Integration Engineer | Month 1 | Secondary reference; ARUP most analogous to MVD |
| 1.3 | Define master compendium data model (JSON schema) | None | Integration Engineer + Lab Director | Month 1 | Core data model that everything else builds on |
| 1.4 | Build initial StarLIMS compendium extract | 1.3 | Integration Engineer | Month 2 | Script or query to pull structured test data from StarLIMS |
| 1.5 | Validate compendium extract against all current orderable tests | 1.4 | Integration Engineer + Lab Director | Month 2 | QA step — every test, every LOINC, every specimen type verified |
| 1.6 | Draft Integration Companion Guide v1.0 — Volume 1 (Universal) | 1.1, 1.3 | Integration Engineer + Lab Director | Month 2 | Platform-agnostic message specs, compendium overview, connectivity, testing |
| 1.7 | Draft Integration Companion Guide — Supplement A (Epic/Beaker) | 1.6 | Integration Engineer | Month 3 | Epic-specific message profiles, Cloverleaf reference, sample messages |
| 1.8 | Build Rhapsody canonical message model | 1.3 | Integration Engineer | Month 2 | Internal message format — the common core all adapters translate to/from |
| 1.9 | Build Rhapsody Epic inbound order template route | 1.8 | Integration Engineer | Month 2 | Configurable template with per-customer lookup tables |
| 1.10 | Build Rhapsody Epic outbound result template route | 1.8, 1.4 | Integration Engineer | Month 3 | Includes LOINC mapping from compendium, PDF attachment handling |
| 1.11 | Build sample message library (connectivity + parsing test phases) | 1.6 | Integration Engineer | Month 3 | Phase 1 and Phase 2 test messages per the testing toolkit design |
| 1.12 | Build connectivity validation scripts (PowerShell 5.1) | None | Integration Engineer / GRC | Month 2 | TCP, TLS handshake, MLLP echo, throughput tests |

#### WS-2: Connectivity & Transport

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 2.1 | Document MVD standard MLLPS parameters (certs, ciphers, ports) | None | Integration Engineer / GRC | Month 1 | Becomes Section 2 of Companion Guide |
| 2.2 | Document MVD standard VPN parameters (IKE, IPsec) | None | Integration Engineer / GRC | Month 1 | Fallback connectivity option, pre-documented |
| 2.3 | Document MVD standard SFTP parameters | None | Integration Engineer / GRC | Month 1 | Third connectivity tier |
| 2.4 | Build connectivity onboarding checklist (all tiers) | 2.1–2.3 | Integration Engineer | Month 2 | Standardized per-customer checklist |

#### WS-3: EDI / Client Billing (Discovery Only)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 3.1 | Document current billing workflow end-to-end | None | Integration Engineer + Finance/Billing | Month 2 | StarLIMS charge capture → Epicor → invoice delivery → payment receipt → cash application |
| 3.2 | Identify Epicor invoice export capabilities | 3.1 | Integration Engineer + Epicor Admin | Month 2 | CSV, XML, REST API, database — what's available? |
| 3.3 | Identify Epicor payment import capabilities | 3.1 | Integration Engineer + Epicor Admin | Month 2 | How to automate cash application posting |
| 3.4 | Contact bank re: BAI2 file availability and SFTP delivery | None | Finance + Integration Engineer | Month 1 | Foundation for Tier 2 cash application |
| 3.5 | Collect sample remittance documents from top 10 customers by volume | None | Finance/Billing | Month 2 | Assess format consistency for email parsing feasibility |
| 3.6 | Confirm Rhapsody EDI/X12 module licensing | None | Integration Engineer + Rhapsody vendor | Month 1 | Ensure 810/820/812 processing is included in current license |

#### WS-4: Multi-Platform Expansion (Discovery Only)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 4.1 | Customer platform inventory — survey all current customers | None | Integration Engineer + Account Management | Month 1 | Which EHR/LIS/PMS, which version, which integration engine |
| 4.2 | MEDITECH generation inventory (Magic, C/S, 6.x, Expanse) | 4.1 | Integration Engineer | Month 2 | Drives adapter priority |
| 4.3 | Collect HL7v2 message samples from 2+ Cerner customers | 4.1 | Integration Engineer | Month 2 | Document differences from Epic profiles |
| 4.4 | Investigate IDEXX VetConnect third-party integration pathway | None | Integration Engineer + Lab Director | Month 2 | Contact IDEXX partner programs |
| 4.5 | Veterinary PMS landscape survey | 4.1 | Integration Engineer | Month 2 | Cornerstone, AVImark, eVetPractice, etc. |

---

### 9.3 Phase 2: Validate & Pilot (Months 3–5)

**Theme:** Validate the foundation with a real Epic/Cloverleaf customer. Build distribution mechanisms.
**Gate Criteria:** At least 1 Epic customer successfully onboarded using standardized platform. Compendium distribution operational. Test toolkit validated in production.

#### WS-1: Clinical Integration Core

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.13 | Generate compendium distribution files (JSON, CSV, Cloverleaf crosswalk) | 1.4, 1.5 | Integration Engineer | Month 4 | All three formats from single source of truth |
| 1.14 | Build code crosswalk tables for all current tests | 1.4 | Integration Engineer | Month 4 | MVD ↔ LOINC ↔ Epic suggested codes |
| 1.15 | Write Cloverleaf translation documentation | 1.7, 1.14 | Integration Engineer | Month 4 | Field-by-field mapping guides for Cloverleaf analysts |
| 1.16 | Complete sample message library (all test phases including edge cases) | 1.11 | Integration Engineer | Month 4 | Full Phase 1–4 message library per toolkit design |
| 1.17 | Build structured test plan template | 1.16 | Integration Engineer + Quality | Month 4 | Pre-populated with all standard test cases |
| 1.18 | **Pilot: Onboard 1st Epic/Cloverleaf customer using standardized platform** | 1.6–1.12, 1.14–1.17 | Integration Engineer | Month 5 | **Key milestone** — validate the entire approach end-to-end |
| 1.19 | Customer portal v1 (authenticated download for compendium + docs) | 1.13 | IT / Integration Engineer | Month 5 | Can start as simple authenticated SharePoint/file share |

#### WS-2: Connectivity & Transport

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 2.5 | Validate MLLPS connectivity with pilot customer | 2.1, 1.18 | Integration Engineer | Month 4 | Or VPN if customer requires — test both if possible |
| 2.6 | Document lessons learned from pilot connectivity setup | 2.5 | Integration Engineer | Month 5 | Feed back into companion guide and checklist |

---

### 9.4 Phase 3: Operationalize & EDI Build (Months 5–8)

**Theme:** Formalize operational processes. Build EDI billing capability. Incorporate pilot lessons.
**Gate Criteria:** Change management process QMS-integrated. Monitoring dashboard operational. First 810 test invoice generated. Bank file (BAI2) cash application prototype working.

#### WS-1: Clinical Integration Core

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.20 | Incorporate pilot customer feedback into all artifacts | 1.18 | Integration Engineer | Month 6 | Companion guide, templates, crosswalks, test plan |
| 1.21 | Companion Guide v1.1 (post-pilot update) | 1.20 | Integration Engineer | Month 6 | |
| 1.22 | First compendium change cycle (structured release + notification) | 1.13, 1.24 | Integration Engineer + Lab Director | Month 7 | Prove the process works with a real test update |

#### WS-1 + WS-5: Change Management & Monitoring

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.23 | Document change management SOP | 1.18 | Quality + Integration Engineer | Month 6 | Categories, lead times, bulletin format, QMS integration |
| 1.24 | Build automated change notification system | 1.23, 1.19 | Integration Engineer | Month 7 | Email notifications triggered by compendium version release |
| 1.25 | Change bulletin template and first live bulletin | 1.23 | Integration + Quality | Month 7 | Test with a real change (new assay or LOINC update) |
| 5.1 | Build Rhapsody monitoring dashboard (per-customer) | 1.18 | Integration Engineer | Month 6 | Message volumes, error rates, queue depths, connection status |
| 5.2 | Configure alerting rules | 5.1 | Integration Engineer | Month 6 | Connection down, error rate threshold, dead-letter queue |

#### WS-3: EDI / Client Billing (Build)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 3.7 | Define X12 810 invoice specification (segment-level) | 3.1, 3.2 | Integration Engineer | Month 6 | Based on billing workflow discovery from Phase 1 |
| 3.8 | Build Epicor → Rhapsody invoice data feed | 3.2, 3.7 | Integration Engineer | Month 6 | Extract invoice data from Epicor in structured format |
| 3.9 | Build Rhapsody 810 outbound template route | 3.7, 3.8 | Integration Engineer | Month 7 | Configurable per customer trading partner |
| 3.10 | Build Rhapsody 997/999 acknowledgment processing route | 3.9 | Integration Engineer | Month 7 | |
| 3.11 | Internal end-to-end 810 test (Epicor → Rhapsody → test file) | 3.8–3.10 | Integration Engineer | Month 7 | Validate invoice generation without customer involvement |
| 3.12 | Build BAI2 bank file parser (Tier 2 cash application) | 3.3, 3.4 | Integration Engineer | Month 7 | Parse bank reporting file, extract payment + addenda |
| 3.13 | Build Rhapsody → Epicor payment posting feed | 3.3, 3.12 | Integration Engineer | Month 8 | Automated cash application from bank file data |
| 3.14 | Test BAI2 cash application with real bank file data | 3.12, 3.13 | Integration Engineer + Finance | Month 8 | Validate matching and posting accuracy |
| 3.15 | Identify 1–2 pilot customers for 810 EDI billing | 3.11 | Account Management + Integration | Month 7 | Customers with mature AP that would benefit from EDI invoicing |

---

### 9.5 Phase 4: Scale Epic & Launch EDI (Months 8–12)

**Theme:** Onboard additional Epic customers. Go live with EDI billing. Begin Cerner adapter work.
**Gate Criteria:** 3+ Epic customers live on standardized platform. At least 1 customer receiving 810 invoices. BAI2 cash application operational in production. Cerner adapter functional.

#### WS-1: Clinical Integration Core (Scale)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.26 | Onboard 2nd Epic/Cloverleaf customer | 1.21, 1.18 | Integration Engineer | Month 9 | Target: 2 weeks integration work (measure improvement) |
| 1.27 | Onboard 3rd Epic/Cloverleaf customer | 1.26 | Integration Engineer | Month 11 | Target: further time reduction |
| 1.28 | Measure and report on onboarding time improvements | 1.26, 1.27 | Integration + Management | Month 11 | Compare against 16–20 week baseline |
| 1.29 | Compendium API endpoint v1 | 1.19 | IT / Development | Month 12 | RESTful API for programmatic compendium access |

#### WS-2: Connectivity & FHIR

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 2.7 | Register for Epic App Market developer access | None | Integration Engineer | Month 8 | Begin the process — certification takes 3–6 months |
| 2.8 | FHIR R4 profile gap analysis (Epic reference lab profiles vs. MVD data) | 2.7 | Integration Engineer | Month 9 | Document what's supported, what's missing, what's different |
| 2.9 | FHIR architecture decision document | 2.8 | Integration + IT Leadership | Month 10 | Direct StarLIMS↔FHIR vs. Rhapsody-mediated translation |

#### WS-3: EDI / Client Billing (Go Live)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 3.16 | Establish 810 connectivity with pilot customer | 3.11, 3.15 | Integration Engineer | Month 9 | Exchange test invoices, validate customer AP import |
| 3.17 | Run parallel billing period (EDI + existing method) | 3.16 | Integration Engineer + Finance | Month 10 | At least 1 full billing cycle with reconciliation |
| 3.18 | Production cutover for 810 pilot customer | 3.17 | Integration Engineer + Finance | Month 10 | **Key milestone** — first customer on EDI billing |
| 3.19 | Build Rhapsody 820 inbound template route | 3.7 | Integration Engineer | Month 10 | For customers willing to send structured remittance |
| 3.20 | Build Rhapsody 812 credit/debit adjustment route | 3.9 | Integration Engineer | Month 11 | |
| 3.21 | Onboard 2nd EDI billing customer | 3.18 | Integration Engineer | Month 12 | |
| 3.22 | BAI2 cash application production cutover | 3.14 | Integration Engineer + Finance | Month 9 | **Key milestone** — automated cash application live |
| 3.23 | Build email remittance parsing for top 3 customers (Tier 3) | 3.5, 3.22 | Integration Engineer | Month 12 | Template-based parsing for highest-volume email remitters |
| 3.24 | Trading partner agreement template finalized | 3.18 | Integration + Legal | Month 10 | Standard agreement for EDI billing customers |

#### WS-4: Multi-Platform — Cerner Adapter

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 4.6 | Document Cerner HL7v2 profile differences (from Phase 1 samples) | 4.3 | Integration Engineer | Month 9 | Formal delta document vs. Epic profiles |
| 4.7 | Build Rhapsody Cerner inbound order adapter | 1.8, 4.6 | Integration Engineer | Month 10 | Based on canonical model + Cerner-specific translation |
| 4.8 | Build Rhapsody Cerner outbound result adapter | 1.8, 4.6 | Integration Engineer | Month 11 | |
| 4.9 | Draft Companion Guide Supplement B (Cerner/Oracle Health) | 4.6 | Integration Engineer | Month 11 | CareAware ConnectWorks configuration reference |
| 4.10 | Build Cerner-specific sample message library | 4.6 | Integration Engineer | Month 11 | |
| 4.11 | Pilot Cerner adapter with 1 existing Cerner customer | 4.7–4.10 | Integration Engineer | Month 12 | Validate against real Cerner environment |

---

### 9.6 Phase 5: Multi-Platform Expansion (Months 12–18)

**Theme:** Extend the platform to MEDITECH and veterinary markets. Mature EDI operations. Begin FHIR development.
**Gate Criteria:** MEDITECH Expanse adapter functional. Veterinary integration pathway defined. EDI billing operational for 5+ customers. FHIR sandbox app functional.

#### WS-1: Clinical Integration Core (Maintenance)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 1.30 | Continue Epic customer onboarding (target: 2 per quarter) | Ongoing | Integration Engineer | Ongoing | Should be routine configuration exercise by now |
| 1.31 | Continue Cerner customer onboarding | 4.11 | Integration Engineer | Ongoing | Validate Cerner adapter with additional customers |
| 1.32 | Companion Guide v2.0 (major revision incorporating all platform supplements) | All supplements | Integration Engineer | Month 15 | Comprehensive multi-platform document set |
| 1.33 | Compendium distribution system v2 (automated pipeline from StarLIMS) | 1.29, 1.4 | Integration Engineer | Month 14 | Scheduled extract → version → publish → notify pipeline |

#### WS-2: FHIR Development

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 2.10 | Build FHIR R4 reference lab application (Epic sandbox) | 2.9 | Integration Engineer / Developer | Month 14 | ServiceRequest → DiagnosticReport/Observation |
| 2.11 | Implement SMART on FHIR (OAuth 2.0) authentication | 2.10 | Integration Engineer / Developer | Month 15 | |
| 2.12 | Map MVD compendium to FHIR ValueSets/CodeSystems | 2.10, 1.4 | Integration Engineer | Month 15 | |
| 2.13 | Submit to Epic App Market for certification review | 2.10–2.12 | Integration Engineer | Month 16 | 3–6 month review process begins |
| 2.14 | Explore Oracle Health FHIR reference lab APIs | 2.8 | Integration Engineer | Month 15 | Cerner/Oracle is also pushing FHIR adoption |

#### WS-3: EDI / Client Billing (Optimization)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 3.25 | Onboard customers 3–5 onto 810 EDI billing | 3.21 | Integration Engineer | Months 13–16 | Scale routine |
| 3.26 | Build EDI monitoring dashboard | 3.18, 5.1 | Integration Engineer | Month 13 | Invoice volume, delivery confirmation, A/R aging, exceptions |
| 3.27 | Expand email remittance parsing to top 10 customers | 3.23 | Integration Engineer | Month 15 | Incremental template development |
| 3.28 | Evaluate customer payment portal feasibility (Tier 5) | 3.22 | Integration + IT Leadership | Month 16 | Build vs. buy assessment |

#### WS-4: Multi-Platform — MEDITECH & Veterinary

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 4.12 | Build Rhapsody MEDITECH Expanse inbound order adapter | 1.8, 4.2 | Integration Engineer | Month 13 | Start with newest, most standard MEDITECH generation |
| 4.13 | Build Rhapsody MEDITECH Expanse outbound result adapter | 1.8, 4.2 | Integration Engineer | Month 14 | |
| 4.14 | Draft Companion Guide Supplement C (MEDITECH) | 4.12 | Integration Engineer | Month 14 | Generation-specific profiles, common issues |
| 4.15 | Pilot MEDITECH Expanse adapter with 1 customer | 4.12–4.14 | Integration Engineer | Month 15 | |
| 4.16 | Build MEDITECH C/S adapter (if customer demand warrants) | 4.15 | Integration Engineer | Month 17 | Backward-compatibility for legacy MEDITECH sites |
| 4.17 | Define veterinary compendium data model extension | 1.3, 4.4 | Integration Engineer + Lab Director | Month 13 | Species, breed, species-specific reference ranges |
| 4.18 | Build veterinary compendium extract from StarLIMS | 4.17 | Integration Engineer | Month 14 | Parallel to human compendium but with vet-specific fields |
| 4.19 | Determine IDEXX VetConnect integration architecture | 4.4 | Integration Engineer | Month 14 | API-based? File exchange? Direct PMS integration? |
| 4.20 | Build Rhapsody veterinary adapter (IDEXX or generic vet PMS) | 4.17–4.19 | Integration Engineer | Month 16 | Depends on IDEXX investigation outcome |
| 4.21 | Draft Companion Guide Supplement D (Veterinary) | 4.17, 4.20 | Integration Engineer | Month 17 | Vet data model, species-specific compendium, PMS integration |
| 4.22 | Pilot veterinary integration with 1 vet customer | 4.20, 4.21 | Integration Engineer | Month 18 | |

#### WS-5: Operational Excellence

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 5.3 | Unified monitoring dashboard (clinical + EDI, all platforms) | 5.1, 3.26 | Integration Engineer | Month 14 | Single pane of glass across all customer interfaces |
| 5.4 | Operational runbook (troubleshooting, escalation, common issues) | 1.18, 4.11 | Integration Engineer | Month 15 | Enables knowledge transfer and team growth |
| 5.5 | Staffing assessment and business case for dedicated integration team | All | Integration + Management | Month 15 | Based on customer volume, platform count, and workload data |

---

### 9.7 Phase 6: Modernize & Optimize (Months 18–24)

**Theme:** FHIR go-live. Platform maturity. Advanced capabilities.
**Gate Criteria:** Epic FHIR app certified and published. All 4 platform adapters (Epic, Cerner, MEDITECH, Vet) operational. EDI billing operational for 10+ customers. Integration platform fully productized.

#### WS-2: FHIR Go-Live

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 2.15 | Epic App Market certification received | 2.13 | Integration Engineer | Month 19 | Timing dependent on Epic's review process |
| 2.16 | Publish MVD on Epic App Market | 2.15 | Integration Engineer | Month 19 | Available for any Epic customer to activate |
| 2.17 | FHIR pilot with 1–2 willing Epic customers | 2.16 | Integration Engineer | Month 21 | Validate real-world FHIR workflow |
| 2.18 | Offer FHIR as alternative onboarding path alongside HL7v2 | 2.17 | Integration Engineer | Month 22 | Customers choose HL7v2 or FHIR based on preference |

#### WS-4: Platform Completion

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 4.23 | Generic HL7v2 adapter (catch-all for uncommon platforms) | 1.8 | Integration Engineer | Month 19 | Standard HL7v2 2.5.1 profile with customer-specific config |
| 4.24 | Companion Guide Supplement E (Generic HL7v2) | 4.23 | Integration Engineer | Month 20 | Includes integration questionnaire for unknown platforms |
| 4.25 | Antechwin/vet competitive analysis and integration decision | 4.22 | Integration + Lab Director | Month 20 | Build adapter or defer based on vet market demand |
| 4.26 | Companion Guide v3.0 — complete modular document set | All supplements | Integration Engineer | Month 22 | Full Volume 1 + Supplements A–E + Volume 3 (EDI) |

#### Advanced Capabilities (All Workstreams)

| # | Deliverable | Dependencies | Owner | Target | Notes |
|---|---|---|---|---|---|
| 6.1 | Bidirectional order status updates (HL7v2 and/or FHIR) | 1.10, 2.17 | Integration Engineer | Month 20 | Received → In Process → Resulted pushed to EHR |
| 6.2 | Customer payment portal v1 (Tier 5 cash application) | 3.28 | IT / Development | Month 22 | If feasibility assessment supports build |
| 6.3 | Customer-facing analytics dashboard (order volume, TAT) | 5.3 | IT / Development | Month 23 | Value-add for customers; supports account management |
| 6.4 | AI-assisted remittance parsing prototype | 3.27 | Integration Engineer | Month 24 | Emerging capability for variable-format remittances |
| 6.5 | Integration platform product documentation and marketing materials | All | Integration + Marketing/BD | Month 24 | Position MVD's integration capability as market differentiator |

---

### 9.8 Key Milestones Summary

| Milestone | Target | Workstream | Significance |
|---|---|---|---|
| **M1:** Companion Guide v1.0 published | Month 2 | WS-1 | First externally-distributable artifact |
| **M2:** StarLIMS compendium extract operational | Month 2 | WS-1 | Unlocks compendium distribution, crosswalks, and change management |
| **M3:** Rhapsody Epic template routes functional | Month 3 | WS-1 | Internal foundation ready for customer onboarding |
| **M4:** 1st Epic customer onboarded via standardized platform | Month 5 | WS-1 | **Major** — validates entire approach |
| **M5:** Change management process QMS-integrated | Month 6 | WS-1/5 | Operational maturity for ongoing interface maintenance |
| **M6:** BAI2 cash application live in production | Month 9 | WS-3 | Automated cash application without customer-side EDI |
| **M7:** 1st customer receiving 810 EDI invoices | Month 10 | WS-3 | **Major** — EDI billing capability proven |
| **M8:** Cerner adapter validated with customer | Month 12 | WS-4 | Second platform supported |
| **M9:** 3+ Epic customers live on standardized platform | Month 12 | WS-1 | Scale validation — proves repeatable model |
| **M10:** MEDITECH Expanse adapter validated | Month 15 | WS-4 | Third platform supported |
| **M11:** Veterinary integration pilot live | Month 18 | WS-4 | Vet market integration capability proven |
| **M12:** FHIR app submitted to Epic App Market | Month 16 | WS-2 | Modernization pathway initiated |
| **M13:** FHIR app published on Epic App Market | Month 19 | WS-2 | **Major** — direct Epic integration available |
| **M14:** Complete modular companion guide (v3.0) | Month 22 | WS-1/4 | Full multi-platform documentation set |
| **M15:** Integration platform fully productized | Month 24 | All | **Major** — everything in this PRD delivered |

---

### 9.9 Resource & Dependency Assumptions

**Resource Assumptions:**
- **Primary resource:** 1 Integration Engineer (Mike) as primary builder across all workstreams. This is the **single biggest constraint** on the roadmap.
- **Supporting resources (part-time):** Lab Director (compendium validation, clinical accuracy), Quality Manager (QMS integration, change management), Finance/Billing team (EDI workflow, cash application validation), IT/GRC (security, connectivity, portal), Account Management/BD (customer selection, feedback gathering).
- **External resources (as needed):** Rhapsody vendor support, Epicor consultant (for A/R integration), StarLIMS vendor support (for compendium extract).
- **Potential future resource:** Dedicated integration analyst or developer (justified by workload data from Phase 5 staffing assessment, deliverable 5.5).

**Key Dependencies:**
- **Customer availability:** Pilot customers must be willing to allocate their integration team time for testing and validation. Epic/Cloverleaf customers are typically easier; MEDITECH and vet customers may have less integration capacity.
- **Vendor cooperation:** IDEXX VetConnect investigation (4.4) depends on IDEXX's willingness to engage with a third-party reference lab. This may require Lab Director or executive-level outreach.
- **Epic App Market timeline:** Certification review (2.13) is on Epic's timeline, not MVD's. The 3–6 month estimate could extend.
- **Bank cooperation:** BAI2 file delivery (3.4) depends on MVD's bank configuring automated file delivery.
- **Epicor capabilities:** EDI billing architecture (3.7–3.13) depends heavily on what Epicor can export/import. Discovery in Phase 1 may significantly alter the EDI approach.

**Parallelization Strategy:**
- The roadmap assumes that the Integration Engineer works across workstreams concurrently, with natural breaks (e.g., waiting for customer testing cycles) used to advance other workstreams.
- Discovery tasks are front-loaded to Phase 1 so that build decisions in Phases 2–4 are informed by real data.
- The heaviest concentration of build work is Phases 3–4 (months 5–12). If this proves unsustainable for a single resource, the staffing conversation (5.5) should be accelerated.

---

## 10. Success Metrics & KPIs

| Metric | Current Baseline | Target | Measurement Method |
|---|---|---|---|
| New customer integration elapsed time | 16–20 weeks | 3–4 weeks (integration work only) | Project tracking |
| Rhapsody route development time per customer | 3–4 weeks | 2–3 days (configuration only) | Time tracking |
| Compendium change communication to customer | Ad-hoc, days to weeks | Same-day structured notification | Change log |
| Customer-reported integration issues (post go-live, first 90 days) | Not currently tracked | < 5 per customer | Support ticket tracking |
| Message processing error rate | Not currently tracked | < 1% | Rhapsody monitoring |
| Time to detect and alert on interface failure | Not currently tracked | < 15 minutes | Rhapsody monitoring |
| Customer satisfaction with integration process | Not currently tracked | > 8/10 (survey) | Post-implementation survey |
| Number of customers supportable without additional integration staff | ~3–5 | 10–15 | Capacity analysis |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Customer security teams reject MLLPS, insist on VPN | Medium | Medium (delays onboarding) | Document MLLPS security equivalence; have VPN parameters pre-documented as fallback |
| StarLIMS compendium extract proves technically difficult | Medium | High (blocks compendium system) | Engage StarLIMS vendor/support early; consider database-level extract as alternative |
| Cloverleaf analysts don't adopt reference translation assets | Medium | Low (they still benefit from documentation) | Build relationships with Cloverleaf consulting firms; seek feedback on asset format/quality |
| Epic FHIR reference lab APIs are immature for fungal diagnostics use cases | Medium | Low (HL7v2 is the primary path) | Monitor Epic's FHIR roadmap; engage Epic's reference lab integration team for guidance |
| Resource constraints (single integration engineer) | High | High (bottleneck on all deliverables) | Phase deliverables carefully; leverage this PRD to justify additional headcount or contractor support |
| Customer Epic configurations vary more than expected | Low | Medium | Build flexibility into templates; maintain a "customer-specific overrides" configuration layer |
| Regulatory changes affecting interface requirements (e.g., new ELR mandates) | Low | Medium | Monitor regulatory landscape; design compendium system to accommodate new required fields |
| Customer ERP/AP systems vary in EDI import capability | Medium | Medium (increases per-customer effort) | Start with SFTP flat file as fallback; progressively move to structured X12 as customers demonstrate readiness |
| Epicor integration complexity for automated 820 posting | Medium | Medium (manual posting continues as fallback) | Engage Epicor support for A/R import capabilities; prototype with test data early |
| Low customer adoption of 820 remittance | High | Low (manual cash application continues) | Position 820 as value-add; focus initial ROI on 810 outbound automation |
| CPT coding accuracy in 810 invoices | Medium | Medium (invoice disputes) | Validate CPT mappings in master compendium; build reconciliation checks |
| Clinical and financial integration timelines compete for same resources | High | High (delays both workstreams) | Phase EDI work to follow clinical integration foundation; consider dedicated resource for EDI |

---

## 12. Open Questions & Future Topics

The following items require further research, discussion, or decision-making. Each is a candidate for a dedicated deep-dive document branching from this PRD.

### 12.1 Technical Open Questions

- [ ] **StarLIMS Compendium Extract:** What is the best method for extracting structured compendium data from StarLIMS? Direct database query? API? Export utility? What are the data quality considerations?
- [ ] **Rhapsody Template Packaging:** Can Rhapsody route definitions be exported/imported as packages for template reuse, or must they be manually recreated per customer?
- [ ] **Cloverleaf Development Environment:** Should MVD invest in a Cloverleaf development/test instance to validate reference translation assets? Cost vs. benefit?
- [ ] **Epic Beaker Import Capabilities:** Does Epic Beaker support bulk import of reference lab compendium data? If so, can MVD generate files in that format?
- [ ] **PDF Report Embedding:** What is the optimal method for embedding PDF reports in ORU messages for Epic Beaker display? Base64 in OBX ED datatype? Reference pointer? What size limitations exist?
- [ ] **Rhapsody EDI Module Licensing:** Confirm Rhapsody's EDI/X12 capabilities are included in MVD's current license, or if additional modules/licensing is required for 810/820/812 processing.
- [ ] **Epicor Invoice Export Method:** How does Epicor currently generate invoices? Can invoice data be exported in a structured format (CSV, XML, REST API) that Rhapsody can consume for 810 generation? What triggers invoice readiness?
- [ ] **Epicor A/R Payment Import Method:** What is the best method for automated payment posting from Rhapsody into Epicor? Direct database insert? REST API (Kinetic)? File-based import? What Epicor modules are currently licensed?
- [ ] **AS2 Connectivity:** Do any current or prospective customers require AS2 for EDI transport? Does Rhapsody support AS2 natively? SFTP is simpler but some large health system ERP platforms prefer AS2.
- [ ] **Patient-Level Detail in 810:** Should 810 invoices include patient-level line items (MRN/name for customer reconciliation) or summary-level billing? Patient-level detail triggers HIPAA PHI handling on the EDI channel.
- [ ] **Invoice Consolidation Logic:** What billing periods and consolidation rules do customers prefer? Per-accession, daily, weekly, monthly? This affects Epicor configuration and Rhapsody batch scheduling.
- [ ] **Rhapsody Canonical Message Model:** Design the internal canonical HL7v2 message format that serves as the common representation between StarLIMS and all platform-specific adapters. What fields are universal vs. platform-specific?
- [ ] **MEDITECH Generation Inventory:** Survey current MVD customer base to determine which MEDITECH generation each site runs (Magic, C/S, 6.x, Expanse). This drives adapter priority.
- [ ] **Cerner HL7v2 Profile Analysis:** Obtain HL7v2 message samples from at least 2 existing Cerner customers and document differences from Epic profiles.
- [ ] **IDEXX VetConnect Third-Party Integration:** Investigate whether IDEXX offers a third-party reference lab integration pathway through VetConnect PLUS. Contact IDEXX partner programs.
- [ ] **Vet PMS Landscape Survey:** Survey MVD's veterinary customer base to identify which practice management systems (Cornerstone, AVImark, eVetPractice, Impromed, etc.) are in use and what integration capabilities they offer.
- [ ] **Bank Reporting Files (BAI2):** Contact MVD's commercial bank to determine BAI2 file availability, delivery method (SFTP), and what ACH addenda data is captured. This is the foundation for Tier 2 cash application.
- [ ] **Email Remittance Format Analysis:** Collect sample remittance emails/attachments from top 10 customer payers by volume. Assess format consistency and feasibility of automated parsing.

### 12.2 Business Open Questions

- [ ] **Customer Portal Build vs. Buy:** Should MVD build a custom customer portal, use an existing platform (SharePoint, etc.), or start with a simple authenticated file share?
- [ ] **Pricing/Packaging:** Should electronic integration be included in MVD's standard reference lab service, or offered as a tiered add-on (basic SFTP vs. premium real-time)?
- [ ] **Consultant Partnerships:** Should MVD establish formal partnerships with Cloverleaf consulting firms and/or Epic integration consultants to facilitate customer-side implementations?
- [ ] **Staffing Model:** At what customer volume does MVD need a dedicated integration team vs. the current model? Does the multi-platform scope accelerate this need?
- [ ] **EDI Billing as Sales Differentiator:** Can automated EDI invoicing (810/820) be positioned as a competitive differentiator during the sales process? Do competing reference labs offer this?
- [ ] **Current Billing Workflow Documentation:** What is MVD's end-to-end billing workflow today (StarLIMS charge capture → Epicor → invoice delivery → payment receipt → cash application)? This discovery is a prerequisite for EDI implementation.
- [ ] **Quest/LabCorp Companion Guide Analysis:** Obtain competitor integration documentation and analyze for structural alignment opportunities. Which customer-facing conventions should MVD adopt?
- [ ] **ARUP Laboratories Model Study:** ARUP is a specialty academic reference lab most analogous to MVD's model. Study their integration program for applicable patterns.
- [ ] **Veterinary Market Integration Investment Case:** What is the ROI of investing in IDEXX/vet PMS integration vs. continuing with manual/fax-based workflows for vet customers? How many vet customers would adopt electronic integration?
- [ ] **Customer Segmentation for Integration Tiers:** Define which customers get full real-time HL7v2 integration vs. SFTP batch vs. web portal vs. fax/manual based on volume, platform, and willingness to invest.

### 12.3 Future Capability Topics

- [ ] **Bidirectional Status Updates:** Real-time order status updates (received, in process, resulted) pushed to Epic/Cerner/MEDITECH via HL7v2 or FHIR
- [ ] **Electronic Order Requisition:** Web-based order entry portal for customers without EHR integration capability (especially relevant for smaller vet practices and non-integrated human healthcare sites)
- [ ] **Analytics Dashboard:** Customer-facing dashboards showing order volumes, TAT performance, result distributions
- [ ] **FHIR Bulk Data Export:** For population health or research use cases
- [ ] **Direct-to-Patient Reporting:** Integration with patient portals (Epic MyChart, Cerner HealtheLife) for direct result delivery
- [ ] **Customer Payment Portal:** Self-service portal for invoice viewing, payment, and remittance (Tier 5 cash application strategy)
- [ ] **AI-Assisted Remittance Parsing:** Emerging capability for handling variable-format email remittance documents across customers
- [ ] **Veterinary Telehealth Integration:** Integration with emerging vet telehealth platforms for remote order entry and result delivery

---

## 13. Appendices

### Appendix A: Glossary

| Term | Definition |
|---|---|
| **810** | X12 810 Invoice — EDI transaction for sending invoices from seller (MVD) to buyer (customer institution) |
| **812** | X12 812 Credit/Debit Adjustment — EDI transaction for billing corrections and credits |
| **820** | X12 820 Payment Order/Remittance Advice — EDI transaction for communicating payment details from buyer to seller |
| **997/999** | X12 Functional Acknowledgment — EDI transaction confirming receipt and syntactic validity of transmitted transactions |
| **AAVLD** | American Association of Veterinary Laboratory Diagnosticians — accrediting body for veterinary diagnostic laboratories |
| **ACK/NAK** | Acknowledgment / Negative Acknowledgment — HL7v2 response messages indicating successful or failed processing |
| **Antechwin** | Antech Diagnostics' (Mars Petcare) practice management system integration platform for veterinary practices |
| **AOE** | Ask at Order Entry — questions that must be answered when placing an order (e.g., specimen source, clinical history) |
| **ARUP** | ARUP Laboratories — academic specialty reference lab affiliated with University of Utah; model comparable to MVD |
| **AS2** | Applicability Statement 2 — secure HTTP-based transport protocol commonly used for EDI document exchange |
| **BAI2** | Bank Administration Institute format — standard file format for commercial bank reporting of transaction and balance data |
| **CareAware ConnectWorks** | Oracle Health (Cerner)'s integration engine for managing HL7v2 and other message-based interfaces |
| **Canonical Message Model** | MVD's internal, platform-agnostic HL7v2 message format used as the common representation between StarLIMS and all external platform adapters |
| **Cloverleaf** | Infor Cloverleaf — healthcare integration engine used by many Epic (and some Cerner/MEDITECH) customers for message routing and translation |
| **Compendium** | The complete catalog of tests offered by a laboratory, including codes, specimen requirements, and result definitions |
| **CPT** | Current Procedural Terminology — AMA-maintained code set for medical procedures and services, used in billing |
| **EDI** | Electronic Data Interchange — structured exchange of business documents (invoices, payments, orders) between trading partners using standardized formats |
| **Epic Beaker** | Epic's laboratory information system module for clinical and anatomic pathology |
| **Epicor** | MVD's Enterprise Resource Planning (ERP) system, used for billing, accounts receivable, and financial management |
| **FHIR** | Fast Healthcare Interoperability Resources — modern RESTful API standard for healthcare data exchange (HL7 FHIR R4) |
| **HL7v2** | Health Level 7 Version 2 — the dominant messaging standard for healthcare system integration |
| **IDEXX** | IDEXX Laboratories — dominant veterinary diagnostics company; VetConnect PLUS is their results platform, Cornerstone is their practice management system |
| **ISA/GS/ST** | X12 EDI envelope segments — Interchange Control (ISA), Functional Group (GS), and Transaction Set (ST) headers that wrap EDI documents |
| **LOINC** | Logical Observation Identifiers Names and Codes — universal standard for identifying laboratory observations |
| **MEDITECH** | Healthcare IT company providing EHR systems; multiple platform generations (Magic, Client/Server, 6.x, Expanse) with varying HL7v2 compliance |
| **MLLP** | Minimal Lower Layer Protocol — TCP-based transport protocol for HL7v2 messages |
| **MLLPS** | MLLP over TLS — encrypted transport for HL7v2 messages |
| **OBR** | Observation Request segment — HL7v2 segment containing order/test information |
| **OBX** | Observation Result segment — HL7v2 segment containing individual result values |
| **Open.Epic** | Epic's interoperability platform providing FHIR APIs for external system integration |
| **Oracle Health** | Formerly Cerner Corporation — major EHR vendor, now owned by Oracle; primary product is Millennium/Oracle Health EHR |
| **ORM** | Order Message — HL7v2 message type for laboratory orders |
| **ORU** | Observation Result Unsolicited — HL7v2 message type for laboratory results |
| **PMS** | Practice Management System — software used by veterinary practices for scheduling, records, and billing |
| **Quest Diagnostics** | Largest US reference laboratory; industry benchmark for reference lab integration maturity |
| **Rhapsody** | Rhapsody Integration Engine — MVD's healthcare integration engine for message processing and routing |
| **SMART on FHIR** | Substitutable Medical Applications, Reusable Technologies — OAuth 2.0-based authorization framework for FHIR applications |
| **StarLIMS** | MVD's laboratory information management system |
| **X12** | ASC X12 — the standards body and format for EDI transactions in North America, including healthcare and B2B commerce |
| **XLATE** | Cloverleaf translation table — maps values between source and destination coding systems |

### Appendix B: Related Documents

| Document | Status | Description |
|---|---|---|
| MVD Integration Companion Guide | To be created (Section 7.1) | Customer-facing integration specification |
| MVD Test Compendium (Machine-Readable) | To be created (Section 7.3) | Structured test catalog for distribution |
| Rhapsody Route Template Specifications | To be created (Section 7.4) | Internal technical specifications for template routes |
| Integration Test Plan Template | To be created (Section 7.5) | Reusable test plan for customer implementations |
| Change Management SOP | To be created (Section 7.6) | Standard operating procedure for interface changes |
| FHIR Feasibility Assessment | To be created (Section 7.8) | Business case and technical assessment for Epic App Market |
| EDI Trading Partner Agreement Template | To be created (Section 7.9) | Standard agreement for 810/820 EDI exchange with customers |
| Epicor Billing Workflow Documentation | To be created (Section 7.9.10) | Current-state and target-state billing workflow documentation |
| 810 Invoice Message Specification | To be created (Section 7.9) | X12 810 segment-level specification for MVD invoices |
| 820 Remittance Parsing Specification | To be created (Section 7.9) | X12 820 inbound parsing and Epicor posting specification |

### Appendix C: Reference Architecture Diagrams

*To be developed — detailed network diagrams for each connectivity tier, Rhapsody route flow diagrams, and data flow diagrams for the compendium distribution pipeline.*

### Appendix D: Sample Compendium Entry

*See Section 7.3.2 for the JSON data model. A complete sample entry for each MVD test category will be included here once the data model is finalized and validated against StarLIMS.*

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 DRAFT | 2026-02-11 | Mike Loggins | Initial draft based on strategic planning discussion |
| 1.1 DRAFT | 2026-02-11 | Mike Loggins | Added Section 7.9 — EDI/Revenue Cycle Integration for client direct billing (810/820/812). Updated risks, open questions, glossary, and appendices. Removed payer billing (837P/835/270/271) scope — MVD is client direct bill only. |
| 1.2 DRAFT | 2026-02-12 | Mike Loggins | Added Section 7.10 — Multi-Platform Customer Support (Cerner, MEDITECH, IDEXX, Antechwin). Added Section 7.9.7 — Cash Application Alternatives & Strategy (5-tier model: 820, bank files/BAI2, email remittance parsing, lockbox, customer portal). Added Section 7.10.7 — Quest Diagnostics competitive reference model. Renamed document to "Universal Reference Lab Integration Platform." Updated executive summary, open questions, glossary, and appendices throughout. |
| 1.3 DRAFT | 2026-02-12 | Mike Loggins | Complete roadmap rewrite — expanded from 4 phases/12 months to 6 phases/24 months covering 5 parallel workstreams (Clinical Core, Connectivity/FHIR, EDI Billing, Multi-Platform, Operational Excellence). Added 90+ numbered deliverables with dependencies, 15 key milestones, resource/dependency assumptions, and parallelization strategy. |

---

*This is a living document. Each section is designed to serve as a launching point for detailed sub-documents, technical specifications, and implementation plans. Items in the Open Questions section (Section 12) are prioritized candidates for the next iteration.*

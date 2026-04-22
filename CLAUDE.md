# CLAUDE.md - Project Rules & Working Agreement

**Project:** MVD Universal Reference Lab Integration Platform (URLIP)
**Version:** 1.1
**Last Updated:** 2026-02-19

---

## Table of Contents

1. [Development Environment](#1-development-environment)
2. [Technology Stack](#2-technology-stack)
3. [Compliance Requirements](#3-compliance-requirements)
4. [Documentation Standards](#4-documentation-standards)
5. [Architecture Principles](#5-architecture-principles)
6. [Azure Infrastructure](#6-azure-infrastructure)
7. [Customer Portal & Feature Toggles](#7-customer-portal--feature-toggles)
8. [Project Management](#8-project-management)
9. [Quality Assurance](#9-quality-assurance)
10. [Troubleshooting Protocol](#10-troubleshooting-protocol)
11. [Performance Review Standards](#11-performance-review-standards)
12. [Documentation Structure](#12-documentation-structure)
13. [Available Skills & Agents](#13-available-skills--agents)
14. [MCP Server Connections](#14-mcp-server-connections)
15. [Learnings & Patterns](#15-learnings--patterns)

---

## 1. Development Environment

### Rule 1.1: Development Platform
Development takes place on a **Windows 11 PC** with the following tools installed:
- PowerShell 7.x
- SQLCMD
- Azure CLI (AZ CLI)
- Git
- Docker Desktop (if needed)

### Environment Commands Reference
```powershell
# Verify installations
$PSVersionTable.PSVersion          # PowerShell version
az --version                        # Azure CLI version
git --version                       # Git version
docker --version                    # Docker version
sqlcmd -?                          # SQLCMD help
```

---

## 2. Technology Stack

### Rule 2.1: Backend Stack
- **Runtime:** Node.js (latest LTS)
- **Language:** JavaScript/TypeScript
- **API Layer:** Azure Functions (REST API)
- **Purpose:** Middleware between application and data

### Rule 2.2: Frontend Stack
- **Framework:** JavaScript-driven (React/Vue/Next.js)
- **UI:** Modern UI elements and layouts
- **Accessibility:** WCAG AAA compliant (Rule 22)
- **Security:** OWASP Top 10 defenses (Rule 23)

### Rule 2.3: API Architecture
All data actions flow through Azure Functions as REST API middleware:
```
[Frontend] <--HTTPS--> [Azure Functions] <---> [Data Sources]
                              |
                              +---> Azure SQL
                              +---> Blob Storage
                              +---> External APIs (HL7, FHIR, EDI)
```

---

## 3. Compliance Requirements

### Rule 3.1: Required Compliance Standards
This application (Data, Applications, Network) must be compliant with:

| Standard | Scope | Key Requirements |
|----------|-------|------------------|
| **HIPAA** | All PHI data handling | Encryption, access controls, audit logging, BAA coverage |
| **SOC 2 Type II** | Security, availability, confidentiality | Control monitoring, evidence collection, annual audits |
| **ISO 27001** | Information security management | Risk assessment, security policies, continuous improvement |

### Rule 3.2: Security Architecture (ZTNA)
**Zero Trust Network Architecture** principles must be applied:
- Never trust, always verify
- Least privilege access
- Assume breach mentality
- Verify explicitly
- Use micro-segmentation

---

## 4. Documentation Standards

### Rule 4.1: Technical Documentation
Full technical documentation must be written as development progresses, including:
- Architecture diagrams
- Data flow documentation
- API specifications
- Configuration guides
- Deployment procedures
- **Excluding:** Credentials, secrets, tokens

### Rule 4.2: API Documentation Requirements
For every Azure Function/API endpoint created:
1. **Swagger/OpenAPI file** - Machine-readable specification
2. **Postman Collection** - Ready-to-use API testing
3. **Inline documentation** - JSDoc/TSDoc comments
4. **README** - Usage examples and edge cases

### Rule 4.3: Documentation File Formats
```
/docs
├── api/
│   ├── swagger.yaml           # OpenAPI 3.0 specification
│   ├── postman_collection.json # Postman collection
│   └── endpoints/             # Per-endpoint documentation
├── architecture/
│   ├── system-overview.md
│   ├── data-flow.md
│   └── security-architecture.md
├── compliance/
│   ├── hipaa-controls.md
│   ├── soc2-evidence.md
│   └── iso27001-controls.md
└── runbooks/
    ├── deployment.md
    ├── troubleshooting.md
    └── incident-response.md
```

---

## 5. Architecture Principles

### Rule 5.1: Zero Trust Network Architecture (ZTNA)
All architecture decisions must follow ZTNA principles:
- Identity verification at every access point
- Device health validation
- Micro-segmentation of resources
- Continuous monitoring and validation
- Encrypted communications (TLS 1.2+ minimum)

### Rule 5.2: Data Flow Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        AZURE FRONT DOOR                          │
│                    (Existing AFD Resource)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │   PRODUCTION RG    │         │   DEVELOPMENT RG    │
    │                    │         │                     │
    │  ┌──────────────┐ │         │  ┌──────────────┐  │
    │  │Azure Functions│ │         │  │Azure Functions│  │
    │  │  (REST API)   │ │         │  │  (REST API)   │  │
    │  └──────┬───────┘ │         │  └──────┬───────┘  │
    │         │         │         │         │          │
    │  ┌──────▼───────┐ │         │  ┌──────▼───────┐  │
    │  │ Azure SQL    │ │         │  │ Azure SQL    │  │
    │  │ Key Vault    │ │         │  │ Key Vault    │  │
    │  │ Blob Storage │ │         │  │ Blob Storage │  │
    │  │ App Config   │ │         │  │ App Config   │  │
    │  └──────────────┘ │         │  └──────────────┘  │
    └───────────────────┘         └────────────────────┘
```

---

## 6. Azure Infrastructure

### Rule 6.1: Target Environments
| Environment | Platform | Resource Group |
|-------------|----------|----------------|
| Development | Localhost (initial) | urlip-dev-rg |
| Production | Azure | urlip-prod-rg |

### Rule 6.2: Configuration Management
- **Environment Variables:** Azure App Configuration
- **Secrets:** Azure Key Vault (passwords, certificates, tokens, sensitive data)
- **Unstructured Data:** Azure Blob Storage

### Rule 6.3: Production Infrastructure
- Production sits behind **existing Azure Front Door (AFD)** resource
- Dev and Production exist in **separate resource groups**

### Rule 6.4: Network Access Control
Allowed IP ranges for system access:
```
192.168.220.0/23    # Internal network range 1
4.43.234.130/32     # Specific external IP
192.168.150.0/24    # Internal network range 2
10.20.1.0/24        # Internal network range 3
```

### Rule 6.5: Azure Resource Naming Convention
```
{project}-{environment}-{resource-type}
```

**Actual provisioned resources in `rg-urlip-dev-centralus-001`:**
| Resource | Type | Notes |
|---|---|---|
| `func-urlip-dev-centralus-001` | Function App | Primary API |
| `asp-urlip-dev-centralus-001` | App Service Plan | Hosts function app |
| `sturlipdev001` | Storage Account | Blob: `compendium` container for live/versioned compendium JSON |
| `kv-urlip-dev-001` | Key Vault | Secrets: STARLIMS-CONNECTION-STRING, COMPENDIUM-BLOB-CONNECTION-STRING, COMPENDIUM-BLOB-CONTAINER |
| `appcs-urlip-dev-001` | App Configuration | Feature flags and app settings |
| `appi-urlip-dev-centralus-001` | Application Insights | Telemetry |
| `log-urlip-dev-centralus-001` | Log Analytics Workspace | Log sink |

---

## 7. Customer Portal & Feature Toggles

### Rule 7.1: Portal Integration Modes
The customer portal supports three integration modes:

| Mode | Description | Feature Set |
|------|-------------|-------------|
| **Portal Only** | No HL7/FHIR integration | Full portal features (order entry, results, billing) |
| **Integrated + Portal** | HL7/FHIR integration active | Portal for supplemental access (results viewing, compendium, billing) |
| **Integrated Only** | Full integration, minimal portal | Portal for compendium and documentation only |

### Rule 7.2: Feature Toggle Architecture
Three-tier toggle system for flexible feature control:

| Type | Scope | Purpose | Example |
|------|-------|---------|---------|
| **Global** | All customers | Roll-out control, maintenance | `FEATURE_BILLING_PORTAL_ENABLED` |
| **Customer** | Single customer | Per-customer feature access | `CUSTOMER_ABC_ORDER_ENTRY_ENABLED` |
| **Role** | User role within customer | Permission-based features | `ROLE_ADMIN_USER_MGMT_ENABLED` |

### Rule 7.3: Feature Toggle Configuration
```json
{
  "globalToggles": {
    "FEATURE_ORDER_ENTRY": { "enabled": true, "rolloutPercent": 100 },
    "FEATURE_BILLING_PORTAL": { "enabled": false, "rolloutPercent": 0 },
    "FEATURE_RESULT_TRENDS": { "enabled": true, "rolloutPercent": 50 }
  },
  "customerToggles": {
    "CUSTOMER_ACME_HOSPITAL": {
      "ORDER_ENTRY": true,
      "RESULT_VIEWING": true,
      "BILLING_PORTAL": false,
      "ADMIN_FEATURES": true
    }
  }
}
```

### Rule 7.4: Feature Toggle Storage
- **Storage:** Azure App Configuration (feature flags)
- **Updates:** Real-time (no deployment needed to toggle features)
- **Auditing:** All toggle changes logged with user/timestamp

### Rule 7.5: Azure External ID (Entra) Authentication
Customer portal authentication uses existing Azure External ID Entra tenant:

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Customer   │────►│  Azure External │────►│   MVD Portal     │
│   Browser    │     │   ID (Entra)    │     │   (React App)    │
└──────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
                     ┌─────────────────┐
                     │  Azure AD Token │
                     │  (JWT with      │
                     │   claims)       │
                     └─────────────────┘
                            │
                            ▼
                     ┌─────────────────┐
                     │ Azure Functions │
                     │ (Validate JWT,  │
                     │  check toggles) │
                     └─────────────────┘
```

### Rule 7.6: Role-Based Access Control (RBAC)
Preliminary role structure for customer portal:

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| **Portal Admin** | Customer's system administrator | User management, config, all features |
| **Lab Director** | Clinical oversight | Results, compendium, no billing |
| **Ordering User** | Order entry staff | Order entry, order status, limited results |
| **Results Viewer** | Read-only results access | Result viewing, PDF download |
| **Billing Admin** | A/P staff | Invoices, payments, statements |
| **Read Only** | Minimal access | Compendium, documentation only |

### Rule 7.7: Portal Core Features
```
Core Features (All Customers):
├── Compendium browsing & download
├── Documentation access (Companion Guide, supplements)
├── Change notifications & changelog
└── Support contact / ticket submission

Toggle-Controlled Features:
├── Order Entry (requisition, status tracking, history)
├── Results (viewing, PDF download, critical alerts, trends)
├── Billing (invoices, payments, statements, disputes)
└── Admin (user management, integration config, certificates)
```

---

## 8. Project Management

### Rule 8.1: Monday.com Integration
Project Plan managed in **Monday.com**:
- **Workspace:** MVD IT (ID: 12231690)
- **Folder:** URLIP
- **Boards:**
  - URLIP Phase 1 - Foundation (18400841228)
  - URLIP Customer Onboarding (18400841566)

Hierarchy:
```
Epics
└── Features
    └── Stories
        └── Tasks
```

### Rule 8.2: Backlog Management
Any new ideas or items discovered during development:
- Add to Monday.com backlog immediately
- Even if excited about it - goes to backlog for refinement
- No scope creep without proper prioritization

### Rule 8.3: Commit & Deployment Protocol
At the end of every Monday.com **Task**:
1. Create git commit with descriptive message
2. Deploy to appropriate environment
3. Document on Monday.com task:
   - Git commit ID
   - URL link to commit
   - Deployment status

### Rule 8.4: Agile Ceremonies
Regular sessions to be scheduled and documented:
- **Refinement sessions** - Backlog grooming
- **Review sessions** - Demo completed work
- **Planning sessions** - Sprint/iteration planning

All session notes stored in: `/docs/ceremonies/`

---

## 9. Quality Assurance

### Rule 9.1: Test Case Requirements
For every Feature and Story:
- **Positive test cases** - Happy path scenarios
- **Negative test cases** - Error handling, edge cases
- **Automated tests** - Where possible (unit, integration, e2e)

### Rule 9.2: Accessibility Compliance
**WCAG AAA** compliance required:
- Color contrast ratios (7:1 for normal text)
- Keyboard navigation
- Screen reader compatibility
- Focus indicators
- Alternative text for images
- Captions for media

### Rule 9.3: Security Testing
**OWASP Top 10** defense coverage:
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. Server-Side Request Forgery

---

## 10. Troubleshooting Protocol

### Rule 10.1: Investigation Protocol
When troubleshooting an error, follow this sequence:

```
┌─────────────────────────────────────────────────────────────┐
│                  ERROR INVESTIGATION PROTOCOL                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. ANALYZE STACK TRACE                                      │
│     └── Identify actual problem, not just symptom            │
│                                                              │
│  2. TRACE EXECUTION PATH                                     │
│     └── Follow code path across files to the error           │
│                                                              │
│  3. IDENTIFY ROOT CAUSE                                      │
│     └── Logic bug? Race condition? Missing validation?       │
│                                                              │
│  4. EXPLAIN WHY                                              │
│     └── Architecture gap? Edge case? Design flaw?            │
│                                                              │
│  5. PROPOSE FIX                                              │
│     └── Address root cause, not symptom                      │
│                                                              │
│  6. PREVENTION STRATEGY                                      │
│     └── Tests, type guards, documentation updates            │
│                                                              │
│  7. UPDATE CLAUDE.md                                         │
│     └── Document learnings to prevent recurrence             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

⚠️  DO NOT SUGGEST QUICK FIXES - ROOT CAUSE ANALYSIS REQUIRED
```

---

## 11. Performance Review Standards

### Rule 11.1: Performance Analysis Focus Areas

When reviewing code for performance, analyze:

| Area | Focus | Action |
|------|-------|--------|
| **Time Complexity** | Flag O(n²) or worse operations | Optimize algorithms |
| **React Re-renders** | Unnecessary re-renders, redundant computations | Memoization, useMemo, useCallback |
| **Database Queries** | N+1 problems, missing indexes | Query optimization, eager loading |
| **Memory** | Leaks, excessive allocations | Cleanup, pooling, streaming |
| **Blocking Operations** | Sync operations that should be async | Convert to async/await |

### Rule 11.2: Performance Issue Documentation Format
For each performance issue identified:
```markdown
## Performance Issue: [Title]

### Impact
[Quantified impact - e.g., "Adds 2.3s latency on lists > 1000 items"]

### Problematic Code
```javascript
// Current implementation
```

### Optimized Implementation
```javascript
// Improved implementation
```

### Estimated Improvement
[e.g., "Reduces from O(n²) to O(n log n) - 95% improvement on large datasets"]

### Priority
[High/Medium/Low based on user impact]
```

---

## 12. Documentation Structure

### Rule 12.1: Required Documentation for All Code

Every significant code component must include:

```markdown
## 1. Purpose
[What this code does - 2-3 sentences]

## 2. Architecture
[How it integrates with the system - diagram if complex]

## 3. Key Components
[Main functions/classes and their responsibilities]

## 4. Usage Examples
[Common use cases with code snippets]

## 5. Edge Cases
[Known limitations, gotchas, performance notes]

## 6. Testing
[How to test this code, what to verify]

## 7. Dependencies
[External libraries and why they're needed]
```

### Rule 12.2: Documentation File Organization
```
/docs
├── README.md                    # Documentation index/TOC
├── ARCHITECTURE.md              # System architecture overview
├── API.md                       # API documentation index
├── DEPLOYMENT.md                # Deployment procedures
├── SECURITY.md                  # Security documentation
├── COMPLIANCE.md                # Compliance documentation
│
├── api/
│   ├── swagger.yaml
│   ├── postman_collection.json
│   └── endpoints/
│       ├── orders.md
│       ├── results.md
│       ├── compendium.md
│       └── billing.md
│
├── architecture/
│   ├── system-overview.md
│   ├── data-flow.md
│   ├── security-architecture.md
│   ├── integration-patterns.md
│   └── diagrams/
│
├── compliance/
│   ├── hipaa/
│   ├── soc2/
│   └── iso27001/
│
├── ceremonies/
│   ├── refinement/
│   ├── reviews/
│   └── planning/
│
└── runbooks/
    ├── deployment.md
    ├── troubleshooting.md
    ├── incident-response.md
    └── disaster-recovery.md
```

---

## 13. Available Skills & Agents

### Rule 13.1: Leverage Installed Skills
Always consider using available skills for specialized work:

#### Security Scanning
```
security-scanning:security-hardening
security-scanning:security-sast
security-scanning:attack-tree-construction
security-scanning:sast-configuration
security-scanning:security-requirement-extraction
security-scanning:stride-analysis-patterns
security-scanning:threat-mitigation-mapping
```

#### TDD Workflows
```
tdd-workflows:tdd-cycle
tdd-workflows:tdd-green
tdd-workflows:tdd-red
```

#### Frontend Design
```
frontend-design:frontend-design
```

#### Document Skills
```
document-skills:algorithmic-art
document-skills:brand-guidelines
document-skills:canvas-design
document-skills:doc-coauthoring
document-skills:docx
document-skills:frontend-design
document-skills:internal-comms
document-skills:mcp-builder
document-skills:pdf
document-skills:pptx
document-skills:skill-creator
document-skills:slack-gif-creator
document-skills:theme-factory
document-skills:web-artifacts-builder
document-skills:webapp-testing
document-skills:xlsx
```

#### Database Design
```
database-design:postgresql
```

#### Cloud Infrastructure
```
cloud-infrastructure:cost-optimization
cloud-infrastructure:hybrid-cloud-networking
cloud-infrastructure:istio-traffic-management
cloud-infrastructure:linkerd-patterns
cloud-infrastructure:mtls-configuration
cloud-infrastructure:multi-cloud-architecture
cloud-infrastructure:service-mesh-observability
cloud-infrastructure:terraform-module-library
```

#### CI/CD Automation
```
cicd-automation:deployment-pipeline-design
cicd-automation:github-actions-templates
cicd-automation:gitlab-ci-patterns
cicd-automation:secrets-management
```

#### Business Analytics
```
business-analytics:data-storytelling
business-analytics:kpi-dashboard-design
```

#### Product Skills
```
product-skills:agile-product-owner
product-skills:product-manager-toolkit
product-skills:product-strategist
product-skills:ui-design-system
product-skills:ux-researcher-designer
```

### Rule 13.2: Skill-to-PRD Mapping

| PRD Component | Applicable Skills |
|---------------|-------------------|
| Security & Compliance (Section 8) | `security-scanning:*`, `cloud-infrastructure:mtls-configuration` |
| Customer Portal | `frontend-design:frontend-design`, `document-skills:webapp-testing` |
| Database/Compendium | `database-design:postgresql` |
| Cloud/Connectivity | `cloud-infrastructure:*`, `cicd-automation:*` |
| Documentation | `document-skills:docx`, `document-skills:pdf`, `document-skills:doc-coauthoring` |
| KPIs & Metrics (Section 10) | `business-analytics:kpi-dashboard-design`, `business-analytics:data-storytelling` |
| Product Planning | `product-skills:product-manager-toolkit`, `product-skills:agile-product-owner` |
| UX for Onboarding Portal | `product-skills:ux-researcher-designer`, `product-skills:ui-design-system` |

### Rule 13.3: Sub-Agent Configuration
Spin up agents for parallel work whenever possible:

```json
{
  "agents": [
    {
      "id": "clinical-integration-agent",
      "name": "Clinical Integration Agent",
      "workstreams": ["WS-1", "WS-4"],
      "prd_sections": ["7.1", "7.2", "7.3", "7.4", "7.10"],
      "skills": ["database-design:postgresql", "tdd-workflows:tdd-cycle"],
      "parallelism_group": "A"
    },
    {
      "id": "infrastructure-security-agent",
      "name": "Infrastructure & Security Agent",
      "workstreams": ["WS-2", "WS-5"],
      "prd_sections": ["7.7", "7.8", "8"],
      "skills": [
        "security-scanning:security-hardening",
        "security-scanning:stride-analysis-patterns",
        "security-scanning:threat-mitigation-mapping",
        "security-scanning:security-requirement-extraction",
        "cloud-infrastructure:mtls-configuration",
        "cloud-infrastructure:hybrid-cloud-networking",
        "cloud-infrastructure:terraform-module-library",
        "cicd-automation:deployment-pipeline-design",
        "cicd-automation:github-actions-templates",
        "cicd-automation:secrets-management"
      ],
      "parallelism_group": "B"
    },
    {
      "id": "edi-billing-agent",
      "name": "EDI & Billing Agent",
      "workstreams": ["WS-3"],
      "prd_sections": ["7.9"],
      "skills": ["database-design:postgresql", "business-analytics:kpi-dashboard-design"],
      "parallelism_group": "C"
    },
    {
      "id": "portal-ux-agent",
      "name": "Portal & UX Agent",
      "workstreams": ["WS-5"],
      "prd_sections": ["7.3.3", "7.9.7", "12.3"],
      "skills": [
        "frontend-design:frontend-design",
        "document-skills:webapp-testing",
        "product-skills:ux-researcher-designer",
        "product-skills:ui-design-system",
        "business-analytics:kpi-dashboard-design"
      ],
      "parallelism_group": "D"
    },
    {
      "id": "documentation-compliance-agent",
      "name": "Documentation & Compliance Agent",
      "workstreams": ["WS-1", "WS-5"],
      "prd_sections": ["7.1", "7.5", "7.6", "8"],
      "skills": [
        "document-skills:doc-coauthoring",
        "document-skills:docx",
        "document-skills:pdf",
        "document-skills:xlsx",
        "security-scanning:security-sast"
      ],
      "parallelism_group": "E"
    },
    {
      "id": "product-strategy-agent",
      "name": "Product & Strategy Agent",
      "workstreams": ["ALL"],
      "prd_sections": ["9", "10", "11", "12"],
      "skills": [
        "product-skills:product-manager-toolkit",
        "product-skills:product-strategist",
        "product-skills:agile-product-owner",
        "business-analytics:data-storytelling"
      ],
      "parallelism_group": "ORCHESTRATOR"
    },
    {
      "id": "quality-testing-agent",
      "name": "Quality & Testing Agent",
      "workstreams": ["WS-1", "WS-5"],
      "prd_sections": ["7.5"],
      "skills": [
        "tdd-workflows:tdd-cycle",
        "tdd-workflows:tdd-red",
        "tdd-workflows:tdd-green",
        "document-skills:webapp-testing",
        "security-scanning:security-sast"
      ],
      "parallelism_group": "QA"
    }
  ],
  "max_parallel_agents": 7,
  "dependency_graph": {
    "portal-ux-agent": ["clinical-integration-agent"],
    "documentation-compliance-agent": [],
    "quality-testing-agent": ["clinical-integration-agent", "infrastructure-security-agent"]
  }
}
```

---

## 14. MCP Server Connections

### Rule 14.1: Recommend MCP Servers When Appropriate
During development or runtime, recommend MCP servers that would be helpful.

### Rule 14.2: Initial MCP Server Connections

| Priority | Server | Phase 1 Need |
|----------|--------|--------------|
| 1 | `filesystem` | Immediate - all file operations |
| 2 | `postgres` | Month 1 - StarLIMS extraction |
| 3 | `git` | Month 1 - version control |
| 4 | `fetch` | Month 2 - API testing |
| 5 | `sftp` | Month 2 - connectivity testing |
| 6 | `github` | Month 2 - CI/CD setup |
| 7 | `playwright` | Month 3 - portal testing |
| 8 | `memory` | Ongoing - context retention |
| 9 | `monday` | Immediate - Work Management |
| 10 | `teams` | Immediate - Team collaboration |

### Rule 14.3: MCP Server Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Projects/URLIP"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${STARLIMS_CONNECTION_STRING}"
      }
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "C:/Projects/URLIP"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "monday-apps-mcp": { "command": "npx", "args": ["@mondaydotcomorg/monday-api-mcp", "-t", "$\{MONDAY_API_TOKEN\}", "--mode", "apps"] },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "teams": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-microsoft-teams"],
      "env": {
        "TEAMS_TENANT_ID": "${TEAMS_TENANT_ID}",
        "TEAMS_CLIENT_ID": "${TEAMS_CLIENT_ID}",
        "TEAMS_CLIENT_SECRET": "${TEAMS_CLIENT_SECRET}"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Rule 14.4: Monday.com MCP Options
Two MCP options are available for Monday.com integration:

| Option | Use Case | Configuration |
|--------|----------|---------------|
| **Monday Apps MCP** | Apps framework tools, board/item manipulation | `@mondaydotcomorg/monday-api-mcp` with `--mode apps` |
| **Monday Platform MCP** | Workspace automation | Connect via URL: `https://mcp.monday.com/mcp` |

**Monday Apps MCP Configuration:**
```json
{
  "mcpServers": {
    "monday-apps-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp",
        "-t", "your_monday_API_token",
        "--mode", "apps"
      ]
    }
  }
}
```

**Monday Platform MCP:** Connect directly via URL `https://mcp.monday.com/mcp` for workspace automation features.

---

## 15. Learnings & Patterns

### Rule 15.1: Update This Section
After every significant troubleshooting session or pattern discovery, update this section to prevent similar issues.

### Documented Learnings

#### Learning: Azure CLI quoting issues in Git Bash on Windows
**Date:** 2026-02-19
**Context:** Running Azure CLI commands with JSON parameters in Git Bash
**Issue:** JSON parameters with quotes were being mangled by bash shell interpretation
**Root Cause:** Git Bash on Windows handles quote escaping differently than PowerShell
**Solution:** Use PowerShell for Azure CLI commands with complex parameters, or write JSON to temp files
**Prevention:** For Azure CLI commands with JSON, prefer PowerShell or use temp files for JSON content

#### Learning: GitHub CLI wrong hostname
**Date:** 2026-02-19
**Context:** Setting GitHub secrets via `gh secret set`
**Issue:** gh CLI was configured for enterprise GitHub (mvd.ghe.com) instead of github.com
**Root Cause:** gh CLI uses `--hostname` for auth but not for secret commands
**Solution:** Use `GH_HOST=github.com` environment variable before gh commands
**Prevention:** Always verify `gh auth status` before running gh commands

#### Learning: Azure diagnostic settings retention deprecated
**Date:** 2026-02-19
**Context:** Deploying Key Vault with diagnostic settings via Bicep
**Issue:** "Diagnostic settings does not support retention for new diagnostic settings"
**Root Cause:** Azure deprecated retentionPolicy in diagnostic settings
**Solution:** Remove retentionPolicy blocks from diagnostic settings in Bicep
**Prevention:** Don't include retentionPolicy in new diagnostic settings resources

#### Learning: Soft-deleted Azure App Configuration blocks reuse
**Date:** 2026-02-19
**Context:** Redeploying App Configuration after failed deployment
**Issue:** "The specified name is already in use by a soft-deleted configuration store"
**Root Cause:** App Configuration has soft-delete enabled by default
**Solution:** Purge deleted App Configuration: `az appconfig purge --name <name> --location <location> --yes`
**Prevention:** Use unique names or purge soft-deleted resources before redeployment

#### Learning: StarLIMS Integrated Security does not work in Azure Functions
**Date:** 2026-04-21
**Context:** Provisioning StarLIMS connection string in Key Vault for compendium sync Azure Function
**Issue:** `Integrated Security=true` in the connection string works locally (developer's Windows domain credentials) but will fail when the Function runs in Azure (no Windows domain auth in App Service)
**Root Cause:** Azure Functions run as a service principal, not a domain user
**Solution:** For Azure-deployed Function, replace `Integrated Security=true` with `User Id=<svc_account>;Password=<pass>` in Key Vault secret `STARLIMS-CONNECTION-STRING`
**Prevention:** Always provision SQL auth credentials alongside Integrated Security; document clearly that local.settings.json uses Integrated Security and Key Vault uses SQL auth

#### Learning: Compendium locale files use market-qualified keys for shared test codes
**Date:** 2026-04-21
**Context:** Adding i18n translations for 64 compendium tests; some test codes (e.g. 310) appear in both Human and Veterinary markets with different names
**Issue:** Single-key locale lookup (`"310"`) would apply the same translation to both human and vet versions
**Root Cause:** Test codes are not unique across markets; human 310 is "Histoplasma Ag Quantitative EIA", vet 310 is "Histoplasma Antigen EIA"
**Solution:** `compendiumLocalizer.js` checks `"310-Veterinary"` before `"310"` in locale JSON; locale files include both keys for shared codes
**Prevention:** When adding new tests to locale files, check if the code exists in both markets and add market-qualified keys if names differ

#### Learning: StarLIMS STARLIMS_DATA server resolves to 10.117.2.68, requires VPN
**Date:** 2026-04-21
**Context:** Attempting to query STARLIMS_DATA from dev machine to discover schema
**Issue:** DNS resolves correctly (vm-sql-dev-001.miralan.loc → 10.117.2.68) but TCP port 1433 times out without VPN
**Root Cause:** 10.117.x.x subnet is on internal network not accessible from external or non-VPN connections
**Solution:** Connect to internal VPN before running `node scripts/discover-starlims-schema.js` or any sqlcmd commands against STARLIMS_DATA
**Prevention:** The schema discovery script handles this gracefully — run with `--no-sample` flag to avoid writing PHI to disk

#### [Template for new learnings]
```markdown
### Learning: [Title]
**Date:** YYYY-MM-DD
**Context:** [What were we doing]
**Issue:** [What went wrong]
**Root Cause:** [Why it happened]
**Solution:** [How we fixed it]
**Prevention:** [How to prevent recurrence]
```

---

## Quick Reference

### Key Commands
```powershell
# Development
npm run dev                    # Start local development
npm run test                   # Run test suite
npm run build                  # Build for production

# Azure Functions
func start                     # Start Functions locally
func azure functionapp publish # Deploy to Azure

# Git workflow
git add .
git commit -m "feat(scope): description"
git push origin main

# Azure CLI
az login                       # Login to Azure
az group list                  # List resource groups
az functionapp list            # List function apps
```

### Commit Message Convention
```
<type>(<scope>): <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
feat(compendium): add LOINC mapping endpoint
fix(auth): resolve token refresh race condition
docs(api): update swagger for billing endpoints
```

### Compendium Automation Commands
```bash
# First-time setup (requires VPN)
node scripts/discover-starlims-schema.js --no-sample   # Map StarLIMS table names

# Manual sync trigger (requires function key)
curl -X POST https://<func-url>/api/compendium/sync?code=<function-key>

# Check sync status
curl https://<func-url>/api/compendium/sync/status

# List versioned snapshots (for dispute resolution)
curl https://<func-url>/api/compendium/versions

# Compendium with locale
curl https://<func-url>/api/compendium?locale=fr-CA&status=Active
```

### Compendium Blob Storage Layout
```
sturlipdev001 / compendium/
├── mvd-compendium-live.json          # Current live compendium (overwritten on each sync)
├── sync-state.json                   # { lastSync: ISO8601 }
├── versions/
│   └── 3.1.0-2026-04-21T....json    # Immutable versioned snapshots (audit trail)
└── changelogs/
    └── 2026-04-21T....json          # Per-sync diff { added, modified, removed, versionedBlobName }
```

### Emergency Contacts
- **Monday.com Workspace:** MVD IT (ID: 12231690) → URLIP folder
- **Monday.com Phase 1 Board:** https://michaelloggins.monday.com/boards/18400841228
- **Monday.com Customer Onboarding:** https://michaelloggins.monday.com/boards/18400841566
- **GitHub Repo:** https://github.com/michaelloggins/URLIP
- **Open PR:** https://github.com/michaelloggins/URLIP/pull/1 — feat(compendium): automated StarLIMS sync pipeline
- **Azure Portal:** https://portal.azure.com
- **Azure Dev RG:** rg-urlip-dev-centralus-001
- **Azure Prod RG:** rg-urlip-prod-centralus-001
- **StarLIMS DB:** vm-sql-dev-001.miralan.loc (10.117.2.68), database STARLIMS_DATA — requires VPN

---

*This document is maintained as part of the project and should be updated as new patterns, learnings, and rules are established.*


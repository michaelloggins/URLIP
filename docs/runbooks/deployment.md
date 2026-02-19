# Deployment Runbook

**Project:** URLIP - MVD Universal Reference Lab Integration Platform
**Last Updated:** 2026-02-19

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Service Principal Setup (OIDC)](#azure-service-principal-setup-oidc)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Manual Deployment](#manual-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Azure CLI installed and configured
- GitHub repository access with admin permissions
- Azure subscription with Contributor access
- Azure resource groups created:
  - `urlip-dev-rg` (Development)
  - `urlip-prod-rg` (Production)

---

## Azure Service Principal Setup (OIDC)

OIDC (OpenID Connect) is the recommended authentication method for GitHub Actions to Azure. It eliminates the need to store secrets and provides better security.

### Step 1: Create Azure AD Application

```powershell
# Login to Azure
az login

# Set subscription
az account set --subscription "<your-subscription-id>"

# Create App Registration
az ad app create --display-name "URLIP-GitHub-Actions"

# Note the appId (Client ID) from the output
```

### Step 2: Create Service Principal

```powershell
# Create Service Principal for the App
az ad sp create --id <app-id-from-step-1>

# Get the Service Principal Object ID
az ad sp show --id <app-id-from-step-1> --query id -o tsv
```

### Step 3: Assign RBAC Roles

```powershell
# Assign Contributor role for Development resource group
az role assignment create \
  --assignee <app-id> \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/urlip-dev-rg"

# Assign Contributor role for Production resource group
az role assignment create \
  --assignee <app-id> \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/urlip-prod-rg"

# Assign Website Contributor role specifically for Function Apps
az role assignment create \
  --assignee <app-id> \
  --role "Website Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/urlip-dev-rg"

az role assignment create \
  --assignee <app-id> \
  --role "Website Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/urlip-prod-rg"
```

### Step 4: Configure Federated Credentials for GitHub Actions

```powershell
# Create federated credential for main branch
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:michaelloggins/URLIP:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for master branch (if used)
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-master",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:michaelloggins/URLIP:ref:refs/heads/master",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for release branches
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-release",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:michaelloggins/URLIP:ref:refs/heads/release/*",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for GitHub environments (development)
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-env-development",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:michaelloggins/URLIP:environment:development",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for GitHub environments (production)
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-env-production",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:michaelloggins/URLIP:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

---

## GitHub Secrets Configuration

Navigate to your repository: **Settings** > **Secrets and variables** > **Actions**

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_CLIENT_ID` | Azure AD App Registration Client ID | `az ad app show --id <app-id> --query appId -o tsv` |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | `az account show --query id -o tsv` |
| `AZURE_FUNCTIONAPP_NAME_DEV` | Dev Function App name | `urlip-dev-func` |
| `AZURE_FUNCTIONAPP_NAME_PROD` | Prod Function App name | `urlip-prod-func` |

### Setting Secrets via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Set secrets
gh secret set AZURE_CLIENT_ID --body "<your-client-id>"
gh secret set AZURE_TENANT_ID --body "<your-tenant-id>"
gh secret set AZURE_SUBSCRIPTION_ID --body "<your-subscription-id>"
gh secret set AZURE_FUNCTIONAPP_NAME_DEV --body "urlip-dev-func"
gh secret set AZURE_FUNCTIONAPP_NAME_PROD --body "urlip-prod-func"
```

### GitHub Environments Setup

1. Go to **Settings** > **Environments**
2. Create `development` environment
3. Create `production` environment with:
   - Required reviewers (optional but recommended)
   - Deployment branches: `release/*`

---

## Manual Deployment

### Deploy to Development

```powershell
# Navigate to project directory
cd C:\Projects\URLIP

# Login to Azure
az login

# Deploy to dev function app
func azure functionapp publish urlip-dev-func
```

### Deploy to Production

```powershell
# Deploy to prod function app
func azure functionapp publish urlip-prod-func
```

---

## CI/CD Pipeline

### Workflow Triggers

| Trigger | Action |
|---------|--------|
| Push to `main`/`master` | Build, test, deploy to Development |
| Push to `release/*` | Build, test, deploy to Development, then Production |
| Pull Request | Build and test only (no deployment) |
| Manual (workflow_dispatch) | Choose environment to deploy |

### Pipeline Stages

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Build &     │────►│  Security Scan  │────►│  Deploy     │
│  Test        │     │  (CodeQL)       │     │  Dev        │
└──────────────┘     └─────────────────┘     └──────┬──────┘
                                                    │
                                              (release/* only)
                                                    │
                                                    ▼
                                             ┌─────────────┐
                                             │  Deploy     │
                                             │  Prod       │
                                             └─────────────┘
```

---

## Troubleshooting

### Common Issues

#### OIDC Authentication Failure

**Error:** `AADSTS70021: No matching federated identity record found`

**Solution:** Ensure federated credentials match exactly:
- Repository owner/name must be exact (case-sensitive)
- Branch/environment name must match
- Audience must be `api://AzureADTokenExchange`

```powershell
# List existing federated credentials
az ad app federated-credential list --id <app-id>
```

#### Deployment Fails - Insufficient Permissions

**Error:** `The client does not have authorization to perform action`

**Solution:** Verify role assignments:

```powershell
# Check role assignments for the service principal
az role assignment list --assignee <app-id> --all
```

#### Function App Not Found

**Error:** `Function app 'urlip-dev-func' not found`

**Solution:** Create the Function App first:

```powershell
# Create Function App
az functionapp create \
  --resource-group urlip-dev-rg \
  --name urlip-dev-func \
  --storage-account urlipdevstorage \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4
```

---

## Security Considerations

1. **Never commit secrets** - Use Azure Key Vault and GitHub Secrets
2. **Use OIDC over service principal secrets** - No credentials stored
3. **Limit RBAC scope** - Only grant necessary permissions
4. **Enable branch protection** - Require PR reviews for main/master
5. **Audit deployments** - Review GitHub Actions logs regularly

---

## Related Documentation

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [OIDC Authentication](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)

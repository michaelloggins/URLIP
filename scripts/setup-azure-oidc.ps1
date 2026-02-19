# URLIP Azure OIDC Setup Script
# This script creates an Azure AD App Registration with federated credentials
# for GitHub Actions OIDC authentication (unattended deployments)
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - GitHub CLI installed (optional, for setting secrets)
#
# Usage:
#   .\setup-azure-oidc.ps1 -SubscriptionId "your-subscription-id"

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,

    [string]$AppName = "URLIP-GitHub-Actions",
    [string]$GitHubOrg = "michaelloggins",
    [string]$GitHubRepo = "URLIP",
    [string]$DevResourceGroup = "urlip-dev-rg",
    [string]$ProdResourceGroup = "urlip-prod-rg"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "URLIP Azure OIDC Setup Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Set subscription
Write-Host "Setting Azure subscription..." -ForegroundColor Yellow
az account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to set subscription. Please run 'az login' first."
    exit 1
}

$TenantId = az account show --query tenantId -o tsv
Write-Host "Tenant ID: $TenantId" -ForegroundColor Green

# Create App Registration
Write-Host ""
Write-Host "Creating App Registration: $AppName" -ForegroundColor Yellow
$AppId = az ad app create --display-name $AppName --query appId -o tsv
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create App Registration"
    exit 1
}
Write-Host "App Client ID: $AppId" -ForegroundColor Green

# Create Service Principal
Write-Host ""
Write-Host "Creating Service Principal..." -ForegroundColor Yellow
az ad sp create --id $AppId | Out-Null
Start-Sleep -Seconds 5  # Wait for SP to propagate

# Assign roles
Write-Host ""
Write-Host "Assigning RBAC roles..." -ForegroundColor Yellow

# Development RG - Contributor
az role assignment create --assignee $AppId --role "Contributor" --scope "/subscriptions/$SubscriptionId/resourceGroups/$DevResourceGroup" 2>$null
Write-Host "  Assigned Contributor to $DevResourceGroup" -ForegroundColor Green

# Production RG - Contributor
az role assignment create --assignee $AppId --role "Contributor" --scope "/subscriptions/$SubscriptionId/resourceGroups/$ProdResourceGroup" 2>$null
Write-Host "  Assigned Contributor to $ProdResourceGroup" -ForegroundColor Green

# Create Federated Credentials
Write-Host ""
Write-Host "Creating Federated Credentials for GitHub Actions..." -ForegroundColor Yellow

$federatedCredentials = @(
    @{
        name = "github-main"
        subject = "repo:${GitHubOrg}/${GitHubRepo}:ref:refs/heads/main"
    },
    @{
        name = "github-master"
        subject = "repo:${GitHubOrg}/${GitHubRepo}:ref:refs/heads/master"
    },
    @{
        name = "github-env-development"
        subject = "repo:${GitHubOrg}/${GitHubRepo}:environment:development"
    },
    @{
        name = "github-env-production"
        subject = "repo:${GitHubOrg}/${GitHubRepo}:environment:production"
    }
)

foreach ($cred in $federatedCredentials) {
    $params = @{
        name = $cred.name
        issuer = "https://token.actions.githubusercontent.com"
        subject = $cred.subject
        audiences = @("api://AzureADTokenExchange")
    } | ConvertTo-Json -Compress

    az ad app federated-credential create --id $AppId --parameters $params 2>$null
    Write-Host "  Created: $($cred.name)" -ForegroundColor Green
}

# Output summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these secrets to GitHub Repository Settings:" -ForegroundColor Yellow
Write-Host "  Settings > Secrets and variables > Actions" -ForegroundColor Gray
Write-Host ""
Write-Host "AZURE_CLIENT_ID:       $AppId" -ForegroundColor White
Write-Host "AZURE_TENANT_ID:       $TenantId" -ForegroundColor White
Write-Host "AZURE_SUBSCRIPTION_ID: $SubscriptionId" -ForegroundColor White
Write-Host ""

# Optionally set secrets via GitHub CLI
$setSecrets = Read-Host "Set secrets via GitHub CLI now? (y/n)"
if ($setSecrets -eq "y") {
    Write-Host ""
    Write-Host "Setting GitHub secrets..." -ForegroundColor Yellow

    gh secret set AZURE_CLIENT_ID --body $AppId --repo "${GitHubOrg}/${GitHubRepo}"
    gh secret set AZURE_TENANT_ID --body $TenantId --repo "${GitHubOrg}/${GitHubRepo}"
    gh secret set AZURE_SUBSCRIPTION_ID --body $SubscriptionId --repo "${GitHubOrg}/${GitHubRepo}"
    gh secret set AZURE_FUNCTIONAPP_NAME_DEV --body "urlip-dev-func" --repo "${GitHubOrg}/${GitHubRepo}"
    gh secret set AZURE_FUNCTIONAPP_NAME_PROD --body "urlip-prod-func" --repo "${GitHubOrg}/${GitHubRepo}"

    Write-Host "GitHub secrets configured!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create GitHub Environments (development, production)" -ForegroundColor White
Write-Host "2. Create Azure Function Apps (urlip-dev-func, urlip-prod-func)" -ForegroundColor White
Write-Host "3. Push code to trigger the CI/CD pipeline" -ForegroundColor White
Write-Host ""

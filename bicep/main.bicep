// ============================================================================
// URLIP Infrastructure - Main Orchestration Template
// ============================================================================
// This template deploys the URLIP Azure Functions infrastructure including:
// - Log Analytics Workspace for monitoring
// - Application Insights for APM
// - Storage Account for Functions
// - App Configuration for feature flags
// - Key Vault for secrets
// - Azure Function App (Node.js v18)
// ============================================================================

targetScope = 'subscription'

// ============================================================================
// Parameters
// ============================================================================

@description('Azure region for deployment')
param location string = 'centralus'

@description('Environment name')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Project name for resource naming')
param projectName string = 'urlip'

@description('Instance number for resource naming')
param instance string = '001'

@description('Resource group name')
param resourceGroupName string = 'rg-${projectName}-${environment}-${location}-${instance}'

@description('Resource tags')
param tags object = {
  Environment: environment
  Project: 'URLIP'
  Owner: 'MVD Integration Team'
  CostCenter: 'Integration'
  Compliance: 'HIPAA-SOC2'
  ManagedBy: 'Bicep'
  CreatedDate: utcNow('yyyy-MM-dd')
}

// ============================================================================
// Resource Group
// ============================================================================

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// ============================================================================
// Monitoring Module
// ============================================================================

module monitoring 'modules/monitoring.bicep' = {
  scope: rg
  name: 'monitoring-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    instance: instance
    tags: tags
  }
}

// ============================================================================
// Storage Module
// ============================================================================

module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storage-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    instance: instance
    logAnalyticsWorkspaceId: monitoring.outputs.workspaceId
    tags: tags
  }
}

// ============================================================================
// Key Vault Module
// ============================================================================

module keyVault 'modules/keyvault.bicep' = {
  scope: rg
  name: 'keyvault-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    instance: instance
    logAnalyticsWorkspaceId: monitoring.outputs.workspaceId
    tags: tags
  }
}

// ============================================================================
// App Configuration Module
// ============================================================================

module appConfig 'modules/appconfig.bicep' = {
  scope: rg
  name: 'appconfig-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    instance: instance
    tags: tags
  }
}

// ============================================================================
// Function App Module
// ============================================================================

module functionApp 'modules/functionapp.bicep' = {
  scope: rg
  name: 'functionapp-deployment'
  params: {
    location: location
    projectName: projectName
    environment: environment
    instance: instance
    storageAccountName: storage.outputs.storageAccountName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    appInsightsInstrumentationKey: monitoring.outputs.appInsightsInstrumentationKey
    keyVaultName: keyVault.outputs.keyVaultName
    appConfigEndpoint: appConfig.outputs.appConfigEndpoint
    tags: tags
  }
}

// ============================================================================
// Outputs
// ============================================================================

@description('Resource group name')
output resourceGroupName string = rg.name

@description('Resource group ID')
output resourceGroupId string = rg.id

@description('Function App name')
output functionAppName string = functionApp.outputs.functionAppName

@description('Function App default hostname')
output functionAppHostname string = functionApp.outputs.functionAppHostname

@description('Storage Account name')
output storageAccountName string = storage.outputs.storageAccountName

@description('Key Vault name')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('App Configuration endpoint')
output appConfigEndpoint string = appConfig.outputs.appConfigEndpoint

@description('Log Analytics workspace ID')
output logAnalyticsWorkspaceId string = monitoring.outputs.workspaceId

@description('Application Insights name')
output appInsightsName string = monitoring.outputs.appInsightsName

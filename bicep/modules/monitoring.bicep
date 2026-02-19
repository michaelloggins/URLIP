// ============================================================================
// URLIP Monitoring Module
// Deploys Log Analytics Workspace and Application Insights
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Project name for resource naming')
param projectName string

@description('Environment name (dev, test, prod)')
param environment string

@description('Instance number')
param instance string

@description('Log Analytics retention in days')
param retentionInDays int = 365

@description('Resource tags')
param tags object

// ============================================================================
// Variables
// ============================================================================

var logAnalyticsName = 'log-${projectName}-${environment}-${location}-${instance}'
var appInsightsName = 'appi-${projectName}-${environment}-${location}-${instance}'

// ============================================================================
// Log Analytics Workspace
// ============================================================================

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: -1
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ============================================================================
// Application Insights
// ============================================================================

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: 90
  }
}

// ============================================================================
// Outputs
// ============================================================================

@description('Log Analytics workspace resource ID')
output workspaceId string = logAnalyticsWorkspace.id

@description('Log Analytics workspace name')
output workspaceName string = logAnalyticsWorkspace.name

@description('Application Insights resource ID')
output appInsightsId string = appInsights.id

@description('Application Insights name')
output appInsightsName string = appInsights.name

@description('Application Insights instrumentation key')
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey

@description('Application Insights connection string')
output appInsightsConnectionString string = appInsights.properties.ConnectionString

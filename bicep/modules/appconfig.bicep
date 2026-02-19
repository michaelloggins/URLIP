// ============================================================================
// URLIP App Configuration Module
// Deploys Azure App Configuration for feature flags and configuration
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Project name for resource naming')
param projectName string

@description('Environment name (dev, test, prod)')
param environment string

@description('Instance number')
param instance string

@description('App Configuration SKU')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Standard'

@description('Enable soft delete')
param enableSoftDelete bool = true

@description('Soft delete retention in days')
param softDeleteRetentionInDays int = 7

@description('Resource tags')
param tags object

// ============================================================================
// Variables
// ============================================================================

// Shortened naming for consistency with Key Vault
var appConfigName = 'appcs-${projectName}-${environment}-${instance}'

// ============================================================================
// App Configuration
// ============================================================================

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2023-03-01' = {
  name: appConfigName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  properties: {
    disableLocalAuth: false
    enablePurgeProtection: false
    softDeleteRetentionInDays: enableSoftDelete ? softDeleteRetentionInDays : 0
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================================================
// Default Feature Flags
// ============================================================================

// Global feature toggle: Order Entry
resource featureOrderEntry 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: '.appconfig.featureflag~2FFEATURE_ORDER_ENTRY'
  properties: {
    value: '{"id":"FEATURE_ORDER_ENTRY","description":"Enable order entry functionality","enabled":${environment == 'dev'},"conditions":{"client_filters":[]}}'
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}

// Global feature toggle: Result Viewing
resource featureResultViewing 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: '.appconfig.featureflag~2FFEATURE_RESULT_VIEWING'
  properties: {
    value: '{"id":"FEATURE_RESULT_VIEWING","description":"Enable result viewing functionality","enabled":true,"conditions":{"client_filters":[]}}'
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}

// Global feature toggle: Billing Portal
resource featureBillingPortal 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: '.appconfig.featureflag~2FFEATURE_BILLING_PORTAL'
  properties: {
    value: '{"id":"FEATURE_BILLING_PORTAL","description":"Enable billing portal functionality","enabled":false,"conditions":{"client_filters":[]}}'
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}

// Global feature toggle: Compendium Access
resource featureCompendiumAccess 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: '.appconfig.featureflag~2FFEATURE_COMPENDIUM_ACCESS'
  properties: {
    value: '{"id":"FEATURE_COMPENDIUM_ACCESS","description":"Enable compendium access functionality","enabled":true,"conditions":{"client_filters":[]}}'
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}

// Global feature toggle: Admin Features
resource featureAdminFeatures 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: '.appconfig.featureflag~2FFEATURE_ADMIN_FEATURES'
  properties: {
    value: '{"id":"FEATURE_ADMIN_FEATURES","description":"Enable admin features for customer portal admins","enabled":true,"conditions":{"client_filters":[]}}'
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}

// ============================================================================
// Default Configuration Values
// ============================================================================

// Compendium version
resource configCompendiumVersion 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: 'URLIP:Compendium:Version'
  properties: {
    value: '1.0.0'
    contentType: 'text/plain'
  }
}

// Environment identifier
resource configEnvironment 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: appConfig
  name: 'URLIP:Environment'
  properties: {
    value: environment
    contentType: 'text/plain'
  }
}

// ============================================================================
// Outputs
// ============================================================================

@description('App Configuration resource ID')
output appConfigId string = appConfig.id

@description('App Configuration name')
output appConfigName string = appConfig.name

@description('App Configuration endpoint')
output appConfigEndpoint string = appConfig.properties.endpoint

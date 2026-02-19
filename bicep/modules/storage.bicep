// ============================================================================
// URLIP Storage Module
// Deploys Storage Account for Azure Functions and data storage
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Project name for resource naming')
param projectName string

@description('Environment name (dev, test, prod)')
param environment string

@description('Instance number')
param instance string

@description('Storage account SKU')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
  'Standard_ZRS'
])
param storageSku string = 'Standard_LRS'

@description('Log Analytics workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

@description('Resource tags')
param tags object

// ============================================================================
// Variables
// ============================================================================

// Storage account names must be 3-24 chars, lowercase, no hyphens
var storageAccountName = 'st${projectName}${environment}${instance}'

// ============================================================================
// Storage Account
// ============================================================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: storageSku
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    encryption: {
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
        queue: {
          enabled: true
          keyType: 'Account'
        }
        table: {
          enabled: true
          keyType: 'Account'
        }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

// Blob Services configuration
resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    isVersioningEnabled: true
    changeFeed: {
      enabled: true
      retentionInDays: 30
    }
  }
}

// ============================================================================
// Containers
// ============================================================================

// Compendium container for test catalog files
resource compendiumContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'compendium'
  properties: {
    publicAccess: 'None'
    metadata: {
      purpose: 'Compendium JSON files and crosswalks'
      environment: environment
    }
  }
}

// HL7 messages container for message archival
resource hl7Container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'hl7-messages'
  properties: {
    publicAccess: 'None'
    metadata: {
      purpose: 'HL7 message archive'
      environment: environment
    }
  }
}

// Documentation container
resource docsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'documentation'
  properties: {
    publicAccess: 'None'
    metadata: {
      purpose: 'Integration documentation and companion guides'
      environment: environment
    }
  }
}

// ============================================================================
// Diagnostics
// ============================================================================

resource storageDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'storage-diagnostics'
  scope: storageAccount
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    metrics: [
      {
        category: 'Transaction'
        enabled: true
      }
      {
        category: 'Capacity'
        enabled: true
      }
    ]
  }
}

// ============================================================================
// Outputs
// ============================================================================

@description('Storage account resource ID')
output storageAccountId string = storageAccount.id

@description('Storage account name')
output storageAccountName string = storageAccount.name

@description('Storage account primary blob endpoint')
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('Compendium container name')
output compendiumContainerName string = compendiumContainer.name

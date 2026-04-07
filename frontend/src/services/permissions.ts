import { UserRole } from '../types';

export interface Permission {
  createParcels: boolean;
  editParcels: boolean;
  uploadRasters: boolean;
  drawBoundaries: boolean;
  assignParcels: boolean;
  viewAllParcels: boolean;
  uploadDocuments: boolean;
  viewAllDocuments: boolean;
  manageUsers: boolean;
  receiveAllAlerts: boolean;
  generateGISReports: boolean;
}

export const getPermissions = (role: UserRole): Permission => {
  if (role === 'land_consultant') {
    return {
      createParcels: true,
      editParcels: true,
      uploadRasters: true,
      drawBoundaries: true,
      assignParcels: true,
      viewAllParcels: true,
      uploadDocuments: true,
      viewAllDocuments: true,
      manageUsers: true,
      receiveAllAlerts: true,
      generateGISReports: true
    };
  } else { // landowner
    return {
      createParcels: false,
      editParcels: false,
      uploadRasters: false,
      drawBoundaries: false,
      assignParcels: false,
      viewAllParcels: false,
      uploadDocuments: false,
      viewAllDocuments: false,
      manageUsers: false,
      receiveAllAlerts: false,
      generateGISReports: false // Only own parcels
    };
  }
};

export const hasPermission = (role: UserRole, permission: keyof Permission): boolean => {
  const permissions = getPermissions(role);
  return permissions[permission];
};

// UI visibility helpers
export const shouldShowCreateParcelButton = (role: UserRole): boolean => {
  return hasPermission(role, 'createParcels');
};

export const shouldShowDrawingTools = (role: UserRole): boolean => {
  return hasPermission(role, 'drawBoundaries');
};

export const shouldShowUploadButton = (role: UserRole): boolean => {
  return hasPermission(role, 'uploadDocuments');
};

export const shouldShowAllParcels = (role: UserRole): boolean => {
  return hasPermission(role, 'viewAllParcels');
};

export const shouldShowUserManagement = (role: UserRole): boolean => {
  return hasPermission(role, 'manageUsers');
};

// Feature access helpers
export const canAccessFeature = (role: UserRole, feature: string): boolean => {
  switch (feature) {
    case 'create_parcel':
      return hasPermission(role, 'createParcels');
    case 'edit_parcel':
      return hasPermission(role, 'editParcels');
    case 'upload_raster':
      return hasPermission(role, 'uploadRasters');
    case 'draw_boundary':
      return hasPermission(role, 'drawBoundaries');
    case 'assign_parcel':
      return hasPermission(role, 'assignParcels');
    case 'view_all_parcels':
      return hasPermission(role, 'viewAllParcels');
    case 'upload_document':
      return hasPermission(role, 'uploadDocuments');
    case 'view_all_documents':
      return hasPermission(role, 'viewAllDocuments');
    case 'manage_users':
      return hasPermission(role, 'manageUsers');
    case 'all_alerts':
      return hasPermission(role, 'receiveAllAlerts');
    case 'gis_reports':
      return hasPermission(role, 'generateGISReports');
    default:
      return false;
  }
};

// Role display helpers
export const getRoleDisplayName = (role: UserRole): string => {
  return role === 'land_consultant' ? 'Land Consultant' : 'Landowner';
};

export const getRoleDescription = (role: UserRole): string => {
  if (role === 'land_consultant') {
    return 'Full access to create, manage, and analyze all parcels. Can invite and manage landowners.';
  } else {
    return 'View access to your own parcels including health data, valuations, and documents.';
  }
};
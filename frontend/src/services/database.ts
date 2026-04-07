import * as SQLite from 'expo-sqlite';
import { UserProfile, UserRole } from '../types';

const db = SQLite.openDatabaseSync('agrinova.db');

// Initialize database tables
export const initializeDatabase = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone TEXT,
      role TEXT CHECK(role IN ('LANDOWNER', 'LAND_CONSULTANT')),
      name TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT,
      consultant_id TEXT,
      boundary TEXT, -- JSON string of coordinates
      area_hectares REAL,
      crop_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id),
      FOREIGN KEY (consultant_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS parcel_health (
      id TEXT PRIMARY KEY,
      parcel_id TEXT,
      health_score INTEGER,
      status TEXT,
      ndvi_data TEXT, -- JSON string
      assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parcel_id) REFERENCES parcels (id)
    );

    CREATE TABLE IF NOT EXISTS parcel_valuations (
      id TEXT PRIMARY KEY,
      parcel_id TEXT,
      estimated_value REAL,
      factors TEXT, -- JSON string of valuation factors
      valuation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parcel_id) REFERENCES parcels (id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      parcel_id TEXT,
      name TEXT,
      type TEXT,
      file_path TEXT,
      uploaded_by TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parcel_id) REFERENCES parcels (id),
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS geofencing_alerts (
      id TEXT PRIMARY KEY,
      parcel_id TEXT,
      alert_type TEXT,
      message TEXT,
      coordinates TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_status BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (parcel_id) REFERENCES parcels (id)
    );
  `);
};

// User management
export const saveUser = (user: UserProfile) => {
  const stmt = db.prepareSync(`
    INSERT OR REPLACE INTO users (id, email, phone, role, name, location, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.executeSync([user.uid, user.email, user.phone, user.role, user.name, user.location]);
};

export const getUser = (userId: string): UserProfile | null => {
  const stmt = db.prepareSync('SELECT * FROM users WHERE id = ?');
  const result = stmt.executeSync([userId]).getFirstSync() as any;
  
  if (!result) return null;
  
  return {
    uid: result.id,
    email: result.email,
    phone: result.phone,
    role: result.role as UserRole,
    name: result.name,
    location: result.location
  };
};

export const getCurrentUser = (): UserProfile | null => {
  const stmt = db.prepareSync('SELECT * FROM users ORDER BY updated_at DESC LIMIT 1');
  const result = stmt.executeSync([]).getFirstSync() as any;
  
  if (!result) return null;
  
  return {
    uid: result.id,
    email: result.email,
    phone: result.phone,
    role: result.role as UserRole,
    name: result.name,
    location: result.location
  };
};

// Parcel management
export interface Parcel {
  id: string;
  name: string;
  ownerId: string;
  consultantId: string | null;
  boundary: Array<{latitude: number, longitude: number}>;
  areaHectares: number;
  cropType: string;
  createdAt: string;
  updatedAt: string;
}

export const createParcel = (parcel: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>) => {
  const id = `parcel_${Date.now()}`;
  const stmt = db.prepareSync(`
    INSERT INTO parcels (id, name, owner_id, consultant_id, boundary, area_hectares, crop_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.executeSync([
    id,
    parcel.name,
    parcel.ownerId,
    parcel.consultantId,
    JSON.stringify(parcel.boundary),
    parcel.areaHectares,
    parcel.cropType
  ]);
  return id;
};

export const getParcelsForUser = (userId: string, userRole: UserRole): Parcel[] => {
  let query = '';
  let params: string[] = [];

  if (userRole === 'LAND_CONSULTANT') {
    // Consultants can see all parcels they manage
    query = 'SELECT * FROM parcels WHERE consultant_id = ? OR consultant_id IS NULL';
    params = [userId];
  } else {
    // Landowners can only see their own parcels
    query = 'SELECT * FROM parcels WHERE owner_id = ?';
    params = [userId];
  }

  const stmt = db.prepareSync(query);
  const results = stmt.executeSync(params).getAllSync() as any[];
  
  return results.map(row => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    consultantId: row.consultant_id,
    boundary: JSON.parse(row.boundary || '[]'),
    areaHectares: row.area_hectares,
    cropType: row.crop_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const updateParcel = (parcelId: string, updates: Partial<Parcel>) => {
  const fields = [];
  const values = [];
  
  if (updates.name) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.boundary) {
    fields.push('boundary = ?');
    values.push(JSON.stringify(updates.boundary));
  }
  if (updates.areaHectares) {
    fields.push('area_hectares = ?');
    values.push(updates.areaHectares);
  }
  if (updates.cropType) {
    fields.push('crop_type = ?');
    values.push(updates.cropType);
  }
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(parcelId);
  
  const query = `UPDATE parcels SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepareSync(query);
  stmt.executeSync(values);
};

export const assignParcelToOwner = (parcelId: string, ownerId: string) => {
  const stmt = db.prepareSync('UPDATE parcels SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.executeSync([ownerId, parcelId]);
};

// Health data management
export const saveParcelHealth = (parcelId: string, healthData: any) => {
  const id = `health_${Date.now()}`;
  const stmt = db.prepareSync(`
    INSERT INTO parcel_health (id, parcel_id, health_score, status, ndvi_data)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.executeSync([
    id,
    parcelId,
    healthData.healthScore,
    healthData.status,
    JSON.stringify(healthData.ndviData)
  ]);
};

export const getParcelHealth = (parcelId: string) => {
  const stmt = db.prepareSync('SELECT * FROM parcel_health WHERE parcel_id = ? ORDER BY assessment_date DESC LIMIT 1');
  const result = stmt.executeSync([parcelId]).getFirstSync() as any;
  
  if (!result) return null;
  
  return {
    id: result.id,
    parcelId: result.parcel_id,
    healthScore: result.health_score,
    status: result.status,
    ndviData: JSON.parse(result.ndvi_data || '{}'),
    assessmentDate: result.assessment_date
  };
};

// Valuation data management
export const saveParcelValuation = (parcelId: string, valuationData: any) => {
  const id = `valuation_${Date.now()}`;
  const stmt = db.prepareSync(`
    INSERT INTO parcel_valuations (id, parcel_id, estimated_value, factors)
    VALUES (?, ?, ?, ?)
  `);
  stmt.executeSync([
    id,
    parcelId,
    valuationData.estimatedValue,
    JSON.stringify(valuationData.factors)
  ]);
};

export const getParcelValuation = (parcelId: string) => {
  const stmt = db.prepareSync('SELECT * FROM parcel_valuations WHERE parcel_id = ? ORDER BY valuation_date DESC LIMIT 1');
  const result = stmt.executeSync([parcelId]).getFirstSync() as any;
  
  if (!result) return null;
  
  return {
    id: result.id,
    parcelId: result.parcel_id,
    estimatedValue: result.estimated_value,
    factors: JSON.parse(result.factors || '[]'),
    valuationDate: result.valuation_date
  };
};

// Permission helpers
export const canCreateParcels = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};

export const canEditParcels = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};

export const canUploadDocuments = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};

export const canViewAllParcels = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};

export const canDrawBoundaries = (userRole: UserRole): boolean => {
  return userRole === 'LAND_CONSULTANT';
};
// Quick test script to verify role system
import { getPermissions } from './permissions';

console.log('=== Testing Role System ===');

console.log('Consultant permissions:', getPermissions('land_consultant'));
console.log('Landowner permissions:', getPermissions('landowner'));

// Test scenarios
const testRoles = ['land_consultant', 'landowner'] as const;

testRoles.forEach(role => {
  const perms = getPermissions(role);
  console.log(`\n${role.toUpperCase()}:`);
  console.log(`- Can draw boundaries: ${perms.drawBoundaries}`);
  console.log(`- Can create parcels: ${perms.createParcels}`);
  console.log(`- Can view all parcels: ${perms.viewAllParcels}`);
  console.log(`- Can upload documents: ${perms.uploadDocuments}`);
});
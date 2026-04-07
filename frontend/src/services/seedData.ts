import { createParcel, saveUser, saveParcelHealth, saveParcelValuation } from './database_temp';
import { UserRole } from '../types';

// Seed demo data for testing
export const seedDemoData = async () => {
  console.log('Seeding demo data...');
  
  // Create demo users
  const consultantUser = {
    uid: 'consultant_demo',
    email: 'consultant@agrinova.com',
    phone: '+917307058932',
    role: 'land_consultant' as UserRole,
    name: 'John Smith',
    location: 'Bangalore, Karnataka'
  };
  
  const landownerUser = {
    uid: 'landowner_demo',
    email: 'landowner@example.com',
    phone: '+917307058933',
    role: 'landowner' as UserRole,
    name: 'Rajesh Kumar',
    location: 'Bangalore, Karnataka'
  };
  
  await saveUser(consultantUser);
  await saveUser(landownerUser);
  
  // Create demo parcels
  const parcel1 = await createParcel({
    name: 'North Field - Rice Cultivation',
    ownerId: 'landowner_demo',
    consultantId: 'consultant_demo',
    boundary: [
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9720, longitude: 77.5950 },
      { latitude: 12.9718, longitude: 77.5955 },
      { latitude: 12.9714, longitude: 77.5951 }
    ],
    areaHectares: 2.5,
    cropType: 'Rice'
  });
  
  const parcel2 = await createParcel({
    name: 'South Field - Millet Farm',
    ownerId: 'landowner_demo',
    consultantId: 'consultant_demo',
    boundary: [
      { latitude: 12.9710, longitude: 77.5940 },
      { latitude: 12.9714, longitude: 77.5944 },
      { latitude: 12.9712, longitude: 77.5949 },
      { latitude: 12.9708, longitude: 77.5945 }
    ],
    areaHectares: 1.8,
    cropType: 'Millet'
  });
  
  const parcel3 = await createParcel({
    name: 'West Field - Organic Vegetables',
    ownerId: 'consultant_demo', // Consultant owns this one
    consultantId: null,
    boundary: [
      { latitude: 12.9700, longitude: 77.5930 },
      { latitude: 12.9704, longitude: 77.5934 },
      { latitude: 12.9702, longitude: 77.5939 },
      { latitude: 12.9698, longitude: 77.5935 }
    ],
    areaHectares: 3.2,
    cropType: 'Mixed Vegetables'
  });
  
  // Add health data
  await saveParcelHealth(parcel1, {
    healthScore: 78,
    status: 'Healthy',
    ndviData: {
      dense: 35,
      healthy: 40,
      sparse: 20,
      stressed: 5
    }
  });
  
  await saveParcelHealth(parcel2, {
    healthScore: 65,
    status: 'Moderate',
    ndviData: {
      dense: 25,
      healthy: 45,
      sparse: 25,
      stressed: 5
    }
  });
  
  await saveParcelHealth(parcel3, {
    healthScore: 85,
    status: 'Excellent',
    ndviData: {
      dense: 45,
      healthy: 35,
      sparse: 15,
      stressed: 5
    }
  });
  
  // Add valuation data
  await saveParcelValuation(parcel1, {
    estimatedValue: 1250000,
    factors: [
      { name: 'Soil Quality', contribution: 25, score: 8.2 },
      { name: 'Water Availability', contribution: 20, score: 7.8 },
      { name: 'Market Access', contribution: 20, score: 7.5 },
      { name: 'Crop Health', contribution: 35, score: 8.0 }
    ]
  });
  
  await saveParcelValuation(parcel2, {
    estimatedValue: 980000,
    factors: [
      { name: 'Soil Quality', contribution: 25, score: 7.5 },
      { name: 'Water Availability', contribution: 20, score: 7.0 },
      { name: 'Market Access', contribution: 20, score: 7.8 },
      { name: 'Crop Health', contribution: 35, score: 7.2 }
    ]
  });
  
  await saveParcelValuation(parcel3, {
    estimatedValue: 1850000,
    factors: [
      { name: 'Soil Quality', contribution: 25, score: 9.1 },
      { name: 'Water Availability', contribution: 20, score: 8.5 },
      { name: 'Market Access', contribution: 20, score: 8.2 },
      { name: 'Crop Health', contribution: 35, score: 8.8 }
    ]
  });
  
  console.log('Demo data seeded successfully');
  console.log(`Created parcels: ${parcel1}, ${parcel2}, ${parcel3}`);
};
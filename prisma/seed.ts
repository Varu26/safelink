import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const userV = await prisma.user.upsert({
    where: { email: 'victim@demo.safelink.app' },
    update: {},
    create: {
      email: 'victim@demo.safelink.app',
      name: 'Victim User',
      emailVerified: new Date(),
    },
  });

  const contactR = await prisma.user.upsert({
    where: { email: 'contact-r@demo.safelink.app' },
    update: {},
    create: {
      email: 'contact-r@demo.safelink.app',
      name: 'Contact R (Family)',
      emailVerified: new Date(),
    },
  });

  const contactP = await prisma.user.upsert({
    where: { email: 'contact-p@demo.safelink.app' },
    update: {},
    create: {
      email: 'contact-p@demo.safelink.app',
      name: 'Contact P (Friend)',
      emailVerified: new Date(),
    },
  });

  const userQ = await prisma.user.upsert({
    where: { email: 'unrelated@demo.safelink.app' },
    update: {},
    create: {
      email: 'unrelated@demo.safelink.app',
      name: 'Unrelated User Q',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created demo users');

  // Create settings for each user
  await Promise.all([
    prisma.userSettings.upsert({
      where: { userId: userV.id },
      update: {},
      create: {
        userId: userV.id,
        locationSharing: true,
        emailNotifications: true,
        pushNotifications: true,
        alertSound: true,
        vibration: true,
        autoResolveHours: 24,
        testMode: true,
      },
    }),
    prisma.userSettings.upsert({
      where: { userId: contactR.id },
      update: {},
      create: {
        userId: contactR.id,
        locationSharing: true,
        emailNotifications: true,
        pushNotifications: true,
        alertSound: true,
        vibration: true,
        autoResolveHours: 24,
        testMode: true,
      },
    }),
    prisma.userSettings.upsert({
      where: { userId: contactP.id },
      update: {},
      create: {
        userId: contactP.id,
        locationSharing: true,
        emailNotifications: true,
        pushNotifications: true,
        alertSound: true,
        vibration: true,
        autoResolveHours: 24,
        testMode: true,
      },
    }),
    prisma.userSettings.upsert({
      where: { userId: userQ.id },
      update: {},
      create: {
        userId: userQ.id,
        locationSharing: true,
        emailNotifications: true,
        pushNotifications: true,
        alertSound: true,
        vibration: true,
        autoResolveHours: 24,
        testMode: true,
      },
    }),
  ]);

  console.log('✅ Created user settings');

  // Create device for user V
  const deviceV = await prisma.watchDevice.upsert({
    where: { deviceId: 'WLK-DEMO001' },
    update: {},
    create: {
      userId: userV.id,
      deviceId: 'WLK-DEMO001',
      name: 'SafeLink Watch Demo',
      model: 'Demo Simulator',
      firmwareVersion: '1.0.0',
      batteryLevel: 85,
      isConnected: true,
      lastSeen: new Date(),
      isPaired: true,
      pairedAt: new Date(),
    },
  });

  console.log('✅ Created demo device');

  // Create emergency contacts for user V
  const contactRRecord = await prisma.emergencyContact.upsert({
    where: { id: `contact-${userV.id}-${contactR.id}` },
    update: {},
    create: {
      id: `contact-${userV.id}-${contactR.id}`,
      userId: userV.id,
      name: 'Contact R (Family)',
      email: contactR.email,
      phone: '+1 (555) 123-4567',
      relationship: 'Family',
      isVerified: true,
      isActive: true,
      verifiedAt: new Date(),
    },
  });

  const contactPRecord = await prisma.emergencyContact.upsert({
    where: { id: `contact-${userV.id}-${contactP.id}` },
    update: {},
    create: {
      id: `contact-${userV.id}-${contactP.id}`,
      userId: userV.id,
      name: 'Contact P (Friend)',
      email: contactP.email,
      phone: '+1 (555) 987-6543',
      relationship: 'Friend',
      isVerified: true,
      isActive: true,
      verifiedAt: new Date(),
    },
  });

  console.log('✅ Created emergency contacts for user V');

  // Create contacts for contact R (so they can test receiving alerts)
  await prisma.emergencyContact.upsert({
    where: { id: `contact-${contactR.id}-${userV.id}` },
    update: {},
    create: {
      id: `contact-${contactR.id}-${userV.id}`,
      userId: contactR.id,
      name: 'Victim User',
      email: userV.email,
      relationship: 'Family',
      isVerified: true,
      isActive: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: { id: `contact-${contactP.id}-${userV.id}` },
    update: {},
    create: {
      id: `contact-${contactP.id}-${userV.id}`,
      userId: contactP.id,
      name: 'Victim User',
      email: userV.email,
      relationship: 'Friend',
      isVerified: true,
      isActive: true,
      verifiedAt: new Date(),
    },
  });

  console.log('✅ Created reverse contacts');

  // Create a test alert for user V (resolved)
  const testAlert = await prisma.emergencyAlert.create({
    data: {
      userId: userV.id,
      status: 'RESOLVED',
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      confirmedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000),
      resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      locationLat: 37.7749,
      locationLng: -122.4194,
      locationAccuracy: 10,
      locationUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      metadata: { isTest: true },
    },
  });

  // Create recipients for test alert
  await Promise.all([
    prisma.alertRecipient.create({
      data: {
        alertId: testAlert.id,
        contactId: contactRRecord.id,
        userId: userV.id,
        email: contactRRecord.email,
        name: contactRRecord.name,
        isNotified: true,
        notifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6000),
        emailSent: true,
        emailSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6000),
      },
    }),
    prisma.alertRecipient.create({
      data: {
        alertId: testAlert.id,
        contactId: contactPRecord.id,
        userId: userV.id,
        email: contactPRecord.email,
        name: contactPRecord.name,
        isNotified: true,
        notifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6000),
        emailSent: true,
        emailSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6000),
      },
    }),
  ]);

  // Create acknowledgement
  await prisma.alertAcknowledgement.create({
    data: {
      alertId: testAlert.id,
      userId: contactR.id,
      recipientId: (await prisma.alertRecipient.findFirst({
        where: {
          alertId: testAlert.id,
          contactId: contactRRecord.id,
        },
      }))!.id,
    },
  });

  // Create location updates
  await Promise.all([
    prisma.locationUpdate.create({
      data: {
        alertId: testAlert.id,
        lat: 37.7749,
        lng: -122.4194,
        accuracy: 10,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.locationUpdate.create({
      data: {
        alertId: testAlert.id,
        lat: 37.7750,
        lng: -122.4195,
        accuracy: 8,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 - 30 * 60 * 1000),
      },
    }),
  ]);

  console.log('✅ Created test alert with history');

  // Create notification logs
  await Promise.all([
    prisma.notificationLog.create({
      data: {
        alertId: testAlert.id,
        userId: userV.id,
        type: 'EMAIL',
        status: 'SENT',
        provider: 'nodemailer',
        providerId: 'test-message-id-1',
      },
    }),
    prisma.notificationLog.create({
      data: {
        alertId: testAlert.id,
        userId: userV.id,
        type: 'EMAIL',
        status: 'SENT',
        provider: 'nodemailer',
        providerId: 'test-message-id-2',
      },
    }),
  ]);

  console.log('✅ Created notification logs');

  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Demo Accounts:');
  console.log('  - Victim User (V): victim@demo.safelink.app');
  console.log('  - Contact R (Family): contact-r@demo.safelink.app');
  console.log('  - Contact P (Friend): contact-p@demo.safelink.app');
  console.log('  - Unrelated User Q: unrelated@demo.safelink.app');
  console.log('');
  console.log('All accounts use Google OAuth. Use any Google account to sign in.');
  console.log('The demo data will be linked to the first user who signs in with these emails.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
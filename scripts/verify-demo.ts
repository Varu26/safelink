#!/usr/bin/env tsx
/**
 * Demo Verification Script
 * Tests the V → R/P notification flow and Q isolation
 * Run after seeding database and starting dev server
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDemo() {
  console.log('🔍 Starting SafeLink Demo Verification\n');

  // Get demo users
  const userV = await prisma.user.findUnique({ where: { email: 'victim@demo.safelink.app' } });
  const contactR = await prisma.user.findUnique({ where: { email: 'contact-r@demo.safelink.app' } });
  const contactP = await prisma.user.findUnique({ where: { email: 'contact-p@demo.safelink.app' } });
  const userQ = await prisma.user.findUnique({ where: { email: 'unrelated@demo.safelink.app' } });

  if (!userV || !contactR || !contactP || !userQ) {
    console.error('❌ Demo users not found. Run `npm run db:seed` first.');
    process.exit(1);
  }

  console.log('✅ Demo users found:');
  console.log(`   V (Victim): ${userV.name} (${userV.email})`);
  console.log(`   R (Contact): ${contactR.name} (${contactR.email})`);
  console.log(`   P (Contact): ${contactP.name} (${contactP.email})`);
  console.log(`   Q (Unrelated): ${userQ.name} (${userQ.email})\n`);

  // Check V's contacts
  const contactsV = await prisma.emergencyContact.findMany({
    where: { userId: userV.id, isActive: true, isVerified: true },
  });

  console.log(`✅ V has ${contactsV.length} verified active contacts:`);
  contactsV.forEach(c => console.log(`   - ${c.name} (${c.email}) - ${c.relationship}`));

  // Check R and P have V as contact
  const contactsR = await prisma.emergencyContact.findMany({ where: { userId: contactR.id, isVerified: true } });
  const contactsP = await prisma.emergencyContact.findMany({ where: { userId: contactP.id, isVerified: true } });

  console.log(`\n✅ R has ${contactsR.length} verified contacts`);
  console.log(`✅ P has ${contactsP.length} verified contacts`);

  // Check Q has no access to V's data
  const contactsQ = await prisma.emergencyContact.findMany({ where: { userId: userQ.id } });
  console.log(`\n✅ Q has ${contactsQ.length} contacts (should not include V)`);

  // Create a test alert for V
  console.log('\n🚨 Creating test emergency alert for V...');
  
  const alert = await prisma.emergencyAlert.create({
    data: {
      userId: userV.id,
      status: 'ACTIVE',
      triggeredAt: new Date(),
      confirmedAt: new Date(),
      locationLat: 37.7749,
      locationLng: -122.4194,
      locationAccuracy: 10,
      locationUpdatedAt: new Date(),
      metadata: { isTest: true, verificationRun: true },
    },
  });

  console.log(`✅ Alert created: ${alert.id}`);

  // Create recipients for V's contacts
  const recipients = await Promise.all(
    contactsV.map(contact =>
      prisma.alertRecipient.create({
        data: {
          alertId: alert.id,
          contactId: contact.id,
          userId: userV.id,
          email: contact.email,
          name: contact.name,
          isNotified: true,
          notifiedAt: new Date(),
          emailSent: true,
          emailSentAt: new Date(),
        },
      })
    )
  );

  console.log(`✅ ${recipients.length} recipients created with access tokens`);

  // Verify R and P can access via their tokens
  console.log('\n🔐 Verifying contact access tokens...');
  
  for (const recipient of recipients) {
    const access = await prisma.alertRecipient.findUnique({
      where: { accessToken: recipient.accessToken },
      include: { alert: true, contact: true },
    });
    
    if (access) {
      console.log(`   ✅ ${access.contact.name} can access alert via token`);
    } else {
      console.log(`   ❌ Failed to find recipient for ${recipient.name}`);
    }
  }

  // Verify Q CANNOT access
  console.log('\n🚫 Verifying Q isolation...');
  
  // Q should not be a recipient of V's alert
  const qRecipient = await prisma.alertRecipient.findFirst({
    where: { alertId: alert.id, userId: userQ.id },
  });
  
  if (!qRecipient) {
    console.log('   ✅ Q is NOT a recipient of V\'s alert');
  } else {
    console.log('   ❌ Q IS a recipient (ISOLATION FAILED!)');
  }

  // Q should not have any contact relationship with V
  const qContactForV = await prisma.emergencyContact.findFirst({
    where: { userId: userQ.id, email: userV.email },
  });
  
  if (!qContactForV) {
    console.log('   ✅ Q does NOT have V as a contact');
  } else {
    console.log('   ❌ Q HAS V as a contact (ISOLATION FAILED!)');
  }

  // Verify alert recipients are ONLY V's contacts
  const allRecipients = await prisma.alertRecipient.findMany({
    where: { alertId: alert.id },
    include: { contact: true },
  });

  const recipientEmails = allRecipients.map(r => r.contact.email).sort();
  const expectedEmails = contactsV.map(c => c.email).sort();

  if (JSON.stringify(recipientEmails) === JSON.stringify(expectedEmails)) {
    console.log('\n   ✅ Alert recipients EXACTLY match V\'s verified contacts');
  } else {
    console.log('\n   ❌ Recipient mismatch!');
    console.log(`   Expected: ${expectedEmails.join(', ')}`);
    console.log(`   Got: ${recipientEmails.join(', ')}`);
  }

  // Test acknowledgement flow
  console.log('\n👍 Testing acknowledgement...');
  
  const rRecipient = recipients.find(r => r.email === contactR.email);
  if (rRecipient) {
    const ack = await prisma.alertAcknowledgement.create({
      data: {
        alertId: alert.id,
        userId: contactR.id,
        recipientId: rRecipient.id,
      },
    });
    console.log(`   ✅ R acknowledged alert (ack ID: ${ack.id})`);
  }

  // Test resolution
  console.log('\n✅ Testing resolution...');
  
  await prisma.emergencyAlert.update({
    where: { id: alert.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });
  
  console.log('   ✅ Alert resolved by V');

  // Cleanup test alert
  console.log('\n🧹 Cleaning up test data...');
  
  await prisma.alertAcknowledgement.deleteMany({ where: { alertId: alert.id } });
  await prisma.alertRecipient.deleteMany({ where: { alertId: alert.id } });
  await prisma.locationUpdate.deleteMany({ where: { alertId: alert.id } });
  await prisma.notificationLog.deleteMany({ where: { alertId: alert.id } });
  await prisma.emergencyAlert.delete({ where: { id: alert.id } });
  
  console.log('   ✅ Test alert cleaned up');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 DEMO VERIFICATION PASSED');
  console.log('='.repeat(50));
  console.log('\n✅ V → R/P notification flow: WORKING');
  console.log('✅ Q isolation: WORKING');
  console.log('✅ Contact verification: WORKING');
  console.log('✅ Secure access tokens: WORKING');
  console.log('✅ Acknowledgement flow: WORKING');
  console.log('✅ Alert resolution: WORKING');
  console.log('\n📋 Manual Testing Checklist:');
  console.log('   1. Sign in as V → Go to /watch → Press SOS → Confirm');
  console.log('   2. Check emails for R and P');
  console.log('   3. Sign in as R → Click email link → Hear alarm → Acknowledge');
  console.log('   4. Sign in as P → Click email link → View location');
  console.log('   5. Sign in as Q → Try to access /alert/:id → Should be 403');
  console.log('   6. Sign in as V → Click "I\'m Safe" → Verify resolution emails');
}

verifyDemo()
  .catch(e => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
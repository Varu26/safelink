# SafeLink Database Schema

## Overview

PostgreSQL database with Prisma ORM. All tables use `cuid()` for primary keys.

---

## Tables

### User
Core user account linked to Google OAuth.

```sql
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "User_email_idx" ON "User"("email");
```

### Account
OAuth provider accounts (NextAuth).

```sql
CREATE TABLE "Account" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    UNIQUE("provider", "providerAccountId")
);

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
```

### Session
User sessions (NextAuth).

```sql
CREATE TABLE "Session" (
    "id" TEXT PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expires" TIMESTAMP NOT NULL
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
```

### VerificationToken
Email verification tokens (NextAuth).

```sql
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    UNIQUE("identifier", "token")
);
```

### WatchDevice
Paired safety watch devices.

```sql
CREATE TABLE "WatchDevice" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "deviceId" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "batteryLevel" INTEGER DEFAULT 100,
    "isConnected" BOOLEAN DEFAULT FALSE,
    "lastSeen" TIMESTAMP,
    "isPaired" BOOLEAN DEFAULT FALSE,
    "pairedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "WatchDevice_userId_idx" ON "WatchDevice"("userId");
CREATE INDEX "WatchDevice_deviceId_idx" ON "WatchDevice"("deviceId");
```

### EmergencyContact
User's emergency contacts.

```sql
CREATE TABLE "EmergencyContact" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "isVerified" BOOLEAN DEFAULT FALSE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "verificationToken" TEXT UNIQUE,
    "verifiedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");
CREATE INDEX "EmergencyContact_email_idx" ON "EmergencyContact"("email");
CREATE INDEX "EmergencyContact_verificationToken_idx" ON "EmergencyContact"("verificationToken");
```

### ContactInvitation
Email verification flow for contacts.

```sql
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

CREATE TABLE "ContactInvitation" (
    "id" TEXT PRIMARY KEY,
    "inviterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "contactId" TEXT NOT NULL REFERENCES "EmergencyContact"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "status" "InvitationStatus" DEFAULT 'PENDING',
    "token" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "ContactInvitation_inviterId_idx" ON "ContactInvitation"("inviterId");
CREATE INDEX "ContactInvitation_contactId_idx" ON "ContactInvitation"("contactId");
CREATE INDEX "ContactInvitation_token_idx" ON "ContactInvitation"("token");
CREATE INDEX "ContactInvitation_email_idx" ON "ContactInvitation"("email");
```

### EmergencyAlert
Emergency alert records.

```sql
CREATE TYPE "AlertStatus" AS ENUM (
    'PENDING_CONFIRMATION',
    'ACTIVE',
    'ACKNOWLEDGED',
    'RESOLVED',
    'CANCELLED',
    'EXPIRED'
);

CREATE TABLE "EmergencyAlert" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "alertToken" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    "accessToken" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    "status" "AlertStatus" DEFAULT 'ACTIVE',
    "triggeredAt" TIMESTAMP DEFAULT NOW(),
    "confirmedAt" TIMESTAMP,
    "resolvedAt" TIMESTAMP,
    "acknowledgedAt" TIMESTAMP,
    "cancelledAt" TIMESTAMP,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationAccuracy" DOUBLE PRECISION,
    "locationUpdatedAt" TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "EmergencyAlert_userId_idx" ON "EmergencyAlert"("userId");
CREATE INDEX "EmergencyAlert_alertToken_idx" ON "EmergencyAlert"("alertToken");
CREATE INDEX "EmergencyAlert_accessToken_idx" ON "EmergencyAlert"("accessToken");
CREATE INDEX "EmergencyAlert_status_idx" ON "EmergencyAlert"("status");
CREATE INDEX "EmergencyAlert_triggeredAt_idx" ON "EmergencyAlert"("triggeredAt");
```

### AlertRecipient
Junction table linking alerts to contacts with per-recipient tracking.

```sql
CREATE TABLE "AlertRecipient" (
    "id" TEXT PRIMARY KEY,
    "alertId" TEXT NOT NULL REFERENCES "EmergencyAlert"("id") ON DELETE CASCADE,
    "contactId" TEXT NOT NULL REFERENCES "EmergencyContact"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isNotified" BOOLEAN DEFAULT FALSE,
    "notifiedAt" TIMESTAMP,
    "emailSent" BOOLEAN DEFAULT FALSE,
    "emailSentAt" TIMESTAMP,
    "emailError" TEXT,
    "accessToken" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "AlertRecipient_alertId_idx" ON "AlertRecipient"("alertId");
CREATE INDEX "AlertRecipient_contactId_idx" ON "AlertRecipient"("contactId");
CREATE INDEX "AlertRecipient_userId_idx" ON "AlertRecipient"("userId");
CREATE INDEX "AlertRecipient_accessToken_idx" ON "AlertRecipient"("accessToken");
```

### AlertAcknowledgement
Contact acknowledgements of alerts.

```sql
CREATE TABLE "AlertAcknowledgement" (
    "id" TEXT PRIMARY KEY,
    "alertId" TEXT NOT NULL REFERENCES "EmergencyAlert"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "recipientId" TEXT NOT NULL REFERENCES "AlertRecipient"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("alertId", "userId")
);

CREATE INDEX "AlertAcknowledgement_alertId_idx" ON "AlertAcknowledgement"("alertId");
CREATE INDEX "AlertAcknowledgement_userId_idx" ON "AlertAcknowledgement"("userId");
CREATE INDEX "AlertAcknowledgement_recipientId_idx" ON "AlertAcknowledgement"("recipientId");
```

### LocationUpdate
GPS location history during active alerts.

```sql
CREATE TABLE "LocationUpdate" (
    "id" TEXT PRIMARY KEY,
    "alertId" TEXT NOT NULL REFERENCES "EmergencyAlert"("id") ON DELETE CASCADE,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "LocationUpdate_alertId_idx" ON "LocationUpdate"("alertId");
CREATE INDEX "LocationUpdate_timestamp_idx" ON "LocationUpdate"("timestamp");
```

### NotificationLog
Audit log for all notification deliveries.

```sql
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'PUSH', 'SMS', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

CREATE TABLE "NotificationLog" (
    "id" TEXT PRIMARY KEY,
    "alertId" TEXT NOT NULL REFERENCES "EmergencyAlert"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "recipientId" TEXT REFERENCES "AlertRecipient"("id") ON DELETE SET NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "provider" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "NotificationLog_alertId_idx" ON "NotificationLog"("alertId");
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX "NotificationLog_recipientId_idx" ON "NotificationLog"("recipientId");
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
```

### UserSettings
Per-user privacy and notification preferences.

```sql
CREATE TABLE "UserSettings" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "locationSharing" BOOLEAN DEFAULT TRUE,
    "emailNotifications" BOOLEAN DEFAULT TRUE,
    "pushNotifications" BOOLEAN DEFAULT TRUE,
    "smsNotifications" BOOLEAN DEFAULT FALSE,
    "alertSound" BOOLEAN DEFAULT TRUE,
    "vibration" BOOLEAN DEFAULT TRUE,
    "autoResolveHours" INTEGER DEFAULT 24,
    "testMode" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### VoiceMessage
Voice messages exchanged during emergency alerts.

```sql
CREATE TABLE "VoiceMessage" (
    "id" TEXT PRIMARY KEY,
    "alertId" TEXT NOT NULL REFERENCES "EmergencyAlert"("id") ON DELETE CASCADE,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "recipientId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "transcript" TEXT,
    "isPlayed" BOOLEAN DEFAULT FALSE,
    "playedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "VoiceMessage_alertId_idx" ON "VoiceMessage"("alertId");
CREATE INDEX "VoiceMessage_senderId_idx" ON "VoiceMessage"("senderId");
CREATE INDEX "VoiceMessage_recipientId_idx" ON "VoiceMessage"("recipientId");
CREATE INDEX "VoiceMessage_createdAt_idx" ON "VoiceMessage"("createdAt");
```

---

## Relationships

```
User (1) ─────< (N) WatchDevice
User (1) ─────< (N) EmergencyContact
User (1) ─────< (N) EmergencyAlert
User (1) ─────< (N) AlertRecipient (as alert owner)
User (1) ─────< (N) AlertAcknowledgement
User (1) ─────< (N) NotificationLog
User (1) ─────< (1) UserSettings
User (1) ─────< (N) VoiceMessage (as sender)
User (1) ─────< (N) VoiceMessage (as recipient)

EmergencyContact (N) ─────< (N) ContactInvitation >───── (1) User (as inviter)

EmergencyAlert (1) ─────< (N) AlertRecipient
EmergencyAlert (1) ─────< (N) AlertAcknowledgement
EmergencyAlert (1) ─────< (N) LocationUpdate
EmergencyAlert (1) ─────< (N) NotificationLog
EmergencyAlert (1) ─────< (N) VoiceMessage

AlertRecipient (1) ─────< (N) AlertAcknowledgement
VoiceMessage (N) ─────> (1) User (sender)
VoiceMessage (N) ─────> (1) User (recipient)
```

---

## Authorization Rules

### User Access (Owner)
- Can access own User, WatchDevice, EmergencyContact, EmergencyAlert, UserSettings
- Can create/update/delete own data
- Can trigger alerts on own devices

### Contact Access (Recipient)
- Can access EmergencyAlert only if listed in AlertRecipient for that alert
- Can acknowledge alerts they're recipient of
- Cannot access other users' profiles, contacts, or alert history
- Access via secure `accessToken` in AlertRecipient

### Data Isolation Enforcement
All API routes enforce:
```typescript
// Owner check
alert.userId === session.user.id

// Recipient check
alert.recipients.some(r => r.userId === session.user.id)

// Contact ownership
contact.userId === session.user.id
```

---

## Indexes for Performance

Key composite indexes for common queries:
- `EmergencyAlert(userId, status, triggeredAt)` - User's alerts by status
- `AlertRecipient(alertId, isNotified)` - Pending notifications
- `LocationUpdate(alertId, timestamp DESC)` - Latest location
- `NotificationLog(alertId, type, createdAt)` - Delivery audit

---

## Migration Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (dev)
npm run db:push

# Create migration (prod)
npx prisma migrate dev --name migration_name

# Apply migrations (prod)
npx prisma migrate deploy

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```
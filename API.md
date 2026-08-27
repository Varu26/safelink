# SafeLink API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API routes (except public auth) require authentication via NextAuth session cookie.

```http
Cookie: next-auth.session-token=<token>
```

## Error Responses

```json
{
  "error": "Error message",
  "details": []  // Optional validation errors
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `410` - Gone (expired)
- `500` - Internal Server Error

---

## Authentication

### GET/POST `/api/auth/[...nextauth]`
NextAuth.js endpoints for Google OAuth.

---

## User Profile

### GET `/api/user/profile`
Get current user profile.

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "image": "string|null",
    "createdAt": "ISO8601"
  }
}
```

### PATCH `/api/user/profile`
Update user profile.

**Request:**
```json
{
  "name": "string"
}
```

**Response:** Same as GET.

---

## Watch Devices

### GET `/api/devices`
List user's paired devices.

**Response:**
```json
{
  "devices": [
    {
      "id": "string",
      "deviceId": "string",
      "name": "string",
      "model": "string|null",
      "firmwareVersion": "string|null",
      "batteryLevel": "number",
      "isConnected": "boolean",
      "lastSeen": "ISO8601|null",
      "isPaired": "boolean",
      "pairedAt": "ISO8601|null",
      "createdAt": "ISO8601"
    }
  ]
}
```

### POST `/api/devices`
Register/pair a new device.

**Request:**
```json
{
  "name": "string",
  "model": "string",
  "firmwareVersion": "string"
}
```

**Response:** Created device object (201).

### GET `/api/devices/[id]`
Get device details.

### PATCH `/api/devices/[id]`
Update device (battery, connection status, etc.).

**Request:**
```json
{
  "name": "string",
  "model": "string",
  "firmwareVersion": "string",
  "batteryLevel": "number",
  "isConnected": "boolean"
}
```

### DELETE `/api/devices/[id]`
Unpair device.

---

## Emergency Contacts

### GET `/api/contacts`
List user's emergency contacts.

**Response:**
```json
{
  "contacts": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone": "string|null",
      "relationship": "string|null",
      "isVerified": "boolean",
      "isActive": "boolean",
      "verificationToken": "string|null",
      "verifiedAt": "ISO8601|null",
      "createdAt": "ISO8601",
      "invitations": [
        {
          "id": "string",
          "token": "string",
          "expiresAt": "ISO8601"
        }
      ]
    }
  ]
}
```

### POST `/api/contacts`
Add emergency contact.

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "relationship": "string"
}
```

**Response:** Created contact (201). Sends verification email.

### GET `/api/contacts/[id]`
Get contact details.

### PATCH `/api/contacts/[id]`
Update contact.

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "relationship": "string",
  "isActive": "boolean"
}
```

### DELETE `/api/contacts/[id]`
Remove contact.

### POST `/api/contacts/[id]/resend`
Resend verification email.

---

## Contact Invitations

### GET `/api/invitations/verify?token=xxx`
Check invitation status.

### POST `/api/invitations/verify`
Verify invitation (accept).

**Request:**
```json
{
  "token": "string"
}
```

**Response:** Success with contact info.

---

## Emergency Alerts

### GET `/api/alerts`
List user's alerts.

**Query Parameters:**
- `status` - Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED, CANCELLED, PENDING_CONFIRMATION, all)
- `limit` - Results per page (default 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "alerts": [
    {
      "id": "string",
      "alertToken": "string",
      "accessToken": "string",
      "status": "string",
      "triggeredAt": "ISO8601",
      "confirmedAt": "ISO8601|null",
      "resolvedAt": "ISO8601|null",
      "acknowledgedAt": "ISO8601|null",
      "cancelledAt": "ISO8601|null",
      "locationLat": "number|null",
      "locationLng": "number|null",
      "locationAccuracy": "number|null",
      "locationUpdatedAt": "ISO8601|null",
      "metadata": "object",
      "recipients": [
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "isNotified": "boolean",
          "notifiedAt": "ISO8601|null",
          "accessToken": "string"
        }
      ],
      "acknowledgements": [
        {
          "id": "string",
          "userId": "string",
          "createdAt": "ISO8601",
          "user": { "name": "string", "email": "string" }
        }
      ],
      "locationUpdates": [
        { "lat": "number", "lng": "number", "accuracy": "number|null", "timestamp": "ISO8601" }
      ]
    }
  ],
  "total": "number",
  "hasMore": "boolean"
}
```

### POST `/api/alerts`
Create new emergency alert.

**Request:**
```json
{
  "locationLat": "number",
  "locationLng": "number",
  "locationAccuracy": "number",
  "isTest": "boolean"
}
```

**Response:** Created alert with recipients (201).

### GET `/api/alerts/[id]`
Get alert details (owner or authorized recipient only).

**Response:** Full alert object with all relations.

### PATCH `/api/alerts/[id]`
Perform alert action.

**Actions:**

#### Confirm Alert (owner only, from PENDING_CONFIRMATION)
```json
{
  "action": "confirm",
  "locationLat": "number",
  "locationLng": "number",
  "locationAccuracy": "number"
}
```

#### Update Location (owner only, ACTIVE/ACKNOWLEDGED)
```json
{
  "action": "updateLocation",
  "lat": "number",
  "lng": "number",
  "accuracy": "number"
}
```

#### Acknowledge Alert (recipient only, ACTIVE/ACKNOWLEDGED)
```json
{
  "action": "acknowledge"
}
```

#### Resolve Alert (owner only, ACTIVE/ACKNOWLEDGED)
```json
{
  "action": "resolve"
}
```

#### Cancel Alert (owner only, PENDING_CONFIRMATION/ACTIVE/ACKNOWLEDGED)
```json
{
  "action": "cancel"
}
```

---

## Secure Contact Access

### GET `/api/access/alert/[token]`
Access alert via secure token (for emergency contacts).

**Response:**
```json
{
  "alert": { ... },
  "recipient": {
    "id": "string",
    "name": "string",
    "email": "string",
    "isNotified": "boolean",
    "notifiedAt": "ISO8601|null"
  },
  "contact": {
    "id": "string",
    "name": "string",
    "email": "string",
    "relationship": "string|null"
  },
  "canAcknowledge": "boolean",
  "canResolve": "boolean",
  "isExpired": "boolean"
}
```

Returns 404 if token invalid, 410 if expired, 403 if unauthorized.

---

## Settings

### GET `/api/settings`
Get user settings.

**Response:**
```json
{
  "user": { "id": "string", "name": "string", "email": "string", "image": "string|null", "createdAt": "ISO8601" },
  "settings": {
    "locationSharing": "boolean",
    "emailNotifications": "boolean",
    "pushNotifications": "boolean",
    "smsNotifications": "boolean",
    "alertSound": "boolean",
    "vibration": "boolean",
    "autoResolveHours": "number",
    "testMode": "boolean"
  },
  "device": { ... } | null
}
```

### PATCH `/api/settings`
Update settings.

**Request:**
```json
{
  "profile": { "name": "string", "image": "string" },
  "settings": {
    "locationSharing": "boolean",
    "emailNotifications": "boolean",
    "pushNotifications": "boolean",
    "smsNotifications": "boolean",
    "alertSound": "boolean",
    "vibration": "boolean",
    "autoResolveHours": "number",
    "testMode": "boolean"
  }
}
```

---

## Real-time Events (Socket.io)

### Connection
```javascript
const socket = io('/api/socket');
```

### Events

#### Client → Server
- `join-alert(alertId)` - Join alert room for updates
- `leave-alert(alertId)` - Leave alert room
- `join-user(userId)` - Join user room for notifications

#### Server → Client
- `alert-update(data)` - Alert status/field changed
- `location-update({ lat, lng, accuracy, timestamp })` - New location
- `acknowledged({ userId, userName, timestamp })` - Contact acknowledged
- `resolved({ resolvedBy, resolverName, timestamp })` - Alert resolved
- `notification(data)` - General notification

---

## Alert Status Values

| Status | Description |
|--------|-------------|
| `PENDING_CONFIRMATION` | Buzzer pressed, awaiting confirmation |
| `ACTIVE` | Confirmed, contacts being notified |
| `ACKNOWLEDGED` | At least one contact acknowledged |
| `RESOLVED` | User marked safe |
| `CANCELLED` | User cancelled during countdown or after |
| `EXPIRED` | Auto-resolved after timeout |

---

## Rate Limits

- Buzzer press: 1 per 30 seconds per user
- Alert creation: 1 per minute per user
- Contact operations: 10 per minute
- Location updates: 1 per 5 seconds per active alert
- Voice messages: 5 per minute per user

---

## Voice Messages

### GET `/api/voice-messages?alertId=xxx`
Get voice messages for an alert (current user as recipient).

**Query Parameters:**
- `alertId` - Alert ID (required)

**Response:**
```json
{
  "voiceMessages": [
    {
      "id": "string",
      "senderId": "string",
      "sender": { "id": "string", "name": "string|null", "image": "string|null" },
      "audioUrl": "string",
      "duration": "number",
      "mimeType": "string",
      "fileSize": "number",
      "transcript": "string|null",
      "isPlayed": "boolean",
      "playedAt": "ISO8601|null",
      "createdAt": "ISO8601"
    }
  ]
}
```

### POST `/api/voice-messages`
Send voice message to alert participants.

**Request:**
```json
{
  "alertId": "string",
  "audioBase64": "string",
  "duration": "number",
  "mimeType": "string"
}
```

**Rules:**
- Owner can send to all notified recipients
- Recipients can send to owner only
- Only during ACTIVE or ACKNOWLEDGED status
- Max duration: 60 seconds
- Supported formats: audio/webm, audio/mp4, audio/ogg

**Response:** Created voice message(s) (201).

### GET `/api/voice-messages/[id]`
Get voice message details.

### PATCH `/api/voice-messages/[id]`
Update voice message (mark as played, add transcript).

**Request:**
```json
{
  "isPlayed": "boolean",
  "transcript": "string"
}
```

### DELETE `/api/voice-messages/[id]`
Delete voice message (sender only).

---

## Rate Limits

- Buzzer press: 1 per 30 seconds per user
- Alert creation: 1 per minute per user
- Contact operations: 10 per minute
- Location updates: 1 per 5 seconds per active alert
- Voice messages: 5 per minute per user

---

## Webhooks (Future)

Configure webhook URLs in settings for:
- `alert.created`
- `alert.acknowledged`
- `alert.resolved`
- `alert.cancelled`
- `contact.added`
- `contact.verified`
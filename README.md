# SafeLink - Human Safety Platform

A secure, responsive, multi-user human-safety web application that allows a person carrying a connected safety watch to press an emergency buzzer and immediately notify only that person's saved emergency contacts.

## Features

- **Watch Interface**: Smartwatch-style UI with large SOS button and confirmation countdown
- **Phone Dashboard**: Complete mobile-first interface for users and emergency contacts
- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Emergency Contact Management**: Add, verify, and manage contacts with relationship labels
- **Real-time Alerts**: WebSocket-based live updates for alerts and location
- **Live Location Sharing**: GPS location updates during active emergencies
- **Multi-channel Notifications**: Email with secure expiring links, alarm sounds, vibration
- **Privacy First**: Strict data isolation - contacts only see alerts they're authorized for
- **Secure Access Links**: Expiring, revocable tokens for contact access
- **Audit Logging**: Complete trail of all alert actions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **Real-time**: Socket.io
- **Email**: Nodemailer (configurable for SendGrid, Resend, Mailgun)
- **Maps**: Leaflet/OpenStreetMap (configurable for Mapbox)
- **UI Components**: Radix UI primitives with custom styling

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Cloud Console project for OAuth

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd safelink
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/safelink"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-api-key"
EMAIL_FROM="SafeLink <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:3000

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env`

## Email Configuration

Configure your email provider in `.env`:

**SendGrid:**
```env
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-sendgrid-api-key"
```

**Resend:**
```env
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="your-resend-api-key"
```

**Mailgun:**
```env
EMAIL_SERVER_HOST="smtp.mailgun.org"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-mailgun-username"
EMAIL_SERVER_PASSWORD="your-mailgun-password"
```

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth routes
│   │   ├── devices/         # Watch device management
│   │   ├── contacts/        # Emergency contacts
│   │   ├── alerts/          # Emergency alerts
│   │   ├── access/          # Secure contact access
│   │   ├── settings/        # User settings
│   │   └── socket/          # Socket.io server
│   ├── watch/               # Watch interface page
│   ├── dashboard/           # Phone dashboard
│   ├── contacts/            # Contact management
│   ├── alerts/              # Alert history
│   ├── alert/[id]/          # Alert detail view
│   ├── access/alert/[token]/ # Secure contact access
│   ├── settings/            # Settings page
│   ├── onboarding/          # First-time setup
│   ├── login/               # Sign in page
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # Reusable UI components
│   └── layout/              # Layout components
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── email.ts             # Email service
│   ├── socket.ts            # Socket.io server
│   └── utils.ts             # Utility functions
├── hooks/
│   └── use-toast.ts         # Toast notifications
└── prisma/
    ├── schema.prisma        # Database schema
    └── seed.ts              # Seed data
```

## Database Schema

Key models:
- **User**: Core user account (linked to Google OAuth)
- **WatchDevice**: Paired safety watch devices
- **EmergencyContact**: Verified emergency contacts
- **ContactInvitation**: Email verification flow
- **EmergencyAlert**: Emergency alert records
- **AlertRecipient**: Contact-alert associations
- **AlertAcknowledgement**: Contact acknowledgements
- **LocationUpdate**: GPS location history
- **NotificationLog**: Email/push delivery logs
- **UserSettings**: Privacy and notification preferences

## Emergency Alert Workflow

1. User signs in with Google and adds emergency contacts
2. User pairs safety watch device
3. User presses SOS button on watch interface
4. 5-second confirmation countdown (cancelable)
5. Alert created with current location (if permitted)
6. Email sent to verified, active contacts only
7. Contacts receive secure expiring access link
8. Contacts open link → authenticate → view live location
9. Contacts hear alarm sound, see visual alert
10. Contacts can acknowledge alert
11. User can resolve/cancel alert
12. All parties notified of resolution

## Security Features

- **Server-side Authorization**: Every API route validates ownership
- **Data Isolation**: Users only access their own data
- **Contact Isolation**: Contacts only see alerts they're recipients of
- **Secure Tokens**: Cryptographically random, expiring access tokens
- **Rate Limiting**: Buzzer and notification endpoints protected
- **Input Validation**: Zod schemas on all inputs
- **HTTPS Required**: Production deployment enforces HTTPS

## Testing the V → R/P Flow with Q Isolation

1. Sign in as **Victim User** (victim@demo.safelink.app)
2. Go to Watch page, press SOS button
3. Confirm alert (wait 5 seconds)
4. Check emails for Contact R and Contact P
5. Sign in as **Contact R** → access alert via email link
6. Verify alarm sounds, location visible
7. Acknowledge alert
8. Sign in as **Unrelated User Q** → verify NO access to V's alert
9. Sign in as **Victim User** → resolve alert
10. Verify all contacts notified of resolution

## Known Limitations

### Browser Limitations
- **Autoplay Policy**: Alarm sounds require user interaction before playing
- **Geolocation**: Requires HTTPS in production; user permission required
- **Push Notifications**: Require HTTPS and user permission
- **Vibration API**: Only works on mobile devices with vibration hardware
- **Background Location**: Not available in web apps; requires native app

### Notification Limitations
- **Email Delivery**: Depends on provider reputation and recipient spam filters
- **Sound Reliability**: Browser may throttle or block audio in background tabs
- **Real-time Updates**: WebSocket connection may drop on mobile networks

### Hardware Limitations
- **Watch Simulator**: Browser-based only; no real hardware integration
- **Bluetooth LE**: Not accessible from web; requires native app
- **Cellular Fallback**: Not available in web version

### Production Considerations
- Use proper email provider (SendGrid, Resend) with dedicated IP
- Set up monitoring for email delivery rates
- Implement proper logging and alerting
- Use CDN for static assets
- Enable rate limiting at reverse proxy level
- Regular security audits and dependency updates

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
- Use strong `NEXTAUTH_SECRET` (32+ random chars)
- Set `NEXTAUTH_URL` to production domain
- Use production database URL
- Configure email provider with production credentials
- Set up Google OAuth with production redirect URIs

## License

MIT License - See LICENSE file for details

## Disclaimer

**SafeLink is a safety-support tool and does not replace emergency services.**
In immediate danger, contact local emergency services:
- **911** (United States)
- **112** (European Union)
- **999** (United Kingdom)
- Your local emergency number

This application is a prototype for demonstration purposes. It does not guarantee personal safety or emergency response.
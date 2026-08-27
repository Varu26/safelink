# SafeLink Setup Instructions

## Prerequisites

- Node.js 18.17+
- PostgreSQL 14+
- npm or yarn
- Google Cloud Console account

---

## 1. Clone and Install

```bash
git clone <repository-url>
cd safelink
npm install
```

---

## 2. Database Setup

### Option A: Local PostgreSQL (Docker)
```bash
docker run -d \
  --name safelink-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=safelink \
  -p 5432:5432 \
  postgres:15
```

### Option B: Cloud PostgreSQL (Neon, Supabase, Railway, etc.)
Create a database and get connection string.

---

## 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/safelink"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Email (SendGrid example)
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="SG.your-api-key"
EMAIL_FROM="SafeLink <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Generate Secrets
```bash
# NextAuth secret
openssl rand -base64 32

# Encryption key (optional)
openssl rand -hex 32
```

---

## 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "SafeLink"
3. Enable APIs: "Google+ API" or "People API"
4. Configure OAuth Consent Screen:
   - User Type: External
   - App name: SafeLink
   - Support email: your email
5. Create Credentials → OAuth Client ID:
   - Application type: Web Application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

---

## 5. Email Provider Setup

### SendGrid (Recommended)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify Single Sender or Domain
3. Create API Key with "Mail Send" permissions
4. Add to `.env`

### Resend
1. Sign up at [resend.com](https://resend.com)
2. Verify domain
3. Create API Key
4. Add to `.env`

---

## 6. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed
```

---

## 7. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 8. Test the Demo Flow

### Demo Accounts (created by seed)
- **Victim User (V)**: victim@demo.safelink.app
- **Contact R (Family)**: contact-r@demo.safelink.app
- **Contact P (Friend)**: contact-p@demo.safelink.app
- **Unrelated User Q**: unrelated@demo.safelink.app

### Manual Test Steps

1. **Sign in as V** (use any Google account, email will be linked)
   - Go to `/onboarding` → Complete setup
   - Go to `/watch` → Press SOS → Hold 5 seconds

2. **Check emails** for R and P (check spam folder)

3. **Sign in as R**
   - Click email link → Should hear alarm → Acknowledge

4. **Sign in as P**
   - Click email link → View live location

5. **Sign in as Q**
   - Try to access alert URL → Should get 403/404

6. **Sign in as V**
   - Click "I'm Safe" → Verify resolution emails sent

### Automated Verification
```bash
npx tsx scripts/verify-demo.ts
```

---

## 9. Production Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Update Google OAuth redirect URI to production domain
5. Deploy

### Docker
```bash
docker build -t safelink .
docker run -p 3000:3000 --env-file .env safelink
```

### Environment Variables for Production
- `NEXTAUTH_URL` = `https://your-domain.com`
- `GOOGLE_CLIENT_ID/SECRET` = production credentials
- `DATABASE_URL` = production PostgreSQL with SSL
- `EMAIL_*` = production email credentials
- `NEXT_PUBLIC_APP_URL` = `https://your-domain.com`

---

## 10. Post-Deployment

### Monitoring
- Set up uptime monitoring
- Configure error tracking (Sentry)
- Monitor email delivery rates
- Set up database backups

### Security
- Enable HTTPS (automatic on Vercel)
- Configure CSP headers
- Set up rate limiting at edge
- Regular dependency updates

---

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Database connection failed"
- Check `DATABASE_URL` format
- Ensure database is running
- Check firewall/network access

### "Google OAuth error"
- Verify redirect URI matches exactly
- Check Client ID/Secret
- Ensure Google+ API enabled

### "Email not sending"
- Check SMTP credentials
- Verify sender in email provider
- Check spam folder

### "WebSocket not working on Vercel"
- Use Pusher/Ably instead of raw Socket.io
- Or deploy Socket.io server separately

---

## Project Structure Reference

```
safelink/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Demo data
├── src/
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── watch/       # Watch interface
│   │   ├── dashboard/   # Phone dashboard
│   │   ├── contacts/    # Contact management
│   │   ├── alerts/      # Alert history
│   │   ├── alert/[id]/  # Alert detail
│   │   ├── access/      # Secure contact access
│   │   ├── settings/    # User settings
│   │   ├── onboarding/  # First-time setup
│   │   └── login/       # Sign in
│   ├── components/
│   │   ├── ui/          # Reusable components
│   │   └── layout/      # Header, etc.
│   ├── lib/
│   │   ├── auth.ts      # NextAuth config
│   │   ├── prisma.ts    # DB client
│   │   ├── email.ts     # Email service
│   │   ├── socket.ts    # Real-time
│   │   └── utils.ts     # Helpers
│   └── hooks/
│       └── use-toast.ts
├── scripts/
│   └── verify-demo.ts   # Verification script
├── .env.example
├── package.json
├── tailwind.config.ts
└── next.config.js
```

---

## Support

For issues:
1. Check `LIMITATIONS.md` for known issues
2. Review browser console for errors
3. Check server logs
4. Verify environment variables

---

## License

MIT - See LICENSE file
# SafeLink Environment Variables

## Required Variables

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/safelink?schema=public"
```
PostgreSQL connection string. Use connection pooling in production (PgBouncer).

### NextAuth
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-characters"
```
- `NEXTAUTH_URL`: Canonical URL of your deployment (no trailing slash)
- `NEXTAUTH_SECRET`: Random string (32+ chars). Generate with: `openssl rand -base64 32`

### Google OAuth
```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
From Google Cloud Console → APIs & Services → Credentials.

**Authorized Redirect URIs:**
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://your-domain.com/api/auth/callback/google`

### Email (Nodemailer)
```env
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-api-key"
EMAIL_FROM="SafeLink <noreply@yourdomain.com>"
```

**Provider Examples:**

**SendGrid:**
```env
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="SG.xxx.yyy"
```

**Resend:**
```env
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="re_xxx"
```

**Mailgun:**
```env
EMAIL_SERVER_HOST="smtp.mailgun.org"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="postmaster@yourdomain.com"
EMAIL_SERVER_PASSWORD="your-password"
```

**AWS SES:**
```env
EMAIL_SERVER_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-ses-smtp-user"
EMAIL_SERVER_PASSWORD="your-ses-smtp-password"
```

### Application
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="SafeLink"
```
- `NEXT_PUBLIC_APP_URL`: Public URL for email links and OAuth redirects
- `NEXT_PUBLIC_APP_NAME`: Display name in emails and UI

---

## Optional Variables

### Maps
```env
# Mapbox (if using Mapbox GL)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxx"

# Or use Leaflet/OpenStreetMap (no token needed)
```

### Real-time (Socket.io)
```env
SOCKET_IO_URL="http://localhost:3001"
```
Separate Socket.io server URL (if running separately).

### Security
```env
ENCRYPTION_KEY="your-32-character-encryption-key"
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```
- `ENCRYPTION_KEY`: For encrypting sensitive data at rest (32 chars)
- `RATE_LIMIT_MAX`: Max requests per window
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds

### Feature Flags
```env
ENABLE_TEST_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=false
```

---

## Development Setup

### 1. Create `.env` file
```bash
cp .env.example .env
```

### 2. Generate secrets
```bash
# NextAuth secret
openssl rand -base64 32

# Encryption key
openssl rand -hex 32
```

### 3. Local PostgreSQL (Docker)
```bash
docker run -d \
  --name safelink-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=safelink \
  -p 5432:5432 \
  postgres:15
```

Then:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/safelink"
```

### 4. Google OAuth Setup
1. [Google Cloud Console](https://console.cloud.google.com/)
2. New Project → "SafeLink"
3. APIs & Services → Enable "Google+ API"
4. Credentials → Create Credentials → OAuth Client ID
5. Application type: Web Application
6. Authorized JavaScript origins: `http://localhost:3000`
7. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
8. Copy Client ID and Secret to `.env`

### 5. Email Provider Setup

**SendGrid (Recommended):**
1. Create [SendGrid account](https://sendgrid.com/)
2. Verify sender identity
3. Create API Key with Mail Send permissions
4. Add to `.env`

**Resend:**
1. Create [Resend account](https://resend.com/)
2. Verify domain
3. Create API Key
4. Add to `.env`

---

## Production Checklist

- [ ] `NEXTAUTH_URL` = production domain
- [ ] `NEXTAUTH_SECRET` = strong random (32+ chars)
- [ ] `DATABASE_URL` = production PostgreSQL with SSL
- [ ] `GOOGLE_CLIENT_ID/SECRET` = production OAuth credentials
- [ ] `EMAIL_SERVER_*` = production email provider
- [ ] `EMAIL_FROM` = verified sender domain
- [ ] `NEXT_PUBLIC_APP_URL` = production domain
- [ ] `ENCRYPTION_KEY` = unique production key
- [ ] HTTPS enforced (Vercel/Cloudflare/Load Balancer)
- [ ] Rate limiting configured at edge
- [ ] Database backups enabled
- [ ] Monitoring/alerting configured

---

## Docker Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: safelink
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/safelink
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      EMAIL_SERVER_HOST: ${EMAIL_SERVER_HOST}
      EMAIL_SERVER_PORT: ${EMAIL_SERVER_PORT}
      EMAIL_SERVER_USER: ${EMAIL_SERVER_USER}
      EMAIL_SERVER_PASSWORD: ${EMAIL_SERVER_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Vercel Deployment

Add all variables in Vercel Dashboard → Settings → Environment Variables.

**Required for Preview/Production:**
- All variables from Required section
- `NEXTAUTH_URL` = `https://your-app.vercel.app` (or custom domain)

**Google OAuth for Vercel:**
- Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirects

---

## Troubleshooting

### "Invalid Google credentials"
- Verify Client ID/Secret match Google Cloud Console
- Check authorized redirect URIs exactly match

### "Email not sending"
- Verify SMTP credentials
- Check sender verification in email provider
- Check spam folder
- Verify `EMAIL_FROM` domain matches verified sender

### "Database connection failed"
- Check `DATABASE_URL` format
- Ensure database allows connections from your IP
- For Neon/Supabase: use connection pooling URL

### "NextAuth secret error"
- Ensure `NEXTAUTH_SECRET` is set and 32+ characters
- Restart dev server after changing

### "Socket.io not connecting"
- Check `SOCKET_IO_URL` matches server
- Ensure WebSocket support in hosting platform
- For Vercel: use Pusher/Ably instead of raw Socket.io
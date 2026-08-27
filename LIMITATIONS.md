# SafeLink Known Limitations

This document outlines known limitations of the SafeLink prototype across browsers, notifications, sound, hardware, and platform constraints.

---

## Browser Limitations

### Autoplay Policy
**Issue**: Modern browsers block autoplaying audio without user interaction.
**Impact**: Alarm sounds won't play until user clicks/taps on the alert page.
**Workaround**: 
- Prompt user to "Tap to enable sounds" on first visit
- Use visible alert banner as primary notification
- Email notifications work regardless

### Geolocation API
**Issue**: Requires HTTPS in production; user must grant permission.
**Impact**: 
- Location sharing fails on HTTP (localhost works)
- Users can deny permission
- No fallback to IP-based location (privacy)
**Workaround**:
- Clear permission denied messaging
- Show last known location with timestamp
- Manual location entry option (future)

### Push Notifications
**Issue**: Requires HTTPS, service worker, and user permission.
**Impact**: Not available on HTTP localhost; users must opt-in.
**Workaround**: Email as primary channel; push as enhancement.

### Vibration API
**Issue**: Only works on mobile devices with vibration hardware.
**Impact**: No vibration on desktop/laptop.
**Workaround**: Visual + audio alerts as primary.

### Background Execution
**Issue**: Web apps cannot run in background; tabs may be throttled.
**Impact**: 
- Location updates stop when tab backgrounded
- Alarm sounds may not play in background tabs
- WebSocket may disconnect
**Workaround**: 
- Native app needed for true background operation
- Service worker for push notifications (future)
- Email/SMS as reliable fallback

### Service Worker Support
**Issue**: Required for push notifications and offline support.
**Impact**: Not configured in prototype.
**Future**: Add service worker for offline alert viewing and push.

---

## Notification Limitations

### Email Delivery
**Dependencies**: 
- Provider reputation (SendGrid, Resend, etc.)
- Recipient spam filters
- Domain authentication (SPF, DKIM, DMARC)

**Risks**:
- Delayed delivery (seconds to minutes)
- Blocked by corporate firewalls
- Marked as spam
- Rate limiting by provider

**Mitigations**:
- Use dedicated IP for production
- Implement retry logic
- Monitor delivery rates
- Provide "Resend" option

### Real-time Updates
**WebSocket Limitations**:
- May disconnect on mobile network changes
- Requires persistent connection
- Not available in serverless (Vercel) without external service

**Alternatives**:
- Server-Sent Events (SSE) - simpler, HTTP-based
- Polling fallback (every 5-10 seconds)
- External services: Pusher, Ably, Firebase

### Sound Reliability
**Issues**:
- Browser may throttle audio in background tabs
- Mobile browsers restrict audio context
- Volume controlled by system, not app
- Audio context requires user gesture

**Current Implementation**:
- Creates AudioContext on user interaction
- Repeats alarm every 1.5 seconds
- Mute/unmute controls provided
- Visual alert always visible

---

## Hardware Limitations

### Watch Simulator
**Current**: Browser-based UI only.
**Missing**:
- No Bluetooth LE integration
- No accelerometer/fall detection
- No heart rate monitoring
- No cellular/LTE connectivity
- No physical button hardware

**Real Device Integration** (Future):
- Requires native companion app (iOS/Android)
- Bluetooth LE for communication
- Background execution for SOS button
- Battery optimization

### Sensors
**Unavailable in Web**:
- Accelerometer (fall detection)
- Heart rate monitor
- Blood oxygen
- Temperature
- Ambient light

### Battery Monitoring
**Current**: Simulated battery level.
**Real Device**: Would need Bluetooth Battery Service.

---

## Platform Limitations

### Vercel/Serverless
**Constraints**:
- 10s function timeout (Hobby), 60s (Pro)
- No persistent WebSocket connections
- Cold starts add latency
- File system read-only

**Workarounds**:
- Use external WebSocket service (Pusher, Ably)
- Keep functions lightweight
- Use Edge Functions for auth

### Mobile Safari (iOS)
**Specific Issues**:
- Stricter autoplay policy
- No vibration API
- Limited background execution
- Service worker support varies

### Android Chrome
**Better Support**:
- Vibration API works
- Better background handling
- More permissive audio

---

## Privacy & Security Limitations

### Client-side Only Checks
**Risk**: Frontend validation can be bypassed.
**Mitigation**: All authorization enforced server-side.

### Token Exposure in URLs
**Risk**: Access tokens in browser history/logs.
**Mitigation**: 
- Short expiry (24 hours)
- Single-use where possible
- Revoke on alert resolution

### Location Precision
**Risk**: GPS accuracy varies (meters to kilometers).
**Mitigation**: Always show accuracy radius; never claim false precision.

---

## Scalability Limitations

### Current Architecture
- Single Node.js process (development)
- In-memory Socket.io (not multi-server)
- No horizontal scaling

### Production Requirements
- Redis for session/WebSocket scaling
- Load balancer with sticky sessions
- Database connection pooling (PgBouncer)
- CDN for static assets
- Email queue (BullMQ/Redis)

---

## Feature Gaps (Prototype vs Production)

| Feature | Prototype | Production Needed |
|---------|-----------|-------------------|
| Real watch hardware | ❌ Simulator only | ✅ Native app + BLE |
| Background location | ❌ Tab must be open | ✅ Native background |
| Push notifications | ⚠️ Basic | ✅ Full FCM/APNs |
| SMS notifications | ❌ Not implemented | ✅ Twilio/Vonage |
| Voice call alerts | ❌ Not implemented | ✅ Twilio Voice |
| Fall detection | ❌ Not implemented | ✅ Accelerometer ML |
| Offline support | ❌ Not implemented | ✅ Service Worker |
| Multi-language | ❌ English only | ✅ i18n |
| Accessibility audit | ⚠️ Basic | ✅ WCAG 2.1 AA |
| Load testing | ❌ Not done | ✅ Required |
| Penetration testing | ❌ Not done | ✅ Required |

---

## Regulatory Considerations

### Not a Medical Device
SafeLink is **not** a medical device and does not:
- Diagnose conditions
- Monitor vital signs medically
- Replace emergency services
- Guarantee response times

### Data Protection
- GDPR: Right to deletion, portability
- CCPA: California privacy rights
- HIPAA: Not applicable (no PHI stored)
- COPPA: Not for children under 13

### Emergency Services Integration
- No direct 911/112 integration
- No automatic emergency dispatch
- Contacts must manually call emergency services

---

## Testing Limitations

### Automated Tests
**Current**: Basic structure only.
**Needed**:
- Unit tests for auth, authorization
- Integration tests for alert flow
- E2E tests (Playwright/Cypress)
- Load testing (k6/Artillery)
- Security scanning (OWASP ZAP)

### Manual Testing Required
- Cross-browser (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS Safari, Android Chrome)
- Network conditions (offline, slow, flaky)
- Permission states (granted, denied, blocked)
- Email delivery to various providers

---

## Future Improvements

### Short Term
- [ ] Service worker for push notifications
- [ ] SMS via Twilio
- [ ] Better offline handling
- [ ] Accessibility audit
- [ ] Automated test suite

### Medium Term
- [ ] Native iOS/Android companion apps
- [ ] Bluetooth LE watch integration
- [ ] Fall detection algorithms
- [ ] Voice-activated SOS
- [ ] Multi-language support

### Long Term
- [ ] Direct emergency services API integration
- [ ] Wear OS / watchOS native apps
- [ ] Cellular-enabled hardware device
- [ ] AI-powered risk assessment
- [ ] Community safety features
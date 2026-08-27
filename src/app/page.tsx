import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Smartphone, Watch, MapPin, Bell, Users, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Watch,
      title: 'Smartwatch Interface',
      description: 'Large, high-contrast SOS button designed for emergency situations. 5-second confirmation countdown prevents accidental alerts.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Dashboard',
      description: 'Complete phone interface for managing contacts, viewing alert history, and monitoring live location during emergencies.',
    },
    {
      icon: MapPin,
      title: 'Live Location Sharing',
      description: 'Real-time GPS location updates during active alerts. Contacts see last known location with accuracy indicators.',
    },
    {
      icon: Bell,
      title: 'Multi-Channel Alerts',
      description: 'Email notifications with secure expiring links, loud alarm sounds, vibration, and visual alerts for emergency contacts.',
    },
    {
      icon: Users,
      title: 'Contact Management',
      description: 'Add, verify, and manage emergency contacts with relationship labels. Only authorized contacts receive alerts.',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'End-to-end data isolation. Contacts only see alerts they\'re authorized for. No cross-user data access ever.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-emergency-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-bold text-xl">SafeLink</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:py-32">
          <div className="text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Your Safety{' '}
              <span className="text-emergency">Connection</span>
              {' '}in an Emergency
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
              SafeLink connects your safety watch to trusted emergency contacts. One press sends
              an immediate alert with live location — only to the people you choose.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Start Free
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="border-y bg-muted/30 py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight">Built for Safety</h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Every feature designed for real emergencies — fast, reliable, and private.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="rounded-2xl bg-emergency p-12 text-center text-emergency-foreground">
              <h2 className="mb-4 text-3xl font-bold">How It Works</h2>
              <p className="mb-8 max-w-2xl mx-auto text-emergency-foreground/80">
                Simple three-step process designed for high-stress situations
              </p>
              <div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emergency-foreground/20 text-2xl font-bold">1</div>
                  <p className="text-center font-medium">Press SOS</p>
                  <p className="text-sm text-emergency-foreground/60 text-center">Large button on watch or phone</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emergency-foreground/20 text-2xl font-bold">2</div>
                  <p className="text-center font-medium">Confirm</p>
                  <p className="text-sm text-emergency-foreground/60 text-center">5-second countdown to cancel</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emergency-foreground/20 text-2xl font-bold">3</div>
                  <p className="text-center font-medium">Alert Sent</p>
                  <p className="text-sm text-emergency-foreground/60 text-center">Contacts notified with location</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Privacy & Security</h2>
            <p className="mb-8 max-w-2xl mx-auto text-muted-foreground">
              Your data stays yours. Contacts only receive alerts you explicitly authorize.
              No tracking, no data sharing, no surprises.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-6">
                <Shield className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Data Isolation</h3>
                <p className="text-sm text-muted-foreground">Each user\'s contacts, alerts, and location data completely separate</p>
              </div>
              <div className="p-6">
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Secure Links</h3>
                <p className="text-sm text-muted-foreground">Expiring, revocable access tokens for emergency contacts only</p>
              </div>
              <div className="p-6">
                <Users className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Audit Trail</h3>
                <p className="text-sm text-muted-foreground">Complete logs of alert creation, access, and resolution</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-emergency-foreground">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="font-bold text-xl">SafeLink</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Human safety platform for emergency alerts and location sharing.
              </p>
            </div>
            <nav>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/watch" className="hover:text-foreground">Watch Interface</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Phone Dashboard</Link></li>
                <li><Link href="/contacts" className="hover:text-foreground">Contact Management</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </nav>
            <nav>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>
              <strong>Important:</strong> SafeLink is a safety-support tool and does not replace emergency services.
              In immediate danger, contact local emergency services (911 in US, 112 in EU, 999 in UK).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
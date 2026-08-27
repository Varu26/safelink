'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Bell, MapPin, History, Settings, Plus, Wifi, WifiOff, Battery, Shield, CheckCircle, AlertTriangle, XCircle, Clock, MapPin as MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn, formatRelativeTime, getAlertStatusLabel, getAlertStatusColor } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'contacts' | 'location'>('overview');
  const [device, setDevice] = useState<{
    id: string;
    name: string;
    batteryLevel: number;
    isConnected: boolean;
    lastSeen: string | null;
  } | null>(null);
const [activeAlert, setActiveAlert] = useState<{
    id: string;
    status: string;
    triggeredAt: string;
    locationLat: number | null;
    locationLng: number | null;
    locationAccuracy: number | null;
    recipients: Array<{ name: string; email: string; isNotified: boolean }>;
  } | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      status: string;
      triggeredAt: string;
      resolvedAt: string | null;
      locationLat: number | null;
      locationLng: number | null;
      recipients: Array<{ name: string; email: string }>;
    }>
  >([]);
  const [contacts, setContacts] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      relationship: string | null;
      isVerified: boolean;
      isActive: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [deviceRes, alertsRes, contactsRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/alerts?limit=10'),
        fetch('/api/contacts'),
      ]);

      if (deviceRes.ok) {
        const data = await deviceRes.json();
        if (data.devices?.length > 0) setDevice(data.devices[0]);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
        const active = data.alerts?.find((a: any) => ['ACTIVE', 'ACKNOWLEDGED', 'PENDING_CONFIRMATION'].includes(a.status));
        if (active) setActiveAlert(active);
      }

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const handleResolveAlert = async () => {
    if (!activeAlert) return;
    try {
      const res = await fetch(`/api/alerts/${activeAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      if (res.ok) {
        setActiveAlert(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleCancelAlert = async () => {
    if (!activeAlert) return;
    try {
      const res = await fetch(`/api/alerts/${activeAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        setActiveAlert(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to cancel alert:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const statusColors = {
    ACTIVE: 'bg-emergency/10 text-emergency border-emergency/20',
    ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    RESOLVED: 'bg-safe/10 text-safe border-safe/20',
    CANCELLED: 'bg-muted text-muted-foreground border-muted',
    PENDING_CONFIRMATION: 'bg-emergency/10 text-emergency border-emergency/20 animate-pulse',
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session.user?.name?.split(' ')[0] || 'User'}</p>
        </div>

        {activeAlert && (
          <Alert className={cn('mb-6 border-2', statusColors[activeAlert.status as keyof typeof statusColors] || '')}>
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {activeAlert.status === 'PENDING_CONFIRMATION' ? 'Emergency Alert Pending Confirmation' :
                   activeAlert.status === 'ACTIVE' ? 'Active Emergency Alert' :
                   'Alert Acknowledged'}
                </span>
                <Badge variant={activeAlert.status === 'ACTIVE' ? 'destructive' : activeAlert.status === 'ACKNOWLEDGED' ? 'warning' : 'default'}>
                  {getAlertStatusLabel(activeAlert.status)}
                </Badge>
              </div>
              <div className="flex gap-2">
                {activeAlert.status === 'ACTIVE' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancelAlert}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleResolveAlert}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      I'm Safe
                    </Button>
                  </>
                )}
                <Link href={`/alert/${activeAlert.id}`}>
                  <Button variant="outline" size="sm">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'alerts' | 'contacts' | 'location')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="location">Live Location</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Watch Status</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', device?.isConnected ? 'bg-safe/10' : 'bg-emergency/10')}>
                      {device?.isConnected ? (
                        <Wifi className="h-6 w-6 text-safe" />
                      ) : (
                        <WifiOff className="h-6 w-6 text-emergency" />
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{device?.name || 'Not Paired'}</p>
                      <p className={cn('text-sm', device?.isConnected ? 'text-safe' : 'text-emergency')}>
                        {device?.isConnected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  {device && (
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Battery className="h-4 w-4" />
                        <span>{device.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Last seen: {device.lastSeen ? formatRelativeTime(device.lastSeen) : 'Never'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className={cn('text-2xl font-bold', activeAlert ? 'text-emergency' : 'text-safe')}>
                    {activeAlert ? '1 Active' : 'None'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeAlert ? `Since ${formatRelativeTime(activeAlert.triggeredAt)}` : 'All clear'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Emergency Contacts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{contacts.filter(c => c.isActive && c.isVerified).length}</p>
                  <p className="text-sm text-muted-foreground">
                    {contacts.length} total, {contacts.filter(c => c.isVerified).length} verified
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alert History</CardTitle>
                  <History className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {alerts.filter(a => a.status === 'RESOLVED').length} resolved this month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/watch">
                    <Button className="w-full justify-start gap-3">
                      <MapPin className="h-4 w-4" />
                      Open Watch Interface
                    </Button>
                  </Link>
                  <Link href="/contacts">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Users className="h-4 w-4" />
                      Manage Contacts
                    </Button>
                  </Link>
                  <Link href="/alerts">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <History className="h-4 w-4" />
                      View Alert History
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency/10 text-emergency">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Data Isolation</p>
                        <p className="text-sm text-muted-foreground">Your alerts only go to your contacts</p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-safe/10 text-safe">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Secure Links</p>
                        <p className="text-sm text-muted-foreground">Expiring access tokens for contacts</p>
                      </div>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Audit Logging</p>
                        <p className="text-sm text-muted-foreground">All alert actions are logged</p>
                      </div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No alerts yet</p>
                    <p className="text-sm text-muted-foreground">Your alert history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <Link key={alert.id} href={`/alert/${alert.id}`} className="block">
                        <div className={cn('p-4 rounded-lg border hover:bg-muted/50 transition-colors', statusColors[alert.status as keyof typeof statusColors] || '')}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant={
                                  alert.status === 'ACTIVE' ? 'destructive' :
                                  alert.status === 'ACKNOWLEDGED' ? 'warning' :
                                  alert.status === 'RESOLVED' ? 'success' : 'default'
                                }>
                                  {getAlertStatusLabel(alert.status)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatRelativeTime(alert.triggeredAt)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {alert.recipients.length} contact{alert.recipients.length !== 1 ? 's' : ''} notified
                              </p>
                              {alert.locationLat && alert.locationLng && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  Location shared
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <CardTitle>Emergency Contacts</CardTitle>
              <Link href="/contacts">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-0">
                {contacts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No emergency contacts yet</p>
                    <Link href="/contacts">
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Contact
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {contacts.map((contact) => (
                      <Link key={contact.id} href={`/contacts/${contact.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.isVerified ? (
                              <Badge variant="success">Verified</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            {contact.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
              </CardHeader>
              <CardContent>
                {activeAlert && activeAlert.locationLat && activeAlert.locationLng ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-lg bg-muted relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-4">
                          <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                          <p className="mt-4 text-muted-foreground">Live Location Map</p>
                          <p className="text-sm text-muted-foreground/70">
                            {activeAlert.locationLat.toFixed(6)}, {activeAlert.locationLng.toFixed(6)}
                          </p>
                          {activeAlert.locationAccuracy && (
                            <p className="text-xs text-muted-foreground/50">
                              Accuracy: ±{Math.round(activeAlert.locationAccuracy)}m
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge variant={activeAlert.status === 'ACTIVE' ? 'destructive' : 'success'}>
                          {getAlertStatusLabel(activeAlert.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Latitude</p>
                        <p className="font-mono text-lg">{activeAlert.locationLat.toFixed(6)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Longitude</p>
                        <p className="font-mono text-lg">{activeAlert.locationLng.toFixed(6)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="font-mono text-lg">{formatRelativeTime(activeAlert.triggeredAt)}</p>
                      </div>
                    </div>
                    <Link href={`/alert/${activeAlert.id}`}>
                      <Button className="w-full">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        View Full Alert Details
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No active location sharing</p>
                    <p className="text-sm text-muted-foreground">
                      Location is only shared during an active emergency alert
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
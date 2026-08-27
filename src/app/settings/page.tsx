'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Smartphone, Shield, Bell, MapPin, LogOut, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'device' | 'privacy' | 'notifications' | 'account'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [profile, setProfile] = useState({ name: '', image: '' });
  const [device, setDevice] = useState<{
    id: string;
    name: string;
    model: string | null;
    batteryLevel: number;
    isConnected: boolean;
    isPaired: boolean;
    pairedAt: string | null;
  } | null>(null);
  const [settings, setSettings] = useState({
    locationSharing: true,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    alertSound: true,
    vibration: true,
    autoResolveHours: 24,
    testMode: false,
  });

  const fetchData = async () => {
    try {
      const [userRes, settingsRes, deviceRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/settings'),
        fetch('/api/devices'),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setProfile({ name: data.name || '', image: data.image || '' });
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings || settings);
      }

      if (deviceRes.ok) {
        const data = await deviceRes.json();
        if (data.devices?.length > 0) setDevice(data.devices[0]);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveProfile = async () => {
    setSaving('profile');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      });
      if (res.ok) {
        await update();
        toast({ title: 'Profile saved' });
      } else throw new Error('Failed to save');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const saveSettings = async (section: string) => {
    setSaving(section);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        toast({ title: 'Settings saved' });
      } else throw new Error('Failed to save');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const unpairDevice = async () => {
    if (!device || !confirm('Are you sure you want to unpair this device?')) return;
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevice(null);
        toast({ title: 'Device unpaired' });
      } else throw new Error('Failed to unpair');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unpair device', variant: 'destructive' });
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (isLoading) {
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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account, device, and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'device' | 'privacy' | 'notifications' | 'account')} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="device">Device</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback className="text-2xl">{getInitials(session.user?.name || 'U')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{session.user?.name || 'No name set'}</h3>
                    <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in with Google</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={session.user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">Email is managed through your Google account</p>
                  </div>
                </div>

                <Button onClick={saveProfile} disabled={saving === 'profile'}>
                  {saving === 'profile' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="device" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Watch / Device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {device ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Smartphone className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">{device.model || 'Unknown model'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className={cn('flex items-center gap-1', device.isConnected ? 'text-safe' : 'text-emergency')}>
                            {device.isConnected ? (
                              <>
                                <CheckCircle className="h-4 w-4" /> Connected
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4" /> Disconnected
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-current" />
                            Battery: {device.batteryLevel}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="deviceName">Device Name</Label>
                        <Input
                          id="deviceName"
                          value={device.name}
                          onChange={(e) => setDevice({ ...device!, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deviceModel">Device Model</Label>
                        <Input
                          id="deviceModel"
                          value={device.model || ''}
                          onChange={(e) => setDevice({ ...device!, model: e.target.value })}
                          placeholder="e.g., Apple Watch Series 9"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={unpairDevice}>
                        Unpair Device
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-semibold">No Device Paired</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Pair a safety watch to enable the watch interface and SOS button.
                    </p>
                    <Button className="mt-4">
                      Pair New Device
                    </Button>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-emergency" />
                    Simulator Notice
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This is a browser-based simulator. In production, this would connect to a physical
                    safety watch device via Bluetooth or cellular. Real device pairing will be available
                    in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Location Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Share Location During Emergency</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow emergency contacts to see your live GPS location when you trigger an SOS alert
                      </p>
                    </div>
                    <Switch
                      checked={settings.locationSharing}
                      onCheckedChange={(checked) => setSettings({ ...settings, locationSharing: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Auto-Resolve Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically mark alerts as resolved after the specified time
                      </p>
                    </div>
                    <select
                      value={settings.autoResolveHours}
                      onChange={(e) => setSettings({ ...settings, autoResolveHours: parseInt(e.target.value) })}
                      className="px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value={1}>1 hour</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                    </select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Test Mode</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable test mode to try the SOS button without notifying contacts
                      </p>
                    </div>
                    <Switch
                      checked={settings.testMode}
                      onCheckedChange={(checked) => setSettings({ ...settings, testMode: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => saveSettings('privacy')} disabled={saving === 'privacy'}>
                  {saving === 'privacy' ? 'Saving...' : 'Save Privacy Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive emergency alerts via email</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive browser push notifications for alerts</p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive emergency alerts via SMS (requires phone number)</p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Alert Sound</h4>
                      <p className="text-sm text-muted-foreground">Play alarm sound when emergency alert is received</p>
                    </div>
                    <Switch
                      checked={settings.alertSound}
                      onCheckedChange={(checked) => setSettings({ ...settings, alertSound: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Vibration</h4>
                      <p className="text-sm text-muted-foreground">Vibrate device when emergency alert is received</p>
                    </div>
                    <Switch
                      checked={settings.vibration}
                      onCheckedChange={(checked) => setSettings({ ...settings, vibration: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => saveSettings('notifications')} disabled={saving === 'notifications'}>
                  {saving === 'notifications' ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-6">
            <Card className="border-emergency/50">
              <CardHeader>
                <CardTitle className="text-emergency flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-emergency/10 border border-emergency/20">
                  <h4 className="font-medium text-emergency mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will permanently delete your account, all emergency contacts, alert history,
                    and device pairings. This action cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={() => { if (confirm('Are you absolutely sure? This cannot be undone.')) alert('Account deletion not implemented in demo') }}>
                    Delete Account Permanently
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sign Out</h4>
                    <p className="text-sm text-muted-foreground">Sign out of your SafeLink account</p>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>About SafeLink</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>SafeLink v1.0.0 - Human Safety Platform</p>
                <p>Built with Next.js, React, Prisma, and NextAuth</p>
                <div className="pt-4 border-t">
                  <p className="font-medium text-foreground">Important Notice</p>
                  <p className="mt-1">
                    SafeLink is a safety-support tool and does not replace emergency services.
                    In immediate danger, contact local emergency services:
                    <br />
                    <strong>911</strong> (US) • <strong>112</strong> (EU) • <strong>999</strong> (UK)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, CheckCircle, AlertTriangle, XCircle, User, Shield, MapPin as MapPinIcon, Volume2, VolumeX, Bell, Lock, Mic } from 'lucide-react';
import { cn, formatRelativeTime, getAlertStatusLabel, getInitials } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { VoiceMessages } from '@/components/voice/voice-messages';
import { VoiceRecorder } from '@/components/voice/voice-recorder';

interface AlertData {
  alert: {
    id: string;
    status: string;
    triggeredAt: string;
    confirmedAt: string | null;
    resolvedAt: string | null;
    acknowledgedAt: string | null;
    cancelledAt: string | null;
    locationLat: number | null;
    locationLng: number | null;
    locationAccuracy: number | null;
    locationUpdatedAt: string | null;
    user: { id: string; name: string | null; email: string; image: string | null };
    recipients: Array<{ id: string; name: string; email: string; isNotified: boolean; notifiedAt: string | null; accessToken: string }>;
    acknowledgements: Array<{ id: string; userId: string; createdAt: string; user: { name: string | null; email: string } }>;
    locationUpdates: Array<{ id: string; lat: number; lng: number; accuracy: number | null; timestamp: string }>;
    metadata: { isTest?: boolean } | null;
  };
  recipient: {
    id: string;
    name: string;
    email: string;
    isNotified: boolean;
    notifiedAt: string | null;
  };
  contact: {
    id: string;
    name: string;
    email: string;
    relationship: string | null;
  };
  canAcknowledge: boolean;
  canResolve: boolean;
  isExpired: boolean;
}

export default function SecureAlertAccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<Array<{
    id: string;
    senderId: string;
    sender: { id: string; name: string | null; image: string | null };
    audioUrl: string;
    duration: number;
    mimeType: string;
    fileSize: number;
    transcript: string | null;
    isPlayed: boolean;
    playedAt: string | null;
    createdAt: string;
  }>>([]);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);

  const token = params.token as string;

  const fetchAlert = async () => {
    try {
      const res = await fetch(`/api/access/alert/${token}`);
      if (res.ok) {
        const data = await res.json();
        setAlertData(data);
      } else if (res.status === 404) {
        setError('Invalid or expired access link');
      } else if (res.status === 410) {
        setError('This access link has expired');
      } else if (res.status === 403) {
        setError('Access denied');
      } else {
        setError('Failed to load alert');
      }
    } catch (error) {
      console.error('Failed to fetch alert:', error);
      setError('Failed to load alert');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVoiceMessages = async () => {
    if (!alertData?.alert?.id) return;
    setIsLoadingVoice(true);
    try {
      const res = await fetch(`/api/voice-messages?alertId=${alertData.alert.id}`);
      if (res.ok) {
        const data = await res.json();
        setVoiceMessages(data.voiceMessages || []);
      }
    } catch (error) {
      console.error('Failed to fetch voice messages:', error);
    } finally {
      setIsLoadingVoice(false);
    }
  };

  useEffect(() => {
    fetchAlert();
  }, [token]);

  useEffect(() => {
    if (alertData?.alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alertData.alert.status)) {
      fetchVoiceMessages();
      const interval = setInterval(fetchVoiceMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [alertData?.alert?.status, alertData?.alert?.id]);

  useEffect(() => {
    if (alertData?.alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alertData.alert.status) && soundEnabled && hasInteracted) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      playAlarmSound(ctx);
    }
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [alertData?.alert?.status, soundEnabled, hasInteracted]);

  const playAlarmSound = (ctx: AudioContext) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.5);
    
    oscillator.onended = () => {
      if (alertData?.alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alertData.alert.status) && soundEnabled && hasInteracted) {
        setTimeout(() => playAlarmSound(ctx), 500);
      }
    };
  };

  const handleAcknowledge = async () => {
    if (!alertData) return;
    setHasInteracted(true);
    try {
      const res = await fetch(`/api/alerts/${alertData.alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      });
      if (res.ok) {
        fetchAlert();
        toast({ title: 'Alert acknowledged', description: 'The alert owner has been notified' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to acknowledge', variant: 'destructive' });
    }
  };

  const handleResolve = async () => {
    if (!alertData) return;
    setHasInteracted(true);
    try {
      const res = await fetch(`/api/alerts/${alertData.alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      if (res.ok) {
        fetchAlert();
        toast({ title: 'Alert resolved', description: 'Emergency contacts notified' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resolve', variant: 'destructive' });
    }
  };

  const handleVoiceMessageComplete = async (audioBase64: string, duration: number, mimeType: string) => {
    if (!alertData) return;
    try {
      const res = await fetch('/api/voice-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alertData.alert.id, audioBase64, duration, mimeType }),
      });
      if (res.ok) {
        fetchVoiceMessages();
        toast({ title: 'Voice message sent' });
      } else {
        const error = await res.json();
        toast({ title: 'Failed to send', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send voice message', variant: 'destructive' });
    }
  };

  const handleSignIn = () => {
    signIn('google', { callbackUrl: `/access/alert/${token}` });
  };

  const statusColors = {
    ACTIVE: 'bg-emergency/10 text-emergency border-emergency/20',
    ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    RESOLVED: 'bg-safe/10 text-safe border-safe/20',
    CANCELLED: 'bg-muted text-muted-foreground border-muted',
    PENDING_CONFIRMATION: 'bg-emergency/10 text-emergency border-emergency/20',
  };

  const latestLocation = alertData?.alert.locationUpdates[0] || null;
  const displayLat = latestLocation?.lat ?? alertData?.alert.locationLat;
  const displayLng = latestLocation?.lng ?? alertData?.alert.locationLng;
  const displayAccuracy = latestLocation?.accuracy ?? alertData?.alert.locationAccuracy;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading alert...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-emergency" />
            <h2 className="mt-4 text-xl font-bold">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              This secure link may have expired or been revoked.
              {alertData?.isExpired && ' The alert has been resolved or expired.'}
            </p>
            {session && (
              <Button className="mt-4" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            )}
            {!session && (
              <Button className="mt-4" onClick={handleSignIn}>
                Sign In with Google
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!alertData) return null;

  const alert = alertData.alert;
  const recipient = alertData.recipient;
  const contact = alertData.contact;

  const canAcknowledge = alertData.canAcknowledge && ['PENDING_CONFIRMATION', 'ACTIVE', 'ACKNOWLEDGED'].includes(alert.status);
  const canResolve = alertData.canResolve && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status);

  return (
    <div className="min-h-screen bg-background pt-16">
      {!session && (
        <div className="fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Alert className="mb-0 border-emergency/50 bg-emergency/10">
              <Lock className="h-5 w-5" />
              <AlertDescription className="flex items-center justify-between">
                <span>Secure access link - Sign in to access full features</span>
                <Button size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-emergency-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl">SafeLink</span>
            <Badge variant="outline" className="ml-2">Secure Access</Badge>
          </div>
          <h1 className="text-3xl font-bold">Emergency Alert</h1>
          <p className="text-muted-foreground">{alert.user.name || 'Unknown User'}'s emergency alert</p>
        </div>

        {alert.metadata?.isTest && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-yellow-500 font-medium">TEST MODE - This is a test alert. No emergency services have been contacted.</AlertDescription>
          </Alert>
        )}

        <div className={cn('mb-6 p-4 rounded-lg border', statusColors[alert.status as keyof typeof statusColors] || '')}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', statusColors[alert.status as keyof typeof statusColors] || '')}>
                {alert.status === 'ACTIVE' && <AlertTriangle className="h-5 w-5" />}
                {alert.status === 'ACKNOWLEDGED' && <CheckCircle className="h-5 w-5 text-yellow-500" />}
                {alert.status === 'RESOLVED' && <CheckCircle className="h-5 w-5 text-safe" />}
                {alert.status === 'CANCELLED' && <XCircle className="h-5 w-5" />}
                {alert.status === 'PENDING_CONFIRMATION' && <Clock className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold">{getAlertStatusLabel(alert.status)}</p>
                <p className="text-sm text-muted-foreground">Triggered {formatRelativeTime(alert.triggeredAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                alert.status === 'ACTIVE' ? 'destructive' :
                alert.status === 'ACKNOWLEDGED' ? 'warning' :
                alert.status === 'RESOLVED' ? 'success' : 'default'
              }>
                {getAlertStatusLabel(alert.status)}
              </Badge>
            </div>
          </div>
        </div>

        {['PENDING_CONFIRMATION', 'ACTIVE'].includes(alert.status) && alertData.canAcknowledge && !alertData.canResolve && (
          <Alert className="mb-6 border-emergency/50 bg-emergency/10 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-emergency" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emergency">ACTIVE EMERGENCY ALERT</span>
                <Badge variant="destructive">Immediate Attention Required</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="lg" onClick={handleAcknowledge}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge Alert
                </Button>
                <Button variant="outline" size="lg" onClick={() => setSoundEnabled(!soundEnabled)}>
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Mute Sound
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Alert ID</p>
                    <p className="font-mono text-sm">{alert.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Access</p>
                    <p className="font-medium capitalize">{contact.relationship || 'Emergency Contact'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Triggered</p>
                    <p>{formatRelativeTime(alert.triggeredAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={
                      alert.status === 'ACTIVE' ? 'destructive' :
                      alert.status === 'ACKNOWLEDGED' ? 'warning' :
                      alert.status === 'RESOLVED' ? 'success' : 'default'
                    }>
                      {getAlertStatusLabel(alert.status)}
                    </Badge>
                  </div>
                  {alert.confirmedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Confirmed</p>
                      <p>{formatRelativeTime(alert.confirmedAt)}</p>
                    </div>
                  )}
                  {alert.acknowledgedAt && (
                    <div className="text-yellow-500">
                      <p className="text-sm text-muted-foreground">Acknowledged</p>
                      <p>{formatRelativeTime(alert.acknowledgedAt)}</p>
                    </div>
                  )}
                  {alert.resolvedAt && (
                    <div className="text-safe">
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p>{formatRelativeTime(alert.resolvedAt)}</p>
                    </div>
                  )}
                  {alert.cancelledAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cancelled</p>
                      <p>{formatRelativeTime(alert.cancelledAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {alert.user.image ? (
                      <img src={alert.user.image} alt="" className="h-12 w-12 rounded-full" />
                    ) : (
                      <span className="text-xl font-bold">{getInitials(alert.user.name || 'U')}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{alert.user.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{alert.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {alertData.canResolve && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
              <Card className="border-emergency/50">
                <CardHeader>
                  <CardTitle className="text-emergency flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="destructive" className="w-full" onClick={handleResolve}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Alert
                  </Button>
                  <Button variant="safe" className="w-full" onClick={handleResolve}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I'm Safe / Resolve
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
              </CardHeader>
              <CardContent>
                {displayLat && displayLng ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-lg bg-muted relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-4">
                          <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                          <p className="mt-4 text-lg font-medium">Live Location</p>
                          <p className="text-sm text-muted-foreground">
                            {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                          </p>
                          {displayAccuracy && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Accuracy: ±{Math.round(displayAccuracy)}m
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge variant={alert.status === 'ACTIVE' ? 'destructive' : 'success'}>
                          {getAlertStatusLabel(alert.status)}
                        </Badge>
                        <Badge variant="outline">Location Active</Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Latitude</p>
                        <p className="font-mono text-lg">{displayLat.toFixed(6)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Longitude</p>
                        <p className="font-mono text-lg">{displayLng.toFixed(6)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="font-mono text-lg">{alert.locationUpdatedAt ? formatRelativeTime(alert.locationUpdatedAt) : formatRelativeTime(alert.triggeredAt)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Your Notification</p>
                        <p className="font-mono text-lg">{recipient.isNotified ? formatRelativeTime(recipient.notifiedAt!) : 'Pending'}</p>
                      </div>
                    </div>

                    {displayAccuracy && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          <span>Location accuracy: ±{Math.round(displayAccuracy)} meters</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No location available</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED'
                        ? 'Waiting for location permission or GPS fix...'
                        : 'Location was not shared during this alert'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Other Notified Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alert.recipients
                    .filter(r => r.id !== recipient.id)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </div>
                        <Badge variant={r.isNotified ? 'success' : 'secondary'}>
                          {r.isNotified ? 'Notified' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  {alert.recipients.length <= 1 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No other contacts notified</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Lock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Secure Access Link</p>
                    <p className="text-sm text-muted-foreground">This link is unique to you and expires in 24 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-safe" />
                  <div>
                    <p className="font-medium">Data Isolation</p>
                    <p className="text-sm text-muted-foreground">You can only access alerts you're authorized for</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Bell className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Real-time Updates</p>
                    <p className="text-sm text-muted-foreground">Location and status update automatically</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Voice Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alertData.canResolve && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
                  <VoiceRecorder 
                    onRecordingComplete={handleVoiceMessageComplete}
                    disabled={!['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)}
                    maxDuration={60}
                  />
                )}
                
                {(!alertData.canResolve || !['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) && (
                  <div className="text-center py-8">
                    <Mic className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">
                      {alertData.canResolve ? 'Voice messages can only be sent during active alerts' : 'Only the alert owner can send voice messages'}
                    </p>
                  </div>
                )}

                <VoiceMessages
                  messages={voiceMessages}
                  currentUserId={alertData.recipient.id}
                  onMarkPlayed={async (id) => {
                    try {
                      await fetch(`/api/voice-messages/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isPlayed: true }),
                      });
                      fetchVoiceMessages();
                    } catch (error) {
                      console.error('Failed to mark played:', error);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await fetch(`/api/voice-messages/${id}`, { method: 'DELETE' });
                      fetchVoiceMessages();
                      toast({ title: 'Voice message deleted' });
                    } catch (error) {
                      toast({ title: 'Failed to delete', variant: 'destructive' });
                    }
                  }}
                  canDelete={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {alertData.canAcknowledge && ['PENDING_CONFIRMATION', 'ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && !alertData.canResolve && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 z-50 max-w-md">
          <Alert className={cn('shadow-lg', statusColors[alert.status as keyof typeof statusColors] || '')}>
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{alert.user.name || 'Someone'} needs help</span>
                <Badge variant={alert.status === 'ACTIVE' ? 'destructive' : 'warning'}>
                  {getAlertStatusLabel(alert.status)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={handleAcknowledge}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge Alert
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSoundEnabled(!soundEnabled)}>
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Mute
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
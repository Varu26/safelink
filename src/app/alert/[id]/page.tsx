'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, CheckCircle, AlertTriangle, XCircle, User, Mail, Phone, Shield, MapPin as MapPinIcon, History, RefreshCw, Volume2, VolumeX, Vibrate, Bell, Mic, Volume } from 'lucide-react';
import { cn, formatRelativeTime, getAlertStatusLabel } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceMessages } from '@/components/voice/voice-messages';
import { VoiceRecorder } from '@/components/voice/voice-recorder';

interface AlertData {
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
}

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isRecipient, setIsRecipient] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
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

  const alertId = params.id as string;

  const fetchAlert = async () => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`);
      if (res.ok) {
        const data = await res.json();
        setAlert(data.alert);
        setIsOwner(data.alert.userId === (session?.user as any)?.id);
        setIsRecipient(data.alert.recipients.some((r: any) => r.userId === (session?.user as any)?.id));
      } else if (res.status === 403) {
        router.push('/dashboard');
      } else if (res.status === 404) {
        toast({ title: 'Alert not found', variant: 'destructive' });
        router.push('/alerts');
      }
    } catch (error) {
      console.error('Failed to fetch alert:', error);
      toast({ title: 'Error', description: 'Failed to load alert', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVoiceMessages = async () => {
    if (!alertId) return;
    setIsLoadingVoice(true);
    try {
      const res = await fetch(`/api/voice-messages?alertId=${alertId}`);
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
    if (status === 'authenticated') {
      fetchAlert();
    }
  }, [status]);

  useEffect(() => {
    if (alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
      fetchVoiceMessages();
      // Poll for new voice messages every 5 seconds during active alert
      const interval = setInterval(fetchVoiceMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [alert?.status, alertId]);

  useEffect(() => {
    if (alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && soundEnabled) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      playAlarmSound(ctx);
    }
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [alert?.status, soundEnabled]);

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
      if (alert && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && soundEnabled) {
        setTimeout(() => playAlarmSound(ctx), 500);
      }
    };
  };

  const handleConfirm = async () => {
    if (!alert) return;
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          locationLat: alert.locationLat,
          locationLng: alert.locationLng,
          locationAccuracy: alert.locationAccuracy,
        }),
      });

      if (res.ok) {
        fetchAlert();
        toast({
          title: 'Alert confirmed',
          description: 'Emergency contacts can now acknowledge the alert',
        });
      } else {
        const error = await res.json().catch(() => ({}));
        toast({
          title: 'Failed to confirm alert',
          description: error.error || 'Failed to confirm alert',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm alert',
        variant: 'destructive',
      });
    }
  };

  const handleAcknowledge = async () => {
    if (!alert) return;
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
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
    if (!alert) return;
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
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

  const handleCancel = async () => {
    if (!alert) return;
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        fetchAlert();
        toast({ title: 'Alert cancelled', description: 'Emergency contacts notified' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel', variant: 'destructive' });
    }
  };

  const handleVoiceMessageComplete = async (audioBase64: string, duration: number, mimeType: string) => {
    if (!alert) return;
    try {
      const res = await fetch('/api/voice-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id, audioBase64, duration, mimeType }),
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

  const statusColors = {
    ACTIVE: 'bg-emergency/10 text-emergency border-emergency/20',
    ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    RESOLVED: 'bg-safe/10 text-safe border-safe/20',
    CANCELLED: 'bg-muted text-muted-foreground border-muted',
    PENDING_CONFIRMATION: 'bg-emergency/10 text-emergency border-emergency/20',
  };

  const latestLocation = alert?.locationUpdates[0] || null;
  const displayLat = latestLocation?.lat ?? alert?.locationLat;
  const displayLng = latestLocation?.lng ?? alert?.locationLng;
  const displayAccuracy = latestLocation?.accuracy ?? alert?.locationAccuracy;

  if (status === 'loading' || isLoading) {
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

  if (!alert || !session) return null;

  const canAcknowledge = isRecipient && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status);
  const canResolve = isOwner && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status);
  const canCancel = isOwner && ['ACTIVE', 'ACKNOWLEDGED', 'PENDING_CONFIRMATION'].includes(alert.status);

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Emergency Alert</h1>
            <p className="text-muted-foreground">{alert.user.name || alert.user.email}'s alert</p>
          </div>
          <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border', statusColors[alert.status as keyof typeof statusColors] || '')}>
            <Badge variant={
              alert.status === 'ACTIVE' ? 'destructive' :
              alert.status === 'ACKNOWLEDGED' ? 'warning' :
              alert.status === 'RESOLVED' ? 'success' : 'default'
            }>
              {getAlertStatusLabel(alert.status)}
            </Badge>
          </div>
        </div>

        {alert.metadata?.isTest && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-yellow-500 font-medium">TEST MODE - This is a test alert. No emergency services have been contacted.</AlertDescription>
          </Alert>
        )}

        {alert.status === 'ACTIVE' && isRecipient && !isOwner && (
          <Alert className="mb-6 border-emergency/50 bg-emergency/10 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-emergency" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emergency">ACTIVE EMERGENCY ALERT</span>
                <Badge variant="destructive">Immediate Attention Required</Badge>
              </div>
              <Button variant="destructive" size="lg" onClick={handleAcknowledge}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge Alert
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="history">Timeline</TabsTrigger>
            <TabsTrigger value="voice">Voice Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Alert Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Alert ID</p>
                        <p className="font-mono text-sm">{alert.id}</p>
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
                      <div>
                        <p className="text-sm text-muted-foreground">Triggered</p>
                        <p>{formatRelativeTime(alert.triggeredAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{alert.confirmedAt ? 'Confirmed' : alert.cancelledAt ? 'Cancelled' : alert.resolvedAt ? 'Resolved' : 'Pending'}</p>
                        <p>{alert.confirmedAt ? formatRelativeTime(alert.confirmedAt) : alert.cancelledAt ? formatRelativeTime(alert.cancelledAt) : alert.resolvedAt ? formatRelativeTime(alert.resolvedAt) : '—'}</p>
                      </div>
                      {alert.acknowledgedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Acknowledged</p>
                          <p className="text-yellow-500">{formatRelativeTime(alert.acknowledgedAt)}</p>
                        </div>
                      )}
                      {alert.resolvedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Resolved</p>
                          <p className="text-safe">{formatRelativeTime(alert.resolvedAt)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Contacts Notified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alert.recipients.map((recipient) => (
                        <div key={recipient.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {recipient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{recipient.name}</p>
                              <p className="text-sm text-muted-foreground">{recipient.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {recipient.isNotified ? (
                              <>
                                <Badge variant="success" className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Notified
                                </Badge>
                                {recipient.notifiedAt && (
                                  <span className="text-sm text-muted-foreground">{formatRelativeTime(recipient.notifiedAt)}</span>
                                )}
                              </>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {alert.acknowledgements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Acknowledgements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {alert.acknowledgements.map((ack) => (
                          <div key={ack.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-yellow-500" />
                              <div>
                                <p className="font-medium">{ack.user.name || ack.user.email}</p>
                                <p className="text-sm text-muted-foreground">Acknowledged {formatRelativeTime(ack.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Alert Owner</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {alert.user.image ? (
                          <img src={alert.user.image} alt="" className="h-12 w-12 rounded-full" />
                        ) : (
                          <span className="text-xl font-bold">{alert.user.name?.charAt(0).toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{alert.user.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{alert.user.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isOwner && ['ACTIVE', 'ACKNOWLEDGED', 'PENDING_CONFIRMATION'].includes(alert.status) && (
                  <Card className="border-emergency/50">
                    <CardHeader>
                      <CardTitle className="text-emergency flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Emergency Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {alert.status === 'PENDING_CONFIRMATION' && (
                        <>
                          <Button variant="safe" className="w-full" onClick={handleConfirm}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Alert
                          </Button>
                          <Button variant="destructive" className="w-full" onClick={handleCancel}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Alert
                          </Button>
                        </>
                      )}
                      {['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
                        <>
                          <Button variant="destructive" className="w-full" onClick={handleCancel}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Alert
                          </Button>
                          <Button variant="safe" className="w-full" onClick={handleResolve}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            I'm Safe / Resolve
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
              </CardHeader>
              <CardContent>
                {displayLat && displayLng ? (
                  <div className="space-y-6">
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
                        <Badge variant="outline">Location Sharing Active</Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
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
                    </div>

                    {displayAccuracy && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          <span>Location accuracy: ±{Math.round(displayAccuracy)} meters</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Location
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg text-muted-foreground">No location available</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED'
                        ? 'Waiting for location permission or GPS fix...'
                        : 'Location was not shared during this alert'}
                    </p>
                  </div>
                )}

                {alert.locationUpdates.length > 1 && (
                  <div className="mt-6">
                    <Separator />
                    <h4 className="mt-4 mb-3 font-medium">Location History</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {alert.locationUpdates.slice(0, 10).map((update, index) => (
                        <div key={update.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                            <span className="font-mono text-sm">{update.lat.toFixed(6)}, {update.lng.toFixed(6)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {update.accuracy && <span>±{Math.round(update.accuracy)}m</span>}
                            <span>{formatRelativeTime(update.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={cn('flex items-start gap-4 p-4 rounded-lg', statusColors[alert.status as keyof typeof statusColors] || '')}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Alert Triggered</p>
                      <p className="text-sm text-muted-foreground">{formatRelativeTime(alert.triggeredAt)}</p>
                    </div>
                  </div>
                  
                  {alert.confirmedAt && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Alert Confirmed</p>
                        <p className="text-sm text-muted-foreground">{formatRelativeTime(alert.confirmedAt)}</p>
                      </div>
                    </div>
                  )}

                  {alert.recipients.some(r => r.isNotified) && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Contacts Notified</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.recipients.filter(r => r.isNotified).length} of {alert.recipients.length} contacts notified
                        </p>
                      </div>
                    </div>
                  )}

                  {alert.acknowledgements.length > 0 && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Alert Acknowledged</p>
                        <p className="text-sm text-muted-foreground">
                          By {alert.acknowledgements.map(a => a.user.name || a.user.email).join(', ')} at {formatRelativeTime(alert.acknowledgements[0].createdAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {alert.resolvedAt && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-safe/10 border border-safe/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-safe" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Alert Resolved</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.metadata?.isTest ? 'Test alert resolved' : 'User marked safe'} at {formatRelativeTime(alert.resolvedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {alert.cancelledAt && (
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0">
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Alert Cancelled</p>
                        <p className="text-sm text-muted-foreground">Cancelled at {formatRelativeTime(alert.cancelledAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <div className="space-y-6">
              {isOwner && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Send Voice Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VoiceRecorder 
                      onRecordingComplete={handleVoiceMessageComplete}
                      disabled={!['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)}
                      maxDuration={60}
                    />
                  </CardContent>
                </Card>
              )}
              
              {(!isOwner || !['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Mic className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">
                      {isOwner ? 'Voice messages can only be sent during active alerts' : 'Only the alert owner can send voice messages'}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  <VoiceMessages
                    messages={voiceMessages}
                    currentUserId={(session?.user as any)?.id || ''}
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
                    canDelete={isOwner}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {isRecipient && !isOwner && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
          <div className="fixed bottom-4 right-4 left-4 md:left-auto md:right-4 md:bottom-4 z-50 max-w-md">
            <Alert className={cn('shadow-lg', statusColors[alert.status as keyof typeof statusColors] || '')}>
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{alert.user.name || 'Someone'} triggered an emergency alert</span>
                  <Badge variant={alert.status === 'ACTIVE' ? 'destructive' : 'warning'}>
                    {getAlertStatusLabel(alert.status)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" onClick={handleAcknowledge}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Acknowledge
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
      </main>
    </div>
  );
}
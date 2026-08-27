'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Wifi, WifiOff, Battery, BatteryLow, User, AlertTriangle, CheckCircle, XCircle, MapPin, Clock, Shield, Volume2, Mic } from 'lucide-react';
import { cn, formatTime, getInitials } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COUNTDOWN_DURATION = 5;

export default function WatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [device, setDevice] = useState<{
    id: string;
    name: string;
    batteryLevel: number;
    isConnected: boolean;
    lastSeen: string | null;
  } | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [alertStatus, setAlertStatus] = useState<'pending' | 'active' | 'acknowledged' | 'resolved'>('pending');
  const [countdownRef, setCountdownRef] = useState<NodeJS.Timeout | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  const fetchDevice = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        if (data.devices?.length > 0) {
          setDevice(data.devices[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch device:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDevice();
    }
  }, [status, fetchDevice]);

  const fetchVoiceMessages = useCallback(async () => {
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
  }, [alertId]);

  useEffect(() => {
    if (isAlertActive && alertId) {
      fetchVoiceMessages();
      const interval = setInterval(fetchVoiceMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isAlertActive, alertId, fetchVoiceMessages]);

  const getCurrentLocation = useCallback(async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(coords);
          setLocationError(null);
          resolve(coords);
        },
        (error) => {
          let message = 'Unable to retrieve location';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied. Please enable location access in browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is unavailable';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out';
          }
          setLocationError(message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const startLocationUpdates = useCallback(() => {
    if (!navigator.geolocation) return;
    
    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(coords);
        setLocationError(null);
        
        if (alertId) {
          fetch(`/api/alerts/${alertId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateLocation', ...coords }),
          }).catch(console.error);
        }
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [alertId]);

  const stopLocationUpdates = useCallback(() => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
  }, []);

  const startCountdown = async () => {
    setIsCountingDown(true);
    setCountdown(COUNTDOWN_DURATION);
    
    const coords = await getCurrentLocation();
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          confirmAlert(coords);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsCountingDown(false);
    setCountdown(COUNTDOWN_DURATION);
  };

  const confirmAlert = async (coords: { lat: number; lng: number; accuracy: number } | null) => {
    setIsCountingDown(false);
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationLat: coords?.lat,
          locationLng: coords?.lng,
          locationAccuracy: coords?.accuracy,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create alert');
      }
      
      const data = await res.json();
      setAlertId(data.alert.id);
      setIsAlertActive(true);
      setAlertStatus('pending');
      startLocationUpdates();
      
      toast({
        title: 'Emergency Alert Activated',
        description: 'Your emergency contacts have been notified.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Failed to create alert:', error);
      toast({
        title: 'Failed to Activate Alert',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async () => {
    if (!alertId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      
      if (!res.ok) throw new Error('Failed to resolve alert');
      
      setIsAlertActive(false);
      setAlertId(null);
      setAlertStatus('resolved');
      stopLocationUpdates();
      
      toast({
        title: 'Alert Resolved',
        description: 'Emergency contacts have been notified that you are safe.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast({
        title: 'Failed to Resolve',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAlert = async () => {
    if (!alertId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      
      if (!res.ok) throw new Error('Failed to cancel alert');
      
      setIsAlertActive(false);
      setAlertId(null);
      setAlertStatus('pending');
      stopLocationUpdates();
      
      toast({
        title: 'Alert Cancelled',
        description: 'Emergency contacts have been notified.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to cancel alert:', error);
      toast({
        title: 'Failed to Cancel',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoicePlay = (message: { id: string; audioUrl: string; duration: number }) => {
    if (playingVoiceId === message.id) {
      audioRefs.current[message.id]?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (playingVoiceId && audioRefs.current[playingVoiceId]) {
      audioRefs.current[playingVoiceId].pause();
    }

    let audio = audioRefs.current[message.id];
    if (!audio) {
      audio = new Audio(message.audioUrl);
      audioRefs.current[message.id] = audio;
      audio.onended = () => setPlayingVoiceId(null);
    }

    audio.play().catch(console.error);
    setPlayingVoiceId(message.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      stopLocationUpdates();
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [stopLocationUpdates]);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-watch-bg">
        <div className="watch-screen flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-watch-accent" />
          <p className="mt-4 text-watch-text/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-watch-bg">
        <div className="watch-screen flex flex-col items-center justify-center text-center p-8">
          <Shield className="h-16 w-16 text-watch-accent" />
          <h1 className="mt-4 text-2xl font-bold text-watch-text">SafeLink Watch</h1>
          <p className="mt-2 text-watch-text/60">Please sign in to use the watch interface</p>
          <Button className="mt-6" onClick={() => router.push('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-watch-bg p-4">
      <div className="watch-screen flex flex-col relative overflow-hidden">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start p-2 pointer-events-none">
          <div className="flex items-center gap-2 bg-watch-bg/80 backdrop-blur-sm rounded-full px-3 py-1 border border-watch-border">
            <Wifi className={cn('h-4 w-4', device?.isConnected ? 'text-safe' : 'text-emergency')} />
            <span className="text-xs font-mono text-watch-text">
              {device?.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-watch-bg/80 backdrop-blur-sm rounded-full px-3 py-1 border border-watch-border">
            <Battery className={cn('h-4 w-4', (device?.batteryLevel || 100) < 20 ? 'text-emergency' : 'text-watch-text')} />
            <span className="text-xs font-mono text-watch-text">{device?.batteryLevel || 100}%</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-watch-border">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="h-16 w-16 rounded-full" />
              ) : (
                <span className="text-2xl font-bold text-watch-text">{getInitials(session.user?.name || 'U')}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-watch-text">{session.user?.name || 'User'}</h1>
            <p className="text-watch-text/60">{date}</p>
          </div>

          <div className="mb-6 flex h-16 w-16 items-center justify-center">
            <span className="text-6xl font-mono font-bold tabular-nums text-watch-text">{time}</span>
          </div>

          {!isAlertActive && !isCountingDown ? (
            <div className="w-full max-w-xs">
              <AlertDialog open={isCountingDown} onOpenChange={setIsCountingDown}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Emergency Alert</AlertDialogTitle>
                    <AlertDialogDescription>
                      Press and hold the SOS button to confirm. This will immediately notify your emergency contacts
                      with your current location. You have {COUNTDOWN_DURATION} seconds to cancel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={cancelCountdown}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {}}>Confirmed</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
                <Button
                  variant="emergency"
                  size="watch"
                  className="w-full animate-pulse-ring"
                  onMouseDown={startCountdown}
                  onTouchStart={startCountdown}
                  onMouseUp={cancelCountdown}
                  onMouseLeave={cancelCountdown}
                  onTouchEnd={cancelCountdown}
                  disabled={isLoading}
                >
                  <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
                  <div className="text-center">
                    <div className="text-lg font-bold">SOS</div>
                    <div className="text-xs opacity-80">Press & Hold</div>
                  </div>
                </Button>
              </AlertDialog>
            </div>
          ) : isCountingDown ? (
            <div className="w-full max-w-xs text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-emergency animate-countdown">
                <span className="text-4xl font-bold font-mono text-emergency">{countdown}</span>
              </div>
              <p className="text-watch-text/80 mb-4">Release to cancel emergency alert</p>
              <Button variant="outline" size="lg" className="w-full" onClick={cancelCountdown}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Alert
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-4">
              <div className={cn(
                'p-4 rounded-xl text-center animate-pulse-ring',
                alertStatus === 'active' ? 'bg-emergency/20 border-2 border-emergency' :
                alertStatus === 'acknowledged' ? 'bg-yellow-500/20 border-2 border-yellow-500' :
                'bg-safe/20 border-2 border-safe'
              )}>
                <div className="text-2xl font-bold mb-1">
                  {alertStatus === 'active' && '🚨 EMERGENCY ACTIVE'}
                  {alertStatus === 'acknowledged' && '✓ HELP ACKNOWLEDGED'}
                  {alertStatus === 'resolved' && '✓ YOU ARE SAFE'}
                </div>
                <div className="text-sm text-watch-text/70">
                  {alertStatus === 'active' && 'Contacts notified • Location sharing active'}
                  {alertStatus === 'acknowledged' && 'A contact has acknowledged your alert'}
                  {alertStatus === 'resolved' && 'Emergency resolved • Location sharing stopped'}
                </div>
              </div>

              {location && (
                <div className="p-3 rounded-lg bg-watch-border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-watch-accent" />
                    <span className="text-sm font-mono text-watch-text/80">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </span>
                  </div>
                  {location.accuracy && (
                    <p className="text-xs text-watch-text/50 text-center">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  )}
                </div>
              )}

              {locationError && (
                <div className="p-3 rounded-lg bg-emergency/20 border border-emergency/50">
                  <p className="text-sm text-emergency text-center">{locationError}</p>
                </div>
              )}

              {voiceMessages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Voice Messages
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {voiceMessages.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {voiceMessages.map((message) => (
                      <div 
                        key={message.id} 
                        className={cn(
                          'p-3 rounded-lg bg-watch-border flex items-center gap-3',
                          playingVoiceId === message.id && 'ring-2 ring-emergency'
                        )}
                      >
                        <Button
                          variant={playingVoiceId === message.id ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleVoicePlay(message)}
                        >
                          {playingVoiceId === message.id ? (
                            <Volume2 className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-watch-text/70 font-medium truncate">
                            {message.sender.name || 'Contact'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-watch-text/60">{formatDuration(message.duration)}</span>
                            <div className="h-1.5 flex-1 bg-watch-text/10 rounded-full overflow-hidden">
                              {playingVoiceId === message.id && (
                                <div className="h-full bg-emergency rounded-full animate-pulse" style={{ width: '50%' }} />
                              )}
                            </div>
                          </div>
                        </div>
                        {!message.isPlayed && (
                          <Badge variant="destructive" className="text-xs">New</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant={alertStatus === 'active' ? 'destructive' : 'outline'}
                  size="lg"
                  className="flex-1"
                  onClick={alertStatus === 'active' ? cancelAlert : resolveAlert}
                  disabled={isLoading || alertStatus !== 'active'}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : alertStatus === 'active' ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Alert
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      I'm Safe
                    </>
                  )}
                </Button>
                
                {alertStatus === 'active' && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={cancelAlert}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I'm Safe
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-watch-bg/80 backdrop-blur-sm rounded-full px-3 py-1 border border-watch-border text-xs text-watch-text/70">
              <Shield className="h-3 w-3" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 bg-watch-bg/80 backdrop-blur-sm rounded-full px-3 py-1 border border-watch-border text-xs text-watch-text/70">
              <Clock className="h-3 w-3" />
              <span>Auto-resolve: 24h</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-watch-text/50 max-w-xs">
        This is a simulator. In production, this interface would run on a connected safety watch device.
      </p>
    </div>
  );
}
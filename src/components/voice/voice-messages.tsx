'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Loader2, Check, Clock, Trash2, Mic, User } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface VoiceMessage {
  id: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
  audioUrl: string;
  duration: number;
  mimeType: string;
  fileSize: number;
  transcript: string | null;
  isPlayed: boolean;
  playedAt: string | null;
  createdAt: string;
}

interface VoiceMessagesProps {
  messages: VoiceMessage[];
  currentUserId: string;
  onMarkPlayed?: (id: string) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function VoiceMessages({ 
  messages, 
  currentUserId, 
  onMarkPlayed,
  onDelete,
  canDelete = false 
}: VoiceMessagesProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (message: VoiceMessage) => {
    if (playingId === message.id) {
      // Pause
      audioRefs.current[message.id]?.pause();
      setPlayingId(null);
      return;
    }

    // Pause any currently playing
    if (playingId && audioRefs.current[playingId]) {
      audioRefs.current[playingId].pause();
    }

    setLoadingId(message.id);
    
    try {
      let audio = audioRefs.current[message.id];
      if (!audio) {
        audio = new Audio(message.audioUrl);
        audioRefs.current[message.id] = audio;
        
        audio.onended = () => {
          setPlayingId(null);
          if (!message.isPlayed && onMarkPlayed) {
            onMarkPlayed(message.id);
          }
        };
        
        audio.onerror = () => {
          setLoadingId(null);
          setPlayingId(null);
        };
      }

      await audio.play();
      setPlayingId(message.id);
      setLoadingId(null);
    } catch (err) {
      console.error('Playback error:', err);
      setLoadingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (onDelete && confirm('Delete this voice message?')) {
      onDelete(id);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  if (messages.length === 0) {
    return (
      <Card className="border-muted/50">
        <CardContent className="py-8 text-center">
          <Mic className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No voice messages yet</p>
          <p className="text-sm text-muted-foreground/70">
            Emergency contacts can send voice messages during an active alert
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Voice Messages
          <Badge variant="outline" className="ml-auto">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <div className="space-y-3 px-6 pb-6">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId;
          const isUnplayed = !message.isPlayed && !isOwn;
          
          return (
            <Card 
              key={message.id} 
              className={cn(
                'overflow-hidden',
                isOwn ? 'bg-primary/5 border-primary/20' : 'bg-muted/30',
                isUnplayed && 'ring-1 ring-emergency/30'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                    isOwn ? 'bg-primary/10 text-primary' : 'bg-emergency/10 text-emergency'
                  )}>
                    {message.sender.image ? (
                      <img src={message.sender.image} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="font-medium">{message.sender.name?.charAt(0).toUpperCase() || '?'}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isOwn ? 'You' : message.sender.name || 'Unknown'}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(message.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isUnplayed && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                        {message.isPlayed && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Played
                          </Badge>
                        )}
                        {canDelete && isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 text-muted-foreground hover:text-emergency"
                            onClick={() => handleDelete(message.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        variant={playingId === message.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 w-10"
                        onClick={() => handlePlay(message)}
                        disabled={loadingId === message.id}
                      >
                        {loadingId === message.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : playingId === message.id ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                      
                      <div className="flex-1 flex items-center gap-2">
                        <div 
                          className={cn(
                            'h-2 flex-1 max-w-xs bg-muted rounded-full overflow-hidden relative cursor-pointer',
                            playingId === message.id && 'bg-primary'
                          )}
                          onClick={() => handlePlay(message)}
                        >
                          {playingId === message.id && (
                            <div 
                              className="h-full bg-primary/50 rounded-full animate-pulse"
                              style={{ width: '50%' }}
                            />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono w-16 text-right">
                          {formatDuration(message.duration)}
                        </span>
                      </div>
                    </div>
                    
                    {message.transcript && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-sm">
                        <p className="font-medium text-muted-foreground">Transcript:</p>
                        <p className="mt-1">{message.transcript}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
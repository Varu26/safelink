'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, X, Check, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, duration: number, mimeType: string) => void;
  disabled?: boolean;
  maxDuration?: number;
}

export function VoiceRecorder({ onRecordingComplete, disabled = false, maxDuration = 60 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          onRecordingComplete(base64, recordingTime, mimeType);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Microphone access denied. Please allow microphone permission.');
    }
  }, [onRecordingComplete, maxDuration, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
    }
  }, [isRecording]);

  const discardRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (audioBlob) {
    return (
      <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">Voice Message Recorded</p>
              <p className="text-sm text-muted-foreground">{formatTime(recordingTime)} • {Math.round(audioBlob.size / 1024)} KB</p>
            </div>
          </div>
        </div>
        
        <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={discardRecording} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Re-record
          </Button>
          <Button variant="default" onClick={() => {}} className="flex-1" disabled={isProcessing}>
            <Check className="h-4 w-4 mr-2" />
            Send Voice Message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-emergency/10 border border-emergency/20 text-emergency text-sm">
          {error}
        </div>
      )}

      <Button
        variant={isRecording ? 'destructive' : 'default'}
        size="lg"
        className={cn('w-full gap-3', isRecording && 'animate-pulse-ring')}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
      >
        {isRecording ? (
          <>
            <MicOff className="h-5 w-5" />
            <div className="text-left flex-1">
              <div className="font-medium">Recording...</div>
              <div className="text-sm opacity-80 font-mono">{formatTime(recordingTime)} / {formatTime(maxDuration)}</div>
            </div>
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            <div className="text-left flex-1">
              <div className="font-medium">Send Voice Message</div>
              <div className="text-sm opacity-80">Tap to record (max {formatTime(maxDuration)})</div>
            </div>
          </>
        )}
      </Button>

      {isRecording && (
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emergency transition-all duration-100 ease-linear"
            style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
          />
        </div>
      )}

      {!isRecording && !audioBlob && (
        <p className="text-center text-sm text-muted-foreground">
          Voice messages can provide reassurance during an emergency. Max duration: {formatTime(maxDuration)}.
        </p>
      )}
    </div>
  );
}
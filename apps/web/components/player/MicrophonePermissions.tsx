import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@lxplayer/ui';

interface MicrophonePermissionsProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied: () => void;
}

export function MicrophonePermissions({ onPermissionsGranted, onPermissionsDenied }: MicrophonePermissionsProps) {
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [speakerPermission, setSpeakerPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isTesting, setIsTesting] = useState(false);
  const [testAudio, setTestAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      micStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicPermission('denied');
    }

    // Check speaker permission (we can't directly check this, so we assume it's available)
    setSpeakerPermission('granted');
  };

  const requestPermissions = async () => {
    try {
      setIsTesting(true);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setMicPermission('granted');
      
      // Test microphone
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      // Test speaker with a simple beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Clean up
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        setIsTesting(false);
        
        if (micPermission === 'granted' && speakerPermission === 'granted') {
          onPermissionsGranted();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Permission request failed:', error);
      setMicPermission('denied');
      setIsTesting(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'denied':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getPermissionText = (permission: string, type: 'mic' | 'speaker') => {
    switch (permission) {
      case 'granted':
        return type === 'mic' ? 'Mikrofon izni verildi' : 'Hoparlör erişimi mevcut';
      case 'denied':
        return type === 'mic' ? 'Mikrofon izni reddedildi' : 'Hoparlör erişimi yok';
      default:
        return type === 'mic' ? 'Mikrofon izni kontrol ediliyor...' : 'Hoparlör kontrol ediliyor...';
    }
  };

  const canProceed = micPermission === 'granted' && speakerPermission === 'granted';
  
  console.log('🎤 MicrophonePermissions state:', {
    micPermission,
    speakerPermission,
    canProceed,
    isTesting
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 rounded-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎤 Sesli Sohbet İzinleri
        </h2>
        <p className="text-gray-600">
          LLM Agent ile sesli sohbet yapabilmek için mikrofon ve hoparlör izinlerine ihtiyacımız var.
        </p>
      </div>

      <div className="space-y-6 w-full max-w-md">
        {/* Microphone Permission */}
        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex-shrink-0">
            {micPermission === 'granted' ? (
              <Mic className="w-8 h-8 text-green-500" />
            ) : (
              <MicOff className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Mikrofon</h3>
            <p className="text-sm text-gray-600">
              {getPermissionText(micPermission, 'mic')}
            </p>
          </div>
          <div className="flex-shrink-0">
            {getPermissionIcon(micPermission)}
          </div>
        </div>

        {/* Speaker Permission */}
        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex-shrink-0">
            {speakerPermission === 'granted' ? (
              <Volume2 className="w-8 h-8 text-green-500" />
            ) : (
              <VolumeX className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Hoparlör</h3>
            <p className="text-sm text-gray-600">
              {getPermissionText(speakerPermission, 'speaker')}
            </p>
          </div>
          <div className="flex-shrink-0">
            {getPermissionIcon(speakerPermission)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {!canProceed && (
            <Button
              onClick={requestPermissions}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  İzinler Test Ediliyor...
                </>
              ) : (
                'İzinleri Test Et'
              )}
            </Button>
          )}

          {canProceed && (
            <Button
              onClick={onPermissionsGranted}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Sesli Sohbete Başla
            </Button>
          )}

          <Button
            onClick={onPermissionsDenied}
            variant="outline"
            className="w-full"
          >
            İzinleri Atla
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center">
          <p>
            Mikrofon izni verilmezse sadece metin tabanlı sohbet yapabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}

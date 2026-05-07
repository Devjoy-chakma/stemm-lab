import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export interface DropRecording {
  uri: string;
  duration_seconds: number;
}

interface DropRecorderProps {
  onConfirm: (recording: DropRecording) => void;
  onDiscard: () => void;
  isReady: boolean;
}

type Mode = 'idle' | 'recording' | 'review';

const PLAYBACK_RATES = [
  { rate: 1.0, label: '1×' },
  { rate: 0.5, label: '½×' },
  { rate: 0.25, label: '¼×' },
];

export default function DropRecorder({
  onConfirm,
  onDiscard,
  isReady,
}: DropRecorderProps) {
  const { theme } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<DropRecording | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  // Playback player — only initialized when we have a recording
  const player = useVideoPlayer(recording?.uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // ---- Apply playback rate when it changes ----
  useEffect(() => {
    if (player) {
      try {
        player.playbackRate = playbackRate;
      } catch (e) {
        // player may not be ready yet
      }
    }
  }, [playbackRate, player]);

  // ---- REC pulse animation ----
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (mode === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- Permission UI ----
  if (!permission) {
    return (
      <View style={[s.placeholder, { backgroundColor: theme.colors.surface }]}>
        <Text style={{ color: theme.colors.textMuted }}>Loading camera permissions...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={[s.placeholder, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.permissionText, { color: theme.colors.text, fontSize: theme.fontSize.md }]}>
          Camera access is needed to record your parachute drop.
        </Text>
        <TouchableOpacity
          style={[s.permissionButton, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg }]}
          onPress={requestPermission}
        >
          <Text style={[s.permissionButtonText, { color: theme.colors.textOnPrimary }]}>
            Grant camera access
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Recording actions ----
  const startRecording = async () => {
    if (!cameraRef.current || mode !== 'idle') return;

    setRecording(null);
    setElapsed(0);
    setMode('recording');
    startedAtRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 100);

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 30 });
      if (timerRef.current) clearInterval(timerRef.current);

      if (result?.uri) {
        const finalElapsed = (Date.now() - startedAtRef.current) / 1000;
        setRecording({ uri: result.uri, duration_seconds: finalElapsed });
        setMode('review');
        setPlaybackRate(1.0);
      } else {
        setMode('idle');
      }
    } catch (e) {
      console.warn('Recording failed:', e);
      if (timerRef.current) clearInterval(timerRef.current);
      setMode('idle');
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && mode === 'recording') {
      cameraRef.current.stopRecording();
    }
  };

  const handleConfirm = async () => {
    if (!recording) return;
    onConfirm(recording);
    try {
      await FileSystem.deleteAsync(recording.uri, { idempotent: true });
    } catch (e) {
      console.warn('Failed to delete video:', e);
    }
    setRecording(null);
    setElapsed(0);
    setMode('idle');
    setPlaybackRate(1.0);
  };

  const handleDiscard = async () => {
    if (recording) {
      try {
        await FileSystem.deleteAsync(recording.uri, { idempotent: true });
      } catch (e) {
        console.warn('Failed to delete video:', e);
      }
    }
    setRecording(null);
    setElapsed(0);
    setMode('idle');
    setPlaybackRate(1.0);
    onDiscard();
  };

  const togglePlayback = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  // ---- Render ----
  return (
    <View style={s.container}>
      {/* Camera or video review area */}
      <View style={[s.cameraWrap, { borderRadius: theme.radius.lg }]}>
        {mode === 'review' && recording ? (
          <VideoView
            style={s.camera}
            player={player}
            contentFit="cover"
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            nativeControls={false}
          />
        ) : (
          <CameraView
            ref={cameraRef}
            style={s.camera}
            mode="video"
            facing="back"
          />
        )}

        {mode === 'recording' ? (
          <View style={[s.recBadge, { backgroundColor: theme.colors.danger }]}>
            <Animated.View
              style={[s.recDot, { backgroundColor: theme.colors.textOnPrimary, opacity: pulseAnim }]}
            />
            <Text style={[s.recText, { color: theme.colors.textOnPrimary }]}>REC</Text>
          </View>
        ) : null}

        {(mode === 'recording' || mode === 'review') ? (
          <View style={s.timeOverlay}>
            <Text style={[s.timeText, { color: theme.colors.textOnPrimary }]}>
              {(recording?.duration_seconds ?? elapsed).toFixed(2)}s
            </Text>
          </View>
        ) : null}

        {mode === 'review' ? (
          <TouchableOpacity style={s.playOverlay} onPress={togglePlayback}>
            <Ionicons
              name={player?.playing ? 'pause' : 'play'}
              size={48}
              color="#fff"
              style={{ opacity: 0.9 }}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Slow-mo controls — only in review mode */}
      {mode === 'review' ? (
        <View style={[s.rateRow, { marginTop: theme.spacing.md }]}>
          {PLAYBACK_RATES.map((r) => {
            const isActive = r.rate === playbackRate;
            return (
              <TouchableOpacity
                key={r.label}
                onPress={() => setPlaybackRate(r.rate)}
                style={[
                  s.rateBtn,
                  {
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    s.rateLabel,
                    { color: isActive ? theme.colors.textOnPrimary : theme.colors.text },
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Three-button row */}
      <View style={[s.controls, { marginTop: theme.spacing.lg }]}>
        <TouchableOpacity
          style={[
            s.smallButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: mode === 'review' ? 1 : 0.4,
            },
          ]}
          onPress={handleDiscard}
          disabled={mode !== 'review'}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
        </TouchableOpacity>

        {mode === 'recording' ? (
          <TouchableOpacity
            style={[s.recordButton, { backgroundColor: theme.colors.danger }]}
            onPress={stopRecording}
          >
            <View style={s.stopSquare} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.recordButton,
              {
                backgroundColor: theme.colors.danger,
                opacity: !isReady || mode === 'review' ? 0.4 : 1,
              },
            ]}
            onPress={startRecording}
            disabled={!isReady || mode === 'review'}
          >
            <View style={s.recordCircle} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            s.smallButton,
            {
              backgroundColor: theme.colors.success,
              borderColor: theme.colors.success,
              opacity: mode === 'review' ? 1 : 0.4,
            },
          ]}
          onPress={handleConfirm}
          disabled={mode !== 'review'}
        >
          <Ionicons name="checkmark" size={20} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {},
  cameraWrap: {
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  placeholder: {
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: { textAlign: 'center', marginBottom: 20 },
  permissionButton: { paddingHorizontal: 24, paddingVertical: 12 },
  permissionButtonText: { fontSize: 14, fontWeight: '600' },

  recBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  recText: { fontSize: 12, fontWeight: '700' },

  timeOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  rateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 54,
    alignItems: 'center',
  },
  rateLabel: { fontSize: 14, fontWeight: '600' },

  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  smallButton: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  recordButton: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  recordCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', opacity: 0.6 },
  stopSquare: { width: 26, height: 26, borderRadius: 4, backgroundColor: '#fff' },
});
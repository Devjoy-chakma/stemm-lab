import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import ActivityShell from '../components/ActivityShell';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../theme';
import { useAttemptStore, useTeamStore } from '../stores';
import { sendToLeaderboard } from '../lib/leaderboardSync';
import {
  calculateSoundPollutionResult,
  dbfsToNoiseLevel,
  SoundSample,
} from '../lib/soundPollutionScore';
import { calculateImprovement } from '../lib/parachuteScore';

const SAMPLE_DURATION_MS = 10_000; // 10 seconds per sample
const REQUIRED_SAMPLES = 3;
const METER_TICK_MS = 100;

export default function SoundPollution() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const current = useAttemptStore((s) => s.current);
  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const getPreviousAttemptForActivity = useAttemptStore((s) => s.getPreviousAttemptForActivity);

  // ---- Audio recorder ----
const recorder = useAudioRecorder({
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
});
const recorderState = useAudioRecorderState(recorder, METER_TICK_MS);

  // ---- Local state ----
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [liveDb, setLiveDb] = useState(-160);
  const [sampleCountdown, setSampleCountdown] = useState(0);
  const [samples, setSamples] = useState<SoundSample[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);

  const [writeUpText, setWriteUpTextLocal] = useState('');

  const meteringSamplesRef = useRef<number[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Capture metering values from recorder state while measuring ----
useEffect(() => {
  if (
    isMeasuring &&
    recorderState.metering !== undefined &&
    recorderState.metering !== null
  ) {
    const m = recorderState.metering;
    setLiveDb(m);
    meteringSamplesRef.current.push(m);
  }
}, [isMeasuring, recorderState.metering]);

  // ---- Init: ask permission and start attempt ----
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(status.granted);
      const teamId = team?.team_id ?? 'demo-team';
      startAttempt(teamId, 'sound');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recorderState.isRecording) {
        recorder.stop().catch(() => {});
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };

  }, []);

  // ---- Measurement actions ----
  const handleStartSample = async () => {
    if (!permissionGranted) {
      Alert.alert('Microphone needed', 'Grant microphone access in Settings to measure sound.');
      return;
    }
    try {
      meteringSamplesRef.current = [];
      setLiveDb(-160);
      setSampleCountdown(SAMPLE_DURATION_MS / 1000);
      setIsMeasuring(true);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();

      // Live countdown
      const startedAt = Date.now();
      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, (SAMPLE_DURATION_MS - (Date.now() - startedAt)) / 1000);
        setSampleCountdown(remaining);
        if (remaining <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }, METER_TICK_MS);

      // Auto-stop after sample duration
      setTimeout(async () => {
        await stopSampleAndRecord();
      }, SAMPLE_DURATION_MS);
    } catch (e) {
      console.warn('Failed to start sample:', e);
      setIsMeasuring(false);
    }
  };

  const stopSampleAndRecord = async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

try {
      await recorder.stop();
    } catch (e) {
      console.warn('Failed to stop recorder:', e);
    }

    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});

    setIsMeasuring(false);

    const collected = meteringSamplesRef.current;
    if (collected.length === 0) {
      Alert.alert('No data', 'No microphone data was captured. Try again.');
      return;
    }

    const peak_db = Math.max(...collected);
    const average_db = collected.reduce((a, b) => a + b, 0) / collected.length;
    const newSample: SoundSample = {
      peak_db,
      average_db,
      duration_seconds: SAMPLE_DURATION_MS / 1000,
    };
    setSamples((prev) => [...prev, newSample]);
  };

  // ---- Submit ----
  const handleSubmit = () => {
    const result = calculateSoundPollutionResult(samples);
    if (!result) return;

    updateRawData(result);
    setScore(result.pollution_score);
    finishAttempt();
    setSubmitted(true);
  };

  const handleTryAgain = () => {
    setSamples([]);
    setSubmitted(false);
    setSentToLeaderboard(false);
    const teamId = team?.team_id ?? 'demo-team';
    startAttempt(teamId, 'sound');
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  const handleSendToLeaderboard = async () => {
    if (!team) {
      Alert.alert('No team set', 'Set up a team first.');
      return;
    }
    if (!current) {
      Alert.alert('No attempt', 'Submit your samples first.');
      return;
    }
    setSending(true);
    try {
      await sendToLeaderboard(current, team);
      setSentToLeaderboard(true);
      Alert.alert('Sent!', 'Your score is on the leaderboard.');
    } catch (e: any) {
      Alert.alert('Send failed', e.message ?? 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  // ---- Computed ----
  const result = samples.length > 0 ? calculateSoundPollutionResult(samples) : null;
  const liveNoiseLevel = dbfsToNoiseLevel(liveDb);
  const hasAllSamples = samples.length >= REQUIRED_SAMPLES;
  const score = result?.pollution_score ?? 0;

  const previous = getPreviousAttemptForActivity('sound');
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(score, previousScore);

  const briefSpeechText =
    'Use the microphone to measure noise levels in different places. ' +
    'Take three 10-second samples in three different locations. ' +
    'Quieter places mean less sound pollution and a higher score.';

  return (
    <ActivityShell
      activity_id="sound"
      title="Sound Pollution Hunter"
      briefSpeechText={briefSpeechText}
      brief={
        <View>
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            What you'll do
          </Text>
          <Text style={[s.p, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            {briefSpeechText}
          </Text>

          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            What you need
          </Text>
          <Text style={[s.p, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            • Three different locations (e.g. bedroom, classroom, outside){'\n'}
            • Each measurement takes 10 seconds{'\n'}
            • Stay still and quiet during each sample
          </Text>
        </View>
      }
      run={
        <View>
          {permissionGranted === false ? (
            <View>
              <Text style={[s.p, { color: theme.colors.danger, fontSize: theme.fontSize.md, marginTop: theme.spacing.md }]}>
                Microphone access is needed for this activity. Please grant access in Settings.
              </Text>
            </View>
          ) : (
            <View>
              {/* Live meter */}
              <View
                style={[
                  s.meter,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderRadius: theme.radius.lg,
                    height: 24,
                    overflow: 'hidden',
                  },
                ]}
              >
                <View
                  style={{
                    backgroundColor:
                      liveNoiseLevel < 25
                        ? theme.colors.success
                        : liveNoiseLevel < 50
                          ? theme.colors.accent
                          : liveNoiseLevel < 75
                            ? theme.colors.warning
                            : theme.colors.danger,
                    height: '100%',
                    width: `${liveNoiseLevel}%`,
                  }}
                />
              </View>
              <Text
                style={[
                  s.liveLabel,
                  { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs },
                ]}
              >
                LIVE NOISE LEVEL — {liveNoiseLevel}/100
              </Text>

              {/* Sample state */}
              <Text
                style={[
                  s.h,
                  {
                    color: theme.colors.primary,
                    fontSize: theme.fontSize.xl,
                    marginTop: theme.spacing.xl,
                  },
                ]}
              >
                Sample {Math.min(samples.length + 1, REQUIRED_SAMPLES)} of {REQUIRED_SAMPLES}
              </Text>

              {isMeasuring ? (
                <View>
                  <Text
                    style={[
                      s.countdown,
                      { color: theme.colors.danger, fontSize: 56, marginTop: theme.spacing.md },
                    ]}
                  >
                    {sampleCountdown.toFixed(1)}s
                  </Text>
                  <Text
                    style={[
                      s.p,
                      { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center' },
                    ]}
                  >
                    Hold still — measuring...
                  </Text>
                </View>
              ) : !hasAllSamples ? (
                <TouchableOpacity
                  style={[
                    s.button,
                    {
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radius.lg,
                      paddingVertical: theme.spacing.md,
                      marginTop: theme.spacing.md,
                    },
                  ]}
                  onPress={handleStartSample}
                >
                  <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                    Start 10-second sample
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Recorded samples */}
              {samples.length > 0 ? (
                <View style={{ marginTop: theme.spacing.lg }}>
                  <Text
                    style={[
                      s.h,
                      { color: theme.colors.primary, fontSize: theme.fontSize.lg },
                    ]}
                  >
                    Captured samples
                  </Text>
                  {samples.map((sample, i) => (
                    <Text
                      key={i}
                      style={[
                        s.p,
                        {
                          color: theme.colors.text,
                          fontSize: theme.fontSize.md,
                          marginTop: theme.spacing.xs,
                        },
                      ]}
                    >
                      Sample {i + 1}: avg {dbfsToNoiseLevel(sample.average_db)}/100, peak{' '}
                      {dbfsToNoiseLevel(sample.peak_db)}/100
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* Submit */}
              {hasAllSamples && !submitted ? (
                <TouchableOpacity
                  style={[
                    s.button,
                    {
                      backgroundColor: theme.colors.success,
                      borderRadius: theme.radius.lg,
                      paddingVertical: theme.spacing.md,
                      marginTop: theme.spacing.xl,
                    },
                  ]}
                  onPress={handleSubmit}
                >
                  <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                    Submit & see results
                  </Text>
                </TouchableOpacity>
              ) : null}

              {submitted ? (
                <Text
                  style={[
                    s.p,
                    {
                      color: theme.colors.textMuted,
                      fontSize: theme.fontSize.sm,
                      marginTop: theme.spacing.lg,
                      textAlign: 'center',
                    },
                  ]}
                >
                  Submitted. Tap the Results tab to see your score.
                </Text>
              ) : null}
            </View>
          )}
        </View>
      }
      results={
        <View>
          {!submitted || !result ? (
            <Text
              style={[
                s.p,
                { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
              ]}
            >
              Capture {REQUIRED_SAMPLES} samples on the Run tab and tap Submit first.
            </Text>
          ) : (
            <View>
              <Text
                style={[
                  s.h,
                  {
                    color: theme.colors.primary,
                    fontSize: theme.fontSize.xxl,
                    textAlign: 'center',
                    marginTop: theme.spacing.lg,
                  },
                ]}
              >
                Nice work!
              </Text>
              <Text
                style={[
                  s.p,
                  {
                    color: theme.colors.textMuted,
                    fontSize: theme.fontSize.sm,
                    textAlign: 'center',
                    marginTop: theme.spacing.xs,
                  },
                ]}
              >
                Quietness score · {team?.team_name ?? 'Your team'}
              </Text>

              <Text style={[s.bigScore, { color: theme.colors.success, marginTop: theme.spacing.md }]}>
                {result.pollution_score}
              </Text>

              {improvement !== null ? (
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: improvement >= 0 ? theme.colors.success : theme.colors.warning,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      alignSelf: 'center',
                      marginTop: theme.spacing.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeText,
                      { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.sm },
                    ]}
                  >
                    {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement)}%{' '}
                    {improvement >= 0 ? 'better than' : 'compared to'} last attempt
                  </Text>
                </View>
              ) : null}

              <View style={[s.cards, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
                <MetricCard label="Noise level" value={String(result.noise_level)} unit="/100" />
                <MetricCard label="Category" value={result.category.replace('_', ' ')} />
                <MetricCard label="Samples taken" value={String(result.samples.length)} />
              </View>

              {!sentToLeaderboard ? (
                <TouchableOpacity
                  style={[
                    s.cta,
                    {
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radius.lg,
                      paddingVertical: theme.spacing.md,
                      marginTop: theme.spacing.lg,
                      opacity: sending ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleSendToLeaderboard}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color={theme.colors.textOnPrimary} />
                  ) : (
                    <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                      Send to leaderboard 🏆
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text
                  style={[
                    s.p,
                    {
                      color: theme.colors.success,
                      textAlign: 'center',
                      marginTop: theme.spacing.lg,
                      fontSize: theme.fontSize.md,
                    },
                  ]}
                >
                  ✓ Sent to leaderboard
                </Text>
              )}

              <TouchableOpacity onPress={handleTryAgain} style={{ marginTop: theme.spacing.md }}>
                <Text
                  style={[
                    s.p,
                    {
                      color: theme.colors.primarySoft,
                      fontSize: theme.fontSize.sm,
                      textAlign: 'center',
                      textDecorationLine: 'underline',
                    },
                  ]}
                >
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      }
      writeUp={
        <View>
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Reflection
          </Text>
          <Text
            style={[
              s.p,
              { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
            ]}
          >
            Where was the loudest place? The quietest? Why might that be?
          </Text>

          <TextInput
            style={[
              s.textarea,
              {
                borderColor: theme.colors.borderStrong,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                padding: theme.spacing.sm,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.md,
              },
            ]}
            value={writeUpText}
            onChangeText={handleWriteUpChange}
            multiline
            numberOfLines={6}
            placeholder="Type your reflection here..."
            placeholderTextColor={theme.colors.textMuted}
            textAlignVertical="top"
          />
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  h: { fontWeight: '700' },
  p: { lineHeight: 22 },
  meter: { width: '100%' },
  liveLabel: { fontWeight: '600', letterSpacing: 1 },
  countdown: { fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  button: { alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  bigScore: { fontSize: 96, fontWeight: '700', textAlign: 'center' },
  badge: {},
  badgeText: { fontWeight: '700' },
  cards: { flexDirection: 'column' },
  cta: { alignItems: 'center' },
  textarea: { borderWidth: 1, minHeight: 140 },
});
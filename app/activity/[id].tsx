import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ActivityShell from '../../src/components/ActivityShell';
import DropRecorder, { DropRecording } from '../../src/components/recorder/DropRecorder';
import MetricCard from '../../src/components/MetricCard';
import { useTheme } from '../../src/theme';
import { useAttemptStore, useTeamStore } from '../../src/stores';
import { sendToLeaderboard } from '../../src/lib/leaderboardSync';
import { calculateParachuteResult, calculateImprovement } from '../../src/lib/parachuteScore';


export default function ActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const current = useAttemptStore((s) => s.current);
  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const getPreviousAttemptForActivity = useAttemptStore((s) => s.getPreviousAttemptForActivity);

  const [dropHeight, setDropHeight] = useState<string>('2');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [writeUpText, setWriteUpTextLocal] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);

  useEffect(() => {
    const teamId = team?.team_id ?? 'demo-team';
    startAttempt(teamId, id ?? 'parachute');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Recording handlers ----
  const handleRecordingConfirmed = (recording: DropRecording) => {
    setAttempts((prev) => [...prev, recording.duration_seconds]);
  };

  const handleRecordingDiscarded = () => {};

  // ---- Submit ----
const handleSubmit = () => {
  const heightNum = parseFloat(dropHeight) || 0;
  const result = calculateParachuteResult(heightNum, attempts);
  if (!result) return;

  updateRawData({ heightNum, attempts, ...result });
  setScore(result.dragScore);
  finishAttempt();
  setSubmitted(true);
};

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  const handleTryAgain = () => {
    setAttempts([]);
    setSubmitted(false);
    setSentToLeaderboard(false);
    const teamId = team?.team_id ?? 'demo-team';
    startAttempt(teamId, id ?? 'parachute');
  };

  const handleSendToLeaderboard = async () => {
    if (!team) {
      Alert.alert('No team set', 'Set up a team first before sending.');
      return;
    }
    if (!current) {
      Alert.alert('No attempt', 'Submit your drops before sending.');
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

  // ---- Computed values ----
const heightNum = parseFloat(dropHeight) || 0;
const hasAllAttempts = attempts.length >= 3;

const computed = calculateParachuteResult(heightNum, attempts);
const avgTime = computed?.avgTime ?? 0;
const velocity = computed?.velocity ?? 0;
const gForce = computed?.gForce ?? 0;
const dragForce = computed?.dragForce ?? 0;
const dragScore = computed?.dragScore ?? 0;

// Comparison to previous attempt
const previous = getPreviousAttemptForActivity(id ?? 'parachute');
const previousScore = previous?.score ?? null;
const improvement = calculateImprovement(dragScore, previousScore);

  const briefSpeechText =
    'Build a parachute and drop it from a measured height. ' +
    'Record the drop with the camera. ' +
    'Try three drops to see how consistent your parachute is.';

  const heightIsValid = heightNum > 0;

  return (
    <ActivityShell
      activity_id={id ?? 'parachute'}
      title="Parachute Drop"
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
            • Plastic bag or cloth{'\n'}
            • String{'\n'}
            • A small weight (toy figure){'\n'}
            • Tape{'\n'}
            • A clear measured drop height
          </Text>
        </View>
      }
      run={
        <View>
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Drop height
          </Text>
          <View style={[s.row, { marginTop: theme.spacing.sm }]}>
            <TextInput
              style={[
                s.input,
                {
                  borderColor: theme.colors.borderStrong,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.sm,
                  fontSize: theme.fontSize.md,
                  width: 100,
                },
              ]}
              value={dropHeight}
              onChangeText={setDropHeight}
              keyboardType="decimal-pad"
              placeholder="2.0"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={[s.unit, { color: theme.colors.text, fontSize: theme.fontSize.md, marginLeft: theme.spacing.sm }]}>
              meters
            </Text>
          </View>

          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.xl }]}>
            Attempt {Math.min(attempts.length + 1, 3)} of 3
          </Text>

          {!hasAllAttempts ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <DropRecorder
                onConfirm={handleRecordingConfirmed}
                onDiscard={handleRecordingDiscarded}
                isReady={heightIsValid}
              />
            </View>
          ) : (
            <Text style={[s.p, { color: theme.colors.success, fontSize: theme.fontSize.lg, marginTop: theme.spacing.md, textAlign: 'center' }]}>
              All 3 drops recorded ✓
            </Text>
          )}

          {attempts.length > 0 ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.lg }]}>
                Recorded attempts
              </Text>
              {attempts.map((t, i) => (
                <Text
                  key={i}
                  style={[s.p, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.xs }]}
                >
                  Drop {i + 1}: {t.toFixed(2)} s
                </Text>
              ))}
            </View>
          ) : null}

          {hasAllAttempts && !submitted ? (
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
            <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.lg, textAlign: 'center' }]}>
              Submitted. Tap the Results tab to see your score.
            </Text>
          ) : null}
        </View>
      }
      results={
        <View>
          {!submitted ? (
            <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.md }]}>
              Complete 3 drops on the Run tab and tap Submit first.
            </Text>
          ) : (
            <View>
              {/* Heading */}
              <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xxl, textAlign: 'center', marginTop: theme.spacing.lg }]}>
                Nice work!
              </Text>
              <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.xs }]}>
                Drag score · {team?.team_name ?? 'Your team'}
              </Text>

              <Text style={[s.bigScore, { color: theme.colors.success, marginTop: theme.spacing.md }]}>
                {dragScore}
              </Text>

              {/* Comparison badge */}
              {improvement !== null ? (
                <View
                  style={[
                    s.improvementBadge,
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
                  <Text style={[s.improvementText, { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.sm }]}>
                    {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement)}% {improvement >= 0 ? 'better than' : 'compared to'} last attempt
                  </Text>
                </View>
              ) : null}

              {/* Metric cards */}
              <View style={[s.cards, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
                <MetricCard label="Impact velocity" value={velocity.toFixed(2)} unit="m/s" />
                <MetricCard label="G-force" value={gForce.toFixed(2)} unit="g" />
                <MetricCard label="Drag force" value={dragForce.toFixed(2)} unit="N" />
              </View>

              {/* Send to leaderboard CTA */}
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
                <Text style={[s.p, { color: theme.colors.success, textAlign: 'center', marginTop: theme.spacing.lg, fontSize: theme.fontSize.md }]}>
                  ✓ Sent to leaderboard
                </Text>
              )}

              {/* Try again link */}
              <TouchableOpacity onPress={handleTryAgain} style={{ marginTop: theme.spacing.md }}>
                <Text style={[s.p, { color: theme.colors.primarySoft, fontSize: theme.fontSize.sm, textAlign: 'center', textDecorationLine: 'underline' }]}>
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
          <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs }]}>
            What did you observe? What would you change about your parachute?
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
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, textAlign: 'center' },
  unit: { fontWeight: '500' },
  bigScore: { fontSize: 96, fontWeight: '700', textAlign: 'center' },
  improvementBadge: {},
  improvementText: { fontWeight: '700' },
  cards: { flexDirection: 'column' },
  cta: { alignItems: 'center' },
  button: { alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  textarea: { borderWidth: 1, minHeight: 140 },
});
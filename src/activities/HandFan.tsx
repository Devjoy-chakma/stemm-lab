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
import ActivityShell from '../components/ActivityShell';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../theme';
import { useAttemptStore, useTeamStore } from '../stores';
import { sendToLeaderboard } from '../lib/leaderboardSync';
import { calculateHandFanResult } from '../lib/handFanScore';
import { calculateImprovement } from '../lib/parachuteScore';

export default function HandFan() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const current = useAttemptStore((s) => s.current);
  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const getPreviousAttemptForActivity = useAttemptStore((s) => s.getPreviousAttemptForActivity);

  // ---- Run state ----
  const [fanCount, setFanCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Write-up + submit state ----
  const [writeUpText, setWriteUpTextLocal] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);

  useEffect(() => {
    const teamId = team?.team_id ?? 'demo-team';
    startAttempt(teamId, 'hand-fan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Timer effect ----
  useEffect(() => {
    if (startedAt !== null && !completed) {
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startedAt) / 1000);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, completed]);

  // ---- Run actions ----
  const handleStart = () => {
    setFanCount(0);
    setElapsed(0);
    setCompleted(false);
    setStartedAt(Date.now());
  };

  const handleFanTap = () => {
    if (startedAt !== null && !completed) {
      setFanCount((c) => c + 1);
    }
  };

  const handleStop = () => {
    if (startedAt === null) return;
    const final = (Date.now() - startedAt) / 1000;
    setElapsed(final);
    setCompleted(true);
    setStartedAt(null);
  };

  const handleReset = () => {
    setFanCount(0);
    setElapsed(0);
    setCompleted(false);
    setStartedAt(null);
  };

  // ---- Submit ----
  const handleSubmit = () => {
    const result = calculateHandFanResult(fanCount, elapsed);
    if (!result) return;

    updateRawData(result);
    setScore(result.efficiency_score);
    finishAttempt();
    setSubmitted(true);
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  const handleTryAgain = () => {
    handleReset();
    setSubmitted(false);
    setSentToLeaderboard(false);
    const teamId = team?.team_id ?? 'demo-team';
    startAttempt(teamId, 'hand-fan');
  };

  const handleSendToLeaderboard = async () => {
    if (!team) {
      Alert.alert('No team set', 'Set up a team first.');
      return;
    }
    if (!current) {
      Alert.alert('No attempt', 'Submit your run first.');
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
  const result = calculateHandFanResult(fanCount, elapsed);
  const score = result?.efficiency_score ?? 0;
  const fansPerSecond = result?.fans_per_second ?? 0;
  const isRunning = startedAt !== null && !completed;
  const canSubmit = completed && fanCount > 0;

  // Comparison
  const previous = getPreviousAttemptForActivity('hand-fan');
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(score, previousScore);

  const briefSpeechText =
    'Build a hand fan from paper. ' +
    'Use it to fan a balloon across a measured distance. ' +
    'Count how many fan motions it takes. Fewer, slower fans = better design.';

  return (
    <ActivityShell
      activity_id="hand-fan"
      title="Hand Fan Challenge"
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
            • Paper or thin cardboard{'\n'}
            • Tape or glue{'\n'}
            • A balloon (or paper ball){'\n'}
            • A clear floor space, ~2 metres
          </Text>
        </View>
      }
      run={
        <View>
          {/* Live counters */}
          <View style={[s.statsRow, { marginBottom: theme.spacing.md }]}>
            <View style={s.statBox}>
              <Text style={[s.statLabel, { color: theme.colors.textMuted, fontSize: theme.fontSize.xs }]}>
                FANS
              </Text>
              <Text style={[s.statValue, { color: theme.colors.primary, fontSize: 56 }]}>
                {fanCount}
              </Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statLabel, { color: theme.colors.textMuted, fontSize: theme.fontSize.xs }]}>
                TIME
              </Text>
              <Text style={[s.statValue, { color: theme.colors.primary, fontSize: 56 }]}>
                {elapsed.toFixed(1)}
                <Text style={{ fontSize: theme.fontSize.lg }}>s</Text>
              </Text>
            </View>
          </View>

          {/* Big tap area */}
          {isRunning ? (
            <TouchableOpacity
              activeOpacity={0.6}
              style={[
                s.tapArea,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.xl,
                },
              ]}
              onPress={handleFanTap}
            >
              <Text style={[s.tapText, { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.hero }]}>
                FAN!
              </Text>
              <Text style={[s.tapSubtext, { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.sm }]}>
                Tap each fan motion
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Start / Stop / Reset controls */}
          {!isRunning && !completed ? (
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
              onPress={handleStart}
            >
              <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                Start fanning
              </Text>
            </TouchableOpacity>
          ) : null}

          {isRunning ? (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.danger,
                  borderRadius: theme.radius.lg,
                  paddingVertical: theme.spacing.md,
                  marginTop: theme.spacing.md,
                },
              ]}
              onPress={handleStop}
            >
              <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                Reached the line — stop
              </Text>
            </TouchableOpacity>
          ) : null}

          {completed && !submitted ? (
            <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
              <Text style={[s.p, { color: theme.colors.success, fontSize: theme.fontSize.md, textAlign: 'center' }]}>
                {fanCount} fans in {elapsed.toFixed(1)}s
              </Text>
              <TouchableOpacity
                style={[
                  s.button,
                  {
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.radius.lg,
                    paddingVertical: theme.spacing.md,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                  Submit & see results
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset} style={{ paddingVertical: theme.spacing.sm }}>
                <Text style={[s.p, { color: theme.colors.primarySoft, fontSize: theme.fontSize.sm, textAlign: 'center', textDecorationLine: 'underline' }]}>
                  Reset and try again
                </Text>
              </TouchableOpacity>
            </View>
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
              Complete a run on the Run tab and tap Submit first.
            </Text>
          ) : (
            <View>
              <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xxl, textAlign: 'center', marginTop: theme.spacing.lg }]}>
                Nice work!
              </Text>
              <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.xs }]}>
                Efficiency score · {team?.team_name ?? 'Your team'}
              </Text>

              <Text style={[s.bigScore, { color: theme.colors.success, marginTop: theme.spacing.md }]}>
                {score}
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
                  <Text style={[s.badgeText, { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.sm }]}>
                    {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement)}% {improvement >= 0 ? 'better than' : 'compared to'} last attempt
                  </Text>
                </View>
              ) : null}

              <View style={[s.cards, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
                <MetricCard label="Total fans" value={String(fanCount)} />
                <MetricCard label="Duration" value={elapsed.toFixed(2)} unit="s" />
                <MetricCard label="Fans per second" value={fansPerSecond.toFixed(2)} unit="/s" />
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
                <Text style={[s.p, { color: theme.colors.success, textAlign: 'center', marginTop: theme.spacing.lg, fontSize: theme.fontSize.md }]}>
                  ✓ Sent to leaderboard
                </Text>
              )}

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
            What worked? What would you change about your fan design?
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontWeight: '600', letterSpacing: 1 },
  statValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  tapArea: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapText: { fontWeight: '700', letterSpacing: 2 },
  tapSubtext: { marginTop: 6, opacity: 0.85 },
  button: { alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  bigScore: { fontSize: 96, fontWeight: '700', textAlign: 'center' },
  badge: {},
  badgeText: { fontWeight: '700' },
  cards: { flexDirection: 'column' },
  cta: { alignItems: 'center' },
  textarea: { borderWidth: 1, minHeight: 140 },
});
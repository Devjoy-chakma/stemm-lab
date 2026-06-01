import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ActivityShell from "../components/ActivityShell";
import MetricCard from "../components/MetricCard";

import {
  calculateHumanPerformanceResult,
  HumanPerformanceResult,
} from "../lib/humanPerformanceScore";
import { sendToLeaderboard } from "../lib/leaderboardSync";
import { calculateImprovement } from "../lib/parachuteScore";
import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

const SESSION_DURATION_MS = 12_000;
const HALF_CYCLE_MS = 2_000;       // 2 s grow + 2 s shrink = one cycle
const CYCLE_DURATION_MS = HALF_CYCLE_MS * 2;
const TOTAL_CYCLES = SESSION_DURATION_MS / CYCLE_DURATION_MS;
const ACCEL_SAMPLE_INTERVAL_MS = 100;
const COUNTDOWN_TICK_MS = 100;

export default function HumanPerformance() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const current = useAttemptStore((s) => s.current);
  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const getPreviousAttemptForActivity = useAttemptStore(
    (s) => s.getPreviousAttemptForActivity
  );

  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    SESSION_DURATION_MS / 1000
  );
  const [result, setResult] = useState<HumanPerformanceResult | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);
  const [writeUpText, setWriteUpTextLocal] = useState("");

  const magnitudesRef = useRef<number[]>([]);
  const sessionStartedAtRef = useRef(0);
  const guideAnim = useRef(new Animated.Value(0)).current;
  const guideLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ---- Init / cleanup ----
  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "human-perf");
    return () => {
      if (guideLoopRef.current) guideLoopRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Accelerometer subscription (active only while running) ----
  useEffect(() => {
    if (!isRunning) return;
    Accelerometer.setUpdateInterval(ACCEL_SAMPLE_INTERVAL_MS);
    const sub = Accelerometer.addListener((data) => {
      const mag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      magnitudesRef.current.push(mag);
    });
    return () => sub.remove();
  }, [isRunning]);

  // ---- Countdown using wall-clock time (drift-free) ----
  useEffect(() => {
    if (!isRunning) return;
    sessionStartedAtRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartedAtRef.current;
      const remaining = Math.max(
        0,
        (SESSION_DURATION_MS - elapsed) / 1000
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finishSession();
      }
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ---- Guide animation (pulsing circle) ----
  useEffect(() => {
    if (!isRunning) {
      if (guideLoopRef.current) guideLoopRef.current.stop();
      return;
    }
    guideAnim.setValue(0);
    guideLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(guideAnim, {
          toValue: 1,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(guideAnim, {
          toValue: 0,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
      { iterations: TOTAL_CYCLES }
    );
    guideLoopRef.current.start();
    return () => {
      if (guideLoopRef.current) guideLoopRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ---- Session control ----
  const startSession = () => {
    magnitudesRef.current = [];
    setResult(null);
    setSecondsLeft(SESSION_DURATION_MS / 1000);
    setIsRunning(true);
  };

  const finishSession = () => {
    setIsRunning(false);
    const r = calculateHumanPerformanceResult(magnitudesRef.current);
    setResult(r);
    if (!r) return;

    updateRawData({
      acceleration_magnitudes: magnitudesRef.current,
      average_jerk: r.average_jerk,
      range_of_motion: r.range_of_motion,
      smoothness_score: r.smoothness_score,
      performance_level: r.performance_level,
      samples_collected: r.samples_collected,
      duration_ms: SESSION_DURATION_MS,
      total_cycles: TOTAL_CYCLES,
    });
    setScore(r.smoothness_score);
    finishAttempt();
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleTryAgain = () => {
    setResult(null);
    setSubmitted(false);
    setSending(false);
    setSentToLeaderboard(false);
    setIsRunning(false);
    setSecondsLeft(SESSION_DURATION_MS / 1000);
    setWriteUpTextLocal("");
    setWriteUp("");
    magnitudesRef.current = [];
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "human-perf");
  };

  const handleSendToLeaderboard = async () => {
    if (!team) {
      Alert.alert("No team set", "Set up a team first.");
      return;
    }
    if (!current) {
      Alert.alert("No attempt", "Submit your run first.");
      return;
    }
    setSending(true);
    try {
      await sendToLeaderboard(current, team);
      setSentToLeaderboard(true);
      Alert.alert("Sent!", "Your score is on the leaderboard.");
    } catch (e: any) {
      Alert.alert("Send failed", e.message ?? "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  // ---- Computed ----
  const smoothnessScore = result?.smoothness_score ?? 0;

  const previous = getPreviousAttemptForActivity("human-perf");
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(smoothnessScore, previousScore);

  const briefSpeechText =
    "Hold the phone in one hand and follow the pulsing dot. " +
    "Raise your arm as the dot grows, lower it as the dot shrinks. " +
    "Move smoothly — jerky motion lowers your score.";

  // The animated dot scales from 0.5× to 1.5× over each half-cycle.
  const dotScale = guideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.5],
  });

  return (
    <ActivityShell
      activity_id="human-perf"
      title="Human Performance Lab"
      briefSpeechText={briefSpeechText}
      brief={
        <View>
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            What you&apos;ll do
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            {briefSpeechText}
          </Text>

          <Text
            style={[
              s.h,
              {
                color: theme.colors.primary,
                fontSize: theme.fontSize.xl,
                marginTop: theme.spacing.lg,
              },
            ]}
          >
            How scoring works
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            The phone&apos;s accelerometer records how steady your motion is.
            Smooth, even movement scores higher than jerky stop-start motion.
            We also show the range of your movement.
          </Text>

          <Text
            style={[
              s.h,
              {
                color: theme.colors.primary,
                fontSize: theme.fontSize.xl,
                marginTop: theme.spacing.lg,
              },
            ]}
          >
            What you need
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            • Open space to move your arm safely{"\n"}
            • Hold the phone firmly{"\n"}
            • {SESSION_DURATION_MS / 1000} seconds, {TOTAL_CYCLES} arm-raise cycles
          </Text>
        </View>
      }
      run={
        <View>
          {isRunning ? (
            <View style={s.center}>
              <Animated.View
                style={[
                  s.guideDot,
                  {
                    backgroundColor: theme.colors.primarySoft,
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
              <Text
                style={[
                  s.timer,
                  {
                    color: theme.colors.primary,
                    marginTop: theme.spacing.xl,
                  },
                ]}
              >
                {secondsLeft.toFixed(1)}s
              </Text>
              <Text
                style={[
                  s.p,
                  {
                    color: theme.colors.textMuted,
                    fontSize: theme.fontSize.md,
                    marginTop: theme.spacing.sm,
                    textAlign: "center",
                  },
                ]}
              >
                Move with the dot — smoothly, no sudden stops
              </Text>
            </View>
          ) : !result ? (
            <View>
              <Text
                style={[
                  s.p,
                  {
                    color: theme.colors.text,
                    fontSize: theme.fontSize.md,
                    marginTop: theme.spacing.sm,
                  },
                ]}
              >
                Get ready to raise and lower your arm in sync with the pulsing dot.
                Move smoothly; jerky stops lower your score.
              </Text>
              <TouchableOpacity
                style={[
                  s.button,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.lg,
                    marginTop: theme.spacing.xl,
                  },
                ]}
                onPress={startSession}
              >
                <Text
                  style={[s.buttonText, { color: theme.colors.textOnPrimary }]}
                >
                  Start session
                </Text>
              </TouchableOpacity>
            </View>
          ) : !submitted ? (
            <View>
              <Text
                style={[
                  s.p,
                  {
                    color: theme.colors.success,
                    fontSize: theme.fontSize.md,
                    textAlign: "center",
                    marginTop: theme.spacing.md,
                  },
                ]}
              >
                ✓ Session complete — smoothness score {result.smoothness_score}
              </Text>
              <TouchableOpacity
                style={[
                  s.button,
                  {
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.radius.lg,
                    marginTop: theme.spacing.lg,
                  },
                ]}
                onPress={handleSubmit}
              >
                <Text
                  style={[s.buttonText, { color: theme.colors.textOnPrimary }]}
                >
                  Submit &amp; see results
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={[
                s.p,
                {
                  color: theme.colors.textMuted,
                  fontSize: theme.fontSize.sm,
                  marginTop: theme.spacing.lg,
                  textAlign: "center",
                },
              ]}
            >
              Submitted. Tap the Results tab to see your score.
            </Text>
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
              Complete the motion session on the Run tab and tap Submit first.
            </Text>
          ) : (
            <View>
              <Text
                style={[
                  s.h,
                  {
                    color: theme.colors.primary,
                    fontSize: theme.fontSize.xxl,
                    textAlign: "center",
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
                    textAlign: "center",
                    marginTop: theme.spacing.xs,
                  },
                ]}
              >
                Smoothness score · {team?.team_name ?? "Your team"}
              </Text>

              <Text
                style={[
                  s.bigScore,
                  {
                    color: theme.colors.success,
                    marginTop: theme.spacing.md,
                  },
                ]}
              >
                {smoothnessScore}
              </Text>

              {improvement !== null ? (
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor:
                        improvement >= 0
                          ? theme.colors.success
                          : theme.colors.warning,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      alignSelf: "center",
                      marginTop: theme.spacing.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeText,
                      {
                        color: theme.colors.textOnPrimary,
                        fontSize: theme.fontSize.sm,
                      },
                    ]}
                  >
                    {improvement >= 0 ? "↑" : "↓"} {Math.abs(improvement)}%{" "}
                    {improvement >= 0 ? "better than" : "compared to"} last attempt
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  s.cards,
                  { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
                ]}
              >
                <MetricCard
                  label="Smoothness"
                  value={String(result.smoothness_score)}
                  unit="/100"
                />
                <MetricCard
                  label="Average jerk"
                  value={result.average_jerk.toFixed(3)}
                />
                <MetricCard
                  label="Range of motion"
                  value={result.range_of_motion.toFixed(3)}
                />
                <MetricCard
                  label="Performance"
                  value={result.performance_level}
                />
                <MetricCard
                  label="Samples"
                  value={String(result.samples_collected)}
                />
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
                    <Text
                      style={[
                        s.buttonText,
                        { color: theme.colors.textOnPrimary },
                      ]}
                    >
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
                      textAlign: "center",
                      marginTop: theme.spacing.lg,
                      fontSize: theme.fontSize.md,
                    },
                  ]}
                >
                  ✓ Sent to leaderboard
                </Text>
              )}

              <TouchableOpacity
                onPress={handleTryAgain}
                style={{ marginTop: theme.spacing.md }}
              >
                <Text
                  style={[
                    s.p,
                    {
                      color: theme.colors.primarySoft,
                      fontSize: theme.fontSize.sm,
                      textAlign: "center",
                      textDecorationLine: "underline",
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
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            Reflection
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.textMuted,
                fontSize: theme.fontSize.sm,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            Which movements were easiest to keep smooth? Did your speed change as
            you got tired? Was your range of motion bigger or smaller than you
            expected?
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
  h: { fontWeight: "700" },
  p: { lineHeight: 22 },
  center: { alignItems: "center", marginTop: 30 },
  guideDot: {
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  timer: {
    fontSize: 56,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  button: { alignItems: "center", paddingVertical: 16 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  bigScore: { fontSize: 96, fontWeight: "700", textAlign: "center" },
  badge: {},
  badgeText: { fontWeight: "700" },
  cards: { flexDirection: "column" },
  cta: { alignItems: "center" },
  textarea: { borderWidth: 1, minHeight: 140 },
});

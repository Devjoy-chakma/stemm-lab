import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ActivityShell from "../components/ActivityShell";
import MetricCard from "../components/MetricCard";

import { haptic } from "../lib/haptics";
import { sendToLeaderboard } from "../lib/leaderboardSync";
import { getCurrentLocationOrNull } from "../lib/location";
import { notifyActivityScored } from "../lib/notifications";
import { calculateImprovement } from "../lib/parachuteScore";
import { calculateReactionBoardResult } from "../lib/reactionScore";
import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

//const TOTAL_ROUNDS = 3;
const TOTAL_ROUNDS = 2; // Reduced from 3 rounds to 2 round for demo purpose

const INTER_ROUND_DELAY_MS = 1000;
const MIN_PROMPT_DELAY_MS = 1000;
const MAX_PROMPT_DELAY_MS = 3000;

const TRACING_AREA_HEIGHT = 220;
const DOT_SIZE = 64;
//const TRACING_DURATION_MS = 8000;
const TRACING_DURATION_MS = 4000; // Reduced from 8 seconds to 4 seconds for demo purposes
const TRACING_SAMPLE_MS = 100;
const TRACING_OFFSCREEN_PENALTY_PX = 200;

type Phase = 1 | 2 | 3;
type PhaseStatus = "pending" | "running" | "done";

export default function ReactionBoard() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const current = useAttemptStore((s) => s.current);
  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const setLocation = useAttemptStore((s) => s.setLocation);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const getPreviousAttemptForActivity = useAttemptStore(
    (s) => s.getPreviousAttemptForActivity
  );

  // ---- Phase state ----
  const [phase, setPhase] = useState<Phase>(1);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>("pending");

  // ---- Reaction-phase (1 & 2) state ----
  const [round, setRound] = useState(1);
  const [waitingForTap, setWaitingForTap] = useState(false);
  const [showTap, setShowTap] = useState(false);
  const [phase1Times, setPhase1Times] = useState<number[]>([]);
  const [phase2Times, setPhase2Times] = useState<number[]>([]);

  const startTimeRef = useRef(0);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ---- Tracing-phase (3) state ----
  const [phase3Deviations, setPhase3Deviations] = useState<number[]>([]);
  const [tracingAreaWidth, setTracingAreaWidth] = useState(0);
  const [tracingSecondsLeft, setTracingSecondsLeft] = useState(
    TRACING_DURATION_MS / 1000
  );

  const dotXAnim = useRef(new Animated.Value(0)).current;
  const dotXRef = useRef(0);
  const fingerXRef = useRef(0);
  const fingerYRef = useRef(0);
  const fingerActiveRef = useRef(false);
  const deviationsRef = useRef<number[]>([]);
  const sampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const tracingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const tracingCountdownRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const dotListenerIdRef = useRef<string | null>(null);

  // ---- Submit state ----
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);
  const [writeUpText, setWriteUpTextLocal] = useState("");

  // ---- Mount + cleanup ----
  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "reaction");
    getCurrentLocationOrNull().then((loc) => {
      if (loc) setLocation(loc.lat, loc.lng);
    });

    return () => {
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      if (interRoundTimeoutRef.current)
        clearTimeout(interRoundTimeoutRef.current);
      if (sampleIntervalRef.current) clearInterval(sampleIntervalRef.current);
      if (tracingTimeoutRef.current) clearTimeout(tracingTimeoutRef.current);
      if (tracingCountdownRef.current)
        clearInterval(tracingCountdownRef.current);
      if (dotListenerIdRef.current)
        dotXAnim.removeListener(dotListenerIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================================
  // Phase 1 & 2 — reaction rounds
  // =====================================================================

  const startReactionRound = () => {
    setWaitingForTap(true);
    setShowTap(false);
    const delay =
      MIN_PROMPT_DELAY_MS +
      Math.random() * (MAX_PROMPT_DELAY_MS - MIN_PROMPT_DELAY_MS);
    promptTimeoutRef.current = setTimeout(() => {
      setShowTap(true);
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleReactionTap = () => {
    if (!showTap) return;
    haptic.light();
    const reaction = Date.now() - startTimeRef.current;
    setShowTap(false);
    setWaitingForTap(false);

    const recordAndAdvance = (nextTimes: number[]) => {
      if (nextTimes.length >= TOTAL_ROUNDS) {
        setPhaseStatus("done");
      } else {
        setRound(nextTimes.length + 1);
        interRoundTimeoutRef.current = setTimeout(
          () => startReactionRound(),
          INTER_ROUND_DELAY_MS
        );
      }
    };

    if (phase === 1) {
      setPhase1Times((prev) => {
        const next = [...prev, reaction];
        recordAndAdvance(next);
        return next;
      });
    } else if (phase === 2) {
      setPhase2Times((prev) => {
        const next = [...prev, reaction];
        recordAndAdvance(next);
        return next;
      });
    }
  };

  const startPhase1 = () => {
    setPhase1Times([]);
    setRound(1);
    setPhaseStatus("running");
    startReactionRound();
  };

  const advanceToPhase2 = () => {
    setPhase(2);
    setPhaseStatus("pending");
    setRound(1);
  };

  const startPhase2 = () => {
    setPhase2Times([]);
    setRound(1);
    setPhaseStatus("running");
    startReactionRound();
  };

  const advanceToPhase3 = () => {
    setPhase(3);
    setPhaseStatus("pending");
    setTracingSecondsLeft(TRACING_DURATION_MS / 1000);
  };

  // =====================================================================
  // Phase 3 — tracing
  // =====================================================================

  const handleTracingAreaLayout = (e: LayoutChangeEvent) => {
    setTracingAreaWidth(e.nativeEvent.layout.width);
  };

  const handleTracingTouchStart = (e: GestureResponderEvent) => {
    fingerActiveRef.current = true;
    fingerXRef.current = e.nativeEvent.locationX;
    fingerYRef.current = e.nativeEvent.locationY;
  };

  const handleTracingTouchMove = (e: GestureResponderEvent) => {
    fingerActiveRef.current = true;
    fingerXRef.current = e.nativeEvent.locationX;
    fingerYRef.current = e.nativeEvent.locationY;
  };

  const handleTracingTouchEnd = () => {
    fingerActiveRef.current = false;
  };

  const startPhase3 = () => {
    deviationsRef.current = [];
    setPhase3Deviations([]);
    setPhaseStatus("running");
    setTracingSecondsLeft(TRACING_DURATION_MS / 1000);

    dotXAnim.setValue(0);
    dotListenerIdRef.current = dotXAnim.addListener(({ value }) => {
      dotXRef.current = value;
    });

    // 4-second sweep right then 4-second sweep back = 8s total
    Animated.sequence([
      Animated.timing(dotXAnim, {
        toValue: 1,
        duration: TRACING_DURATION_MS / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(dotXAnim, {
        toValue: 0,
        duration: TRACING_DURATION_MS / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();

    // Sample deviation every TRACING_SAMPLE_MS
    sampleIntervalRef.current = setInterval(() => {
      const width = tracingAreaWidth;
      if (!fingerActiveRef.current || width <= 0) {
        deviationsRef.current.push(TRACING_OFFSCREEN_PENALTY_PX);
        return;
      }
      const dotCenterX =
        dotXRef.current * (width - DOT_SIZE) + DOT_SIZE / 2;
      const dotCenterY = TRACING_AREA_HEIGHT / 2;
      const dx = fingerXRef.current - dotCenterX;
      const dy = fingerYRef.current - dotCenterY;
      deviationsRef.current.push(Math.sqrt(dx * dx + dy * dy));
    }, TRACING_SAMPLE_MS);

    // Visible countdown
    const startedAt = Date.now();
    tracingCountdownRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        (TRACING_DURATION_MS - (Date.now() - startedAt)) / 1000
      );
      setTracingSecondsLeft(remaining);
    }, 100);

    // End after duration
    tracingTimeoutRef.current = setTimeout(() => {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
        sampleIntervalRef.current = null;
      }
      if (tracingCountdownRef.current) {
        clearInterval(tracingCountdownRef.current);
        tracingCountdownRef.current = null;
      }
      if (dotListenerIdRef.current) {
        dotXAnim.removeListener(dotListenerIdRef.current);
        dotListenerIdRef.current = null;
      }
      setTracingSecondsLeft(0);
      setPhase3Deviations([...deviationsRef.current]);
      setPhaseStatus("done");
    }, TRACING_DURATION_MS);
  };

  // =====================================================================
  // Submit / leaderboard / write-up
  // =====================================================================

  const handleSubmit = () => {
    const result = calculateReactionBoardResult(
      phase1Times,
      phase2Times,
      phase3Deviations
    );
    if (!result) return;

    updateRawData({
      phase1_times_ms: result.phase1.reaction_times,
      phase1_average_ms: result.phase1.average_ms,
      phase1_fastest_ms: result.phase1.fastest_ms,
      phase1_score: result.phase1.reaction_score,
      phase2_times_ms: result.phase2.reaction_times,
      phase2_average_ms: result.phase2.average_ms,
      phase2_fastest_ms: result.phase2.fastest_ms,
      phase2_score: result.phase2.reaction_score,
      phase3_deviations_px: result.phase3.deviations_px,
      phase3_average_deviation_px: result.phase3.average_deviation_px,
      phase3_score: result.phase3.tracing_score,
      hand_diff_ms: result.hand_diff_ms,
      overall_score: result.overall_score,
      rounds_per_reaction_phase: TOTAL_ROUNDS,
    });
    setScore(result.overall_score);
    finishAttempt();
    setSubmitted(true);
    haptic.success();
    notifyActivityScored(
      team?.team_name ?? "Your team",
      "Reaction Board",
      result.overall_score
    );
  };

  const handleTryAgain = () => {
    setPhase(1);
    setPhaseStatus("pending");
    setRound(1);
    setPhase1Times([]);
    setPhase2Times([]);
    setPhase3Deviations([]);
    setWaitingForTap(false);
    setShowTap(false);
    setSubmitted(false);
    setSending(false);
    setSentToLeaderboard(false);
    setWriteUpTextLocal("");
    setWriteUp("");
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "reaction");
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
      haptic.success();
      Alert.alert("Sent!", "Your score is on the leaderboard.");
    } catch (e: any) {
      haptic.error();
      Alert.alert("Send failed", e.message ?? "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  // =====================================================================
  // Computed values
  // =====================================================================

  const result =
    phase === 3 && phaseStatus === "done"
      ? calculateReactionBoardResult(phase1Times, phase2Times, phase3Deviations)
      : null;
  const overallScore = result?.overall_score ?? 0;

  const previous = getPreviousAttemptForActivity("reaction");
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(overallScore, previousScore);

  const briefSpeechText =
    "Three quick tests of reaction and accuracy. " +
    "First tap as fast as you can with your dominant hand, then your other hand, " +
    "then trace a moving dot. Take turns through your team.";

  // =====================================================================
  // Render helpers
  // =====================================================================

  const phaseLabel = (p: Phase) => {
    if (p === 1) return "Phase 1 · Tap Reaction (dominant hand)";
    if (p === 2) return "Phase 2 · Swap Hands (non-dominant hand)";
    return "Phase 3 · Tracing Challenge";
  };

  const renderReactionPhase = (
    times: number[],
    onStart: () => void,
    onContinue: () => void,
    continueLabel: string
  ) => {
    if (phaseStatus === "pending") {
      return (
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
            Tap the screen as soon as &quot;TAP!&quot; appears. {TOTAL_ROUNDS} rounds.
            Rotate the phone through each team member.
          </Text>
          <TouchableOpacity
            style={[
              s.button,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.lg,
                marginTop: theme.spacing.lg,
              },
            ]}
            onPress={onStart}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Start
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (phaseStatus === "running") {
      return (
        <View>
          <Text
            style={[
              s.subHeader,
              { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
            ]}
          >
            Round {Math.min(times.length + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          </Text>
          {waitingForTap ? (
            <View
              style={[
                s.tapArea,
                {
                  backgroundColor: showTap
                    ? theme.colors.success
                    : theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radius.xl,
                  marginTop: theme.spacing.md,
                },
              ]}
            >
              <TouchableOpacity
                style={s.fullArea}
                activeOpacity={1}
                onPress={handleReactionTap}
              >
                <Text
                  style={[
                    s.tapText,
                    {
                      color: showTap
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {showTap ? "TAP!" : "Wait..."}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      );
    }

    // done
    const avg = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
    const fastest = times.length ? Math.min(...times) : 0;
    return (
      <View>
        <Text
          style={[
            s.p,
            {
              color: theme.colors.success,
              fontSize: theme.fontSize.md,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          ✓ Done — average {avg} ms, fastest {fastest} ms
        </Text>
        <TouchableOpacity
          style={[
            s.button,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.lg,
              marginTop: theme.spacing.lg,
            },
          ]}
          onPress={onContinue}
        >
          <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
            {continueLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTracingPhase = () => {
    if (phaseStatus === "pending") {
      return (
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
            Keep your finger on the moving dot as it slides across the screen.
            Lasts {TRACING_DURATION_MS / 1000} seconds.
          </Text>
          <TouchableOpacity
            style={[
              s.button,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.lg,
                marginTop: theme.spacing.lg,
              },
            ]}
            onPress={startPhase3}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Start tracing
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (phaseStatus === "running") {
      const interpolatedLeft = dotXAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.max(0, tracingAreaWidth - DOT_SIZE)],
      });
      return (
        <View>
          <Text
            style={[
              s.subHeader,
              { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
            ]}
          >
            {tracingSecondsLeft.toFixed(1)}s left — keep your finger on the dot
          </Text>
          <View
            onLayout={handleTracingAreaLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderStart={handleTracingTouchStart}
            onResponderMove={handleTracingTouchMove}
            onResponderRelease={handleTracingTouchEnd}
            style={[
              s.tracingArea,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radius.lg,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            <View
              style={[
                s.tracingMidline,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <Animated.View
              style={[
                s.dot,
                {
                  backgroundColor: theme.colors.primary,
                  left: interpolatedLeft,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    // done
    const avgDev =
      phase3Deviations.length > 0
        ? Math.round(
            phase3Deviations.reduce((a, b) => a + b, 0) /
              phase3Deviations.length
          )
        : 0;
    return (
      <View>
        <Text
          style={[
            s.p,
            {
              color: theme.colors.success,
              fontSize: theme.fontSize.md,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          ✓ Done — average deviation {avgDev} px
        </Text>
        {!submitted ? (
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
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Submit &amp; see results
            </Text>
          </TouchableOpacity>
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
    );
  };

  return (
    <ActivityShell
      activity_id="reaction"
      title="Reaction Board"
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
            The three phases
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
            • Phase 1 — Tap the screen as fast as you can with your{" "}
            <Text style={{ fontWeight: "700" }}>dominant hand</Text>.{"\n"}
            • Phase 2 — Repeat with your{" "}
            <Text style={{ fontWeight: "700" }}>non-dominant hand</Text>.{"\n"}
            • Phase 3 — Trace a moving dot to test{" "}
            <Text style={{ fontWeight: "700" }}>accuracy</Text>.
          </Text>
        </View>
      }
      run={
        <View>
          <Text
            style={[
              s.h,
              {
                color: theme.colors.primary,
                fontSize: theme.fontSize.xl,
              },
            ]}
          >
            {phaseLabel(phase)}
          </Text>

          {phase === 1 &&
            renderReactionPhase(
              phase1Times,
              startPhase1,
              advanceToPhase2,
              "Continue to Phase 2"
            )}
          {phase === 2 &&
            renderReactionPhase(
              phase2Times,
              startPhase2,
              advanceToPhase3,
              "Continue to Phase 3"
            )}
          {phase === 3 && renderTracingPhase()}
        </View>
      }
      results={
        <View>
          {!submitted || !result ? (
            <Text
              style={[
                s.p,
                {
                  color: theme.colors.textMuted,
                  fontSize: theme.fontSize.md,
                },
              ]}
            >
              Complete all three phases on the Run tab and tap Submit first.
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
                Overall score · {team?.team_name ?? "Your team"}
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
                {overallScore}
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
                    {improvement >= 0 ? "better than" : "compared to"} last
                    attempt
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
                  label="Phase 1 · Dominant"
                  value={result.phase1.average_ms.toFixed(0)}
                  unit="ms avg"
                />
                <MetricCard
                  label="Phase 2 · Non-dominant"
                  value={result.phase2.average_ms.toFixed(0)}
                  unit="ms avg"
                />
                <MetricCard
                  label="Hand difference"
                  value={result.hand_diff_ms.toFixed(0)}
                  unit="ms"
                />
                <MetricCard
                  label="Phase 3 · Tracing"
                  value={result.phase3.average_deviation_px.toFixed(0)}
                  unit="px avg"
                />
                <MetricCard
                  label="Phase scores"
                  value={`${result.phase1.reaction_score} · ${result.phase2.reaction_score} · ${result.phase3.tracing_score}`}
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
            Did reaction time improve over the rounds? How different was your
            non-dominant hand? What made the tracing easier or harder?
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
  subHeader: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  tapArea: {
    height: 240,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tapText: { fontSize: 48, fontWeight: "700" },
  tracingArea: {
    height: TRACING_AREA_HEIGHT,
    borderWidth: 1,
    overflow: "hidden",
  },
  tracingMidline: {
    position: "absolute",
    top: TRACING_AREA_HEIGHT / 2,
    left: 12,
    right: 12,
    height: 1,
  },
  dot: {
    position: "absolute",
    top: TRACING_AREA_HEIGHT / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
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

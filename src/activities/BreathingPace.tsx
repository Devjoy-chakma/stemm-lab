import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ActivityShell from "../components/ActivityShell";
import MetricCard from "../components/MetricCard";

import {
  ACCEL_SAMPLE_INTERVAL_MS,
  BreathingPhaseResult,
  BreathingResult,
  MEASUREMENT_DURATION_S,
  calculateBreathingPhaseResult,
  calculateBreathingResult,
} from "../lib/breathingScore";
import { haptic } from "../lib/haptics";
import { sendToLeaderboard } from "../lib/leaderboardSync";
import { calculateImprovement } from "../lib/parachuteScore";
import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

type Step =
  | "predict"
  | "rest-pending"
  | "rest-running"
  | "rest-done"
  | "exercise-pending"
  | "exercise-running"
  | "all-done";

export default function BreathingPace() {
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

  const [step, setStep] = useState<Step>("predict");
  const [predictionInput, setPredictionInput] = useState("");
  const [restSecondsLeft, setRestSecondsLeft] = useState(MEASUREMENT_DURATION_S);
  const [exerciseSecondsLeft, setExerciseSecondsLeft] = useState(
    MEASUREMENT_DURATION_S
  );
  const [restResult, setRestResult] = useState<BreathingPhaseResult | null>(
    null
  );
  const [exerciseResult, setExerciseResult] =
    useState<BreathingPhaseResult | null>(null);
  const [combinedResult, setCombinedResult] = useState<BreathingResult | null>(
    null
  );

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);
  const [writeUpText, setWriteUpTextLocal] = useState("");

  const restSamplesRef = useRef<number[]>([]);
  const exerciseSamplesRef = useRef<number[]>([]);

  // ---- Init ----
  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "breathing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Accelerometer subscription (only while running) ----
  useEffect(() => {
    if (step !== "rest-running" && step !== "exercise-running") return;

    const targetRef =
      step === "rest-running" ? restSamplesRef : exerciseSamplesRef;
    targetRef.current = [];

    Accelerometer.setUpdateInterval(ACCEL_SAMPLE_INTERVAL_MS);
    const sub = Accelerometer.addListener((data) => {
      // Z-axis = out of screen. With the phone resting on the chest,
      // this oscillates with breathing.
      targetRef.current.push(data.z);
    });
    return () => sub.remove();
  }, [step]);

  // ---- Countdown + phase-end ----
  useEffect(() => {
    if (step !== "rest-running" && step !== "exercise-running") return;
    const phase = step;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, MEASUREMENT_DURATION_S - elapsed);
      if (phase === "rest-running") setRestSecondsLeft(remaining);
      else setExerciseSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (phase === "rest-running") {
          const r = calculateBreathingPhaseResult(
            restSamplesRef.current,
            MEASUREMENT_DURATION_S
          );
          setRestResult(r);
          setStep("rest-done");
        } else {
          const r = calculateBreathingPhaseResult(
            exerciseSamplesRef.current,
            MEASUREMENT_DURATION_S
          );
          setExerciseResult(r);
          setStep("all-done");
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [step]);

  // ---- Step transitions ----

  const handlePredictionContinue = () => {
    const pred = parseInt(predictionInput, 10);
    if (Number.isNaN(pred) || pred < 0) {
      Alert.alert("Invalid prediction", "Enter a positive number of breaths per minute.");
      return;
    }
    setStep("rest-pending");
  };

  const startRestMeasurement = () => {
    setRestSecondsLeft(MEASUREMENT_DURATION_S);
    restSamplesRef.current = [];
    setStep("rest-running");
  };

  const continueToExercisePrep = () => {
    setStep("exercise-pending");
  };

  const startExerciseMeasurement = () => {
    setExerciseSecondsLeft(MEASUREMENT_DURATION_S);
    exerciseSamplesRef.current = [];
    setStep("exercise-running");
  };

  // ---- Submit / leaderboard / write-up ----

  const handleSubmit = () => {
    const pred = parseInt(predictionInput, 10);
    const r = calculateBreathingResult(
      restSamplesRef.current,
      MEASUREMENT_DURATION_S,
      exerciseSamplesRef.current,
      MEASUREMENT_DURATION_S,
      pred
    );
    if (!r) {
      Alert.alert(
        "Cannot compute",
        "We didn't get enough breathing data. Try again."
      );
      return;
    }
    setCombinedResult(r);

    updateRawData({
      rest_samples: restSamplesRef.current,
      rest_bpm: r.rest.bpm,
      rest_peaks: r.rest.peaks_detected,
      exercise_samples: exerciseSamplesRef.current,
      exercise_bpm: r.exercise.bpm,
      exercise_peaks: r.exercise.peaks_detected,
      rest_prediction_bpm: r.rest_prediction_bpm,
      rest_prediction_error: r.rest_prediction_error,
      rest_prediction_accuracy: r.rest_prediction_accuracy,
      bpm_increase: r.bpm_increase,
      bpm_increase_percent: r.bpm_increase_percent,
      duration_seconds: MEASUREMENT_DURATION_S,
    });
    setScore(r.completion_score);
    finishAttempt();
    setSubmitted(true);
    haptic.success();
  };

  const handleTryAgain = () => {
    setStep("predict");
    setPredictionInput("");
    setRestSecondsLeft(MEASUREMENT_DURATION_S);
    setExerciseSecondsLeft(MEASUREMENT_DURATION_S);
    setRestResult(null);
    setExerciseResult(null);
    setCombinedResult(null);
    setSubmitted(false);
    setSending(false);
    setSentToLeaderboard(false);
    setWriteUpTextLocal("");
    setWriteUp("");
    restSamplesRef.current = [];
    exerciseSamplesRef.current = [];
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "breathing");
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

  // ---- Computed ----
  const overallScore = combinedResult?.completion_score ?? 0;
  const previous = getPreviousAttemptForActivity("breathing");
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(overallScore, previousScore);

  const briefSpeechText =
    "Place the phone gently on your chest. " +
    "Measure breaths per minute at rest, do some light exercise, then measure again. " +
    "Compare to see how much your breathing rate increased.";

  // =====================================================================
  // Render helpers
  // =====================================================================

  const renderMeasuring = (secondsLeft: number, label: string) => (
    <View style={s.center}>
      <Text style={[s.timer, { color: theme.colors.primary }]}>
        {secondsLeft.toFixed(1)}s
      </Text>
      <Text
        style={[
          s.p,
          {
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.md,
            marginTop: theme.spacing.md,
            textAlign: "center",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const renderRunStep = () => {
    if (step === "predict") {
      return (
        <View>
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            Step 1 · Predict
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
            How many breaths per minute do you take{" "}
            <Text style={{ fontWeight: "700" }}>at rest</Text>? A relaxed adult
            usually breathes 12–20 times a minute; kids breathe a bit faster.
          </Text>
          <View style={[s.row, { marginTop: theme.spacing.md }]}>
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
              value={predictionInput}
              onChangeText={setPredictionInput}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text
              style={[
                s.unit,
                {
                  color: theme.colors.text,
                  fontSize: theme.fontSize.md,
                  marginLeft: theme.spacing.sm,
                },
              ]}
            >
              breaths / minute
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.button,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.lg,
                marginTop: theme.spacing.xl,
              },
            ]}
            onPress={handlePredictionContinue}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === "rest-pending") {
      return (
        <View>
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            Step 2 · Measure at rest
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
            • Place the phone gently on your chest, screen up.{"\n"}
            • Lie down or sit still — breathe normally.{"\n"}
            • Measurement lasts {MEASUREMENT_DURATION_S} seconds.
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
            onPress={startRestMeasurement}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Start rest measurement
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === "rest-running") {
      return renderMeasuring(
        restSecondsLeft,
        "Hold still — breathe normally. Phone on chest."
      );
    }

    if (step === "rest-done") {
      return (
        <View>
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            Step 3 · Exercise
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.success,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.sm,
                textAlign: "center",
              },
            ]}
          >
            ✓ Rest BPM measured: {restResult?.bpm ?? "—"}
          </Text>
          <Text
            style={[
              s.p,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                marginTop: theme.spacing.lg,
              },
            ]}
          >
            Now do{" "}
            <Text style={{ fontWeight: "700" }}>1 minute of jogging on the spot</Text>{" "}
            or{" "}
            <Text style={{ fontWeight: "700" }}>100 star jumps</Text>. When you&apos;re
            done, place the phone back on your chest and tap Continue.
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
            onPress={continueToExercisePrep}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === "exercise-pending") {
      return (
        <View>
          <Text
            style={[
              s.h,
              { color: theme.colors.primary, fontSize: theme.fontSize.xl },
            ]}
          >
            Step 4 · Measure after exercise
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
            • Place the phone on your chest again.{"\n"}
            • Don&apos;t hold your breath — just breathe naturally.{"\n"}
            • Measurement lasts {MEASUREMENT_DURATION_S} seconds.
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
            onPress={startExerciseMeasurement}
          >
            <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
              Start post-exercise measurement
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === "exercise-running") {
      return renderMeasuring(
        exerciseSecondsLeft,
        "Hold still — breathe naturally. Phone on chest."
      );
    }

    // all-done
    return (
      <View>
        <Text
          style={[
            s.h,
            { color: theme.colors.primary, fontSize: theme.fontSize.xl },
          ]}
        >
          Step 5 · Submit
        </Text>
        <Text
          style={[
            s.p,
            {
              color: theme.colors.success,
              fontSize: theme.fontSize.md,
              marginTop: theme.spacing.sm,
              textAlign: "center",
            },
          ]}
        >
          ✓ Rest: {restResult?.bpm ?? "—"} BPM · Exercise:{" "}
          {exerciseResult?.bpm ?? "—"} BPM
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
      activity_id="breathing"
      title="Breathing Pace Trainer"
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
            How it works
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
            The accelerometer feels the rise and fall of your chest. The app
            counts the peaks to estimate breaths per minute.
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
            • A flat surface or mat to lie on{"\n"}
            • Open space for jogging on the spot or star jumps{"\n"}
            • {MEASUREMENT_DURATION_S} seconds per measurement, twice
          </Text>
        </View>
      }
      run={renderRunStep()}
      results={
        <View>
          {!submitted || !combinedResult ? (
            <Text
              style={[
                s.p,
                { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
              ]}
            >
              Complete the rest and post-exercise measurements on the Run tab
              and tap Submit first.
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
                Prediction accuracy · {team?.team_name ?? "Your team"}
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
                  label="Predicted at rest"
                  value={String(combinedResult.rest_prediction_bpm)}
                  unit="BPM"
                />
                <MetricCard
                  label="Actual at rest"
                  value={String(combinedResult.rest.bpm)}
                  unit="BPM"
                />
                <MetricCard
                  label="After exercise"
                  value={String(combinedResult.exercise.bpm)}
                  unit="BPM"
                />
                <MetricCard
                  label="Increase"
                  value={`+${combinedResult.bpm_increase}`}
                  unit={`BPM (${combinedResult.bpm_increase_percent}%)`}
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
            Were you close with your prediction? How much did your breathing
            speed up after exercise? Why does breathing rate go up during
            activity?
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
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", marginTop: 40 },
  input: { borderWidth: 1, textAlign: "center" },
  unit: { fontWeight: "500" },
  button: { alignItems: "center", paddingVertical: 16 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  timer: {
    fontSize: 72,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  bigScore: { fontSize: 96, fontWeight: "700", textAlign: "center" },
  badge: {},
  badgeText: { fontWeight: "700" },
  cards: { flexDirection: "column" },
  cta: { alignItems: "center" },
  textarea: { borderWidth: 1, minHeight: 140 },
});

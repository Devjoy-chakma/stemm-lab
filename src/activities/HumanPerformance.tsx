import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ActivityShell from "../components/ActivityShell";
import MetricCard from "../components/MetricCard";

import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

export default function HumanPerformance() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);

  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);

  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const [movementScore, setMovementScore] = useState(0);
  const [stabilityScore, setStabilityScore] = useState(0);
  const [performanceLevel, setPerformanceLevel] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [writeUpText, setWriteUpTextLocal] = useState("");

  const movementSamples = useRef<number[]>([]);

  const previousReading = useRef({
    x: 0,
    y: 0,
    z: 0,
  });

  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "human-perf");
  }, []);

  // Accelerometer listener
  useEffect(() => {
    let subscription: any;

    if (isRunning) {
      Accelerometer.setUpdateInterval(200);

      subscription = Accelerometer.addListener((data) => {
        const dx = Math.abs(data.x - previousReading.current.x);
        const dy = Math.abs(data.y - previousReading.current.y);
        const dz = Math.abs(data.z - previousReading.current.z);

        const movement = dx + dy + dz;

        movementSamples.current.push(movement);

        previousReading.current = data;
      });
    }

    return () => {
      subscription?.remove();
    };
  }, [isRunning]);

  // Timer
  useEffect(() => {
    let interval: any;

    if (isRunning && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    if (countdown === 0 && isRunning) {
      finishChallenge();
    }

    return () => clearInterval(interval);
  }, [isRunning, countdown]);

  const handleStart = () => {
    movementSamples.current = [];

    previousReading.current = {
      x: 0,
      y: 0,
      z: 0,
    };

    setCountdown(10);
    setSubmitted(false);

    setMovementScore(0);
    setStabilityScore(0);
    setPerformanceLevel("");

    setIsRunning(true);
  };

  const finishChallenge = () => {
    setIsRunning(false);

    const samples = movementSamples.current;

    if (samples.length === 0) return;

    const avgMovement = samples.reduce((a, b) => a + b, 0) / samples.length;

    const roundedMovement = Number(avgMovement.toFixed(2));

    let score = Math.max(0, Math.round(100 - roundedMovement * 10));

    setMovementScore(roundedMovement);
    setStabilityScore(score);

    setScore(score);

    finishAttempt();

    let performance = "Needs Improvement";

    if (score >= 90) {
      performance = "Excellent";
    } else if (score >= 80) {
      performance = "Good";
    } else if (score >= 70) {
      performance = "Fair";
    }

    setPerformanceLevel(performance);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  const briefSpeechText =
    "Hold your phone as steady as possible for 10 seconds. " +
    "The phone sensors measure your movement and balance.";

  return (
    <ActivityShell
      activity_id="human-perf"
      title="Human Performance"
      briefSpeechText={briefSpeechText}
      brief={
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
            What you'll do
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
            • A phone{"\n"}• A steady hand{"\n"}• Open standing space
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
                textAlign: "center",
              },
            ]}
          >
            Balance Challenge
          </Text>

          <Text
            style={[
              s.timer,
              {
                color: theme.colors.primary,
              },
            ]}
          >
            {countdown}s
          </Text>

          {isRunning ? (
            <Text
              style={[
                s.p,
                {
                  color: theme.colors.textMuted,
                  textAlign: "center",
                },
              ]}
            >
              Hold your phone steady...
            </Text>
          ) : (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.lg,
                  marginTop: theme.spacing.lg,
                },
              ]}
              onPress={handleStart}
            >
              <Text
                style={[
                  s.buttonText,
                  {
                    color: theme.colors.textOnPrimary,
                  },
                ]}
              >
                Start Challenge
              </Text>
            </TouchableOpacity>
          )}

          {!isRunning && stabilityScore > 0 && !submitted ? (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.success,
                  borderRadius: theme.radius.lg,
                  marginTop: theme.spacing.md,
                },
              ]}
              onPress={handleSubmit}
            >
              <Text
                style={[
                  s.buttonText,
                  {
                    color: theme.colors.textOnPrimary,
                  },
                ]}
              >
                Submit & see results
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
      results={
        <View>
          {!submitted ? (
            <Text
              style={[
                s.p,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              Complete the balance challenge first.
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
                  },
                ]}
              >
                Nice work!
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
                {stabilityScore}
              </Text>

              <Text
                style={[
                  s.p,
                  {
                    color: theme.colors.textMuted,
                    textAlign: "center",
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.lg,
                    fontWeight: "600",
                  },
                ]}
              >
                {performanceLevel}
              </Text>

              <View
                style={[
                  s.cards,
                  {
                    marginTop: theme.spacing.lg,
                    gap: theme.spacing.sm,
                  },
                ]}
              >
                <MetricCard label="Movement" value={movementScore.toFixed(2)} />

                <MetricCard
                  label="Stability"
                  value={String(stabilityScore)}
                  unit="/100"
                />
              </View>
            </View>
          )}
        </View>
      }
      writeUp={
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
            What made balancing difficult? How could you improve your stability?
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
  h: {
    fontWeight: "700",
  },

  p: {
    lineHeight: 22,
  },

  timer: {
    fontSize: 72,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
  },

  button: {
    alignItems: "center",
    paddingVertical: 16,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },

  bigScore: {
    fontSize: 96,
    fontWeight: "700",
    textAlign: "center",
  },

  cards: {
    flexDirection: "column",
  },

  textarea: {
    borderWidth: 1,
    minHeight: 140,
  },
});

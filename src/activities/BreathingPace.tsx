import { useEffect, useRef, useState } from "react";
import {
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

import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

const SESSION_DURATION = 30;

export default function BreathingPace() {
  const { theme } = useTheme();

  const team = useTeamStore((s) => s.team);

  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);

  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION);

  const [phase, setPhase] = useState<"Inhale" | "Exhale">("Inhale");

  const [submitted, setSubmitted] = useState(false);

  const [writeUpText, setWriteUpTextLocal] = useState("");

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";

    startAttempt(teamId, "breathing");
  }, []);

  // Breathing animation
  useEffect(() => {
    if (!isRunning) return;

    const animate = () => {
      setPhase("Inhale");

      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setPhase("Exhale");

        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          if (isRunning) {
            animate();
          }
        });
      });
    };

    animate();
  }, [isRunning]);

  // Timer
  useEffect(() => {
    let interval: any;

    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }

    if (secondsLeft === 0 && isRunning) {
      finishSession();
    }

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const startSession = () => {
    setSecondsLeft(SESSION_DURATION);

    setSubmitted(false);

    setIsRunning(true);
  };

  const finishSession = () => {
    setIsRunning(false);

    const score = 100;

    setScore(score);

    finishAttempt();
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleTryAgain = () => {
    setSecondsLeft(SESSION_DURATION);

    setSubmitted(false);
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);

    setWriteUp(text);
  };

  const briefSpeechText =
    "Follow the breathing guide by inhaling and exhaling slowly. " +
    "This activity helps improve breathing rhythm and focus.";

  return (
    <ActivityShell
      activity_id="breathing"
      title="Breathing Pace"
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
            • A quiet environment{"\n"}• Comfortable posture{"\n"}• Focus and
            calm breathing
          </Text>
        </View>
      }
      run={
        <View>
          {!isRunning && !submitted ? (
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
                style={[
                  s.buttonText,
                  {
                    color: theme.colors.textOnPrimary,
                  },
                ]}
              >
                Start Session
              </Text>
            </TouchableOpacity>
          ) : null}

          {isRunning ? (
            <View style={s.center}>
              <Animated.View
                style={[
                  s.circle,
                  {
                    backgroundColor: theme.colors.primarySoft,
                    transform: [
                      {
                        scale: scaleAnim,
                      },
                    ],
                  },
                ]}
              />

              <Text
                style={[
                  s.phaseText,
                  {
                    color: theme.colors.primary,
                    marginTop: theme.spacing.xl,
                  },
                ]}
              >
                {phase}
              </Text>

              <Text
                style={[
                  s.timer,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                {secondsLeft}s
              </Text>
            </View>
          ) : null}

          {!isRunning && secondsLeft === 0 && !submitted ? (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.success,
                  borderRadius: theme.radius.lg,
                  marginTop: theme.spacing.xl,
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
              Complete the breathing session first.
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
                Session Complete!
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
                100
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
                <MetricCard
                  label="Session Time"
                  value={String(SESSION_DURATION)}
                  unit="s"
                />

                <MetricCard label="Breathing Cycles" value="4" />

                <MetricCard label="Focus Score" value="Excellent" />
              </View>

              <TouchableOpacity
                onPress={handleTryAgain}
                style={{
                  marginTop: theme.spacing.lg,
                }}
              >
                <Text
                  style={[
                    s.p,
                    {
                      color: theme.colors.primarySoft,
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
            How did controlled breathing affect your focus or relaxation?
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

  center: {
    alignItems: "center",
    marginTop: 40,
  },

  circle: {
    width: 140,
    height: 140,
    borderRadius: 999,
  },

  phaseText: {
    fontSize: 32,
    fontWeight: "700",
  },

  timer: {
    fontSize: 22,
    marginTop: 12,
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

import { useRouter } from "expo-router";
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

import { sendToLeaderboard } from "../lib/leaderboardSync";
import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

const TOTAL_ROUNDS = 3;

export default function ReactionBoard() {
  const { theme } = useTheme();

  const router = useRouter();

  const team = useTeamStore((s) => s.team);

  const startAttempt = useAttemptStore((s) => s.startAttempt);
  const setScore = useAttemptStore((s) => s.setScore);
  const setWriteUp = useAttemptStore((s) => s.setWriteUp);
  const finishAttempt = useAttemptStore((s) => s.finishAttempt);
  const updateRawData = useAttemptStore((s) => s.updateRawData);
  const current = useAttemptStore((s) => s.current);

  const [gameStarted, setGameStarted] = useState(false);
  const [waitingForTap, setWaitingForTap] = useState(false);
  const [showTap, setShowTap] = useState(false);

  const [round, setRound] = useState(1);

  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const [submitted, setSubmitted] = useState(false);

  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);

  const [writeUpText, setWriteUpTextLocal] = useState("");

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "reaction");
  }, []);

  const startRound = () => {
    setWaitingForTap(true);
    setShowTap(false);

    const delay = 1000 + Math.random() * 2000;

    timeoutRef.current = setTimeout(() => {
      setShowTap(true);
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleStartGame = () => {
    setReactionTimes([]);
    setRound(1);
    setSubmitted(false);

    setGameStarted(true);

    startRound();
  };

  const handleTap = () => {
    if (!showTap) return;

    const reaction = Date.now() - startTimeRef.current;

    const updated = [...reactionTimes, reaction];

    setReactionTimes(updated);

    setShowTap(false);
    setWaitingForTap(false);

    if (round >= TOTAL_ROUNDS) {
      finishGame(updated);
    } else {
      setRound((prev) => prev + 1);

      setTimeout(() => {
        startRound();
      }, 1000);
    }
  };

  const finishGame = (times: number[]) => {
    setGameStarted(false);

    const avg = times.reduce((a, b) => a + b, 0) / times.length;

    const score = Math.max(0, Math.round(100 - (avg - 200) / 8));

    updateRawData({
      reactionTimes: times,
      averageReaction: avg,
      fastestReaction: Math.min(...times),
      rounds: TOTAL_ROUNDS,
    });

    setScore(score);

    finishAttempt();
  };

  const handleSubmit = () => {
    setSubmitted(true);
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

  const handleTryAgain = () => {
    setReactionTimes([]);

    setRound(1);

    setSubmitted(false);

    setSending(false);
    setSentToLeaderboard(false);

    setGameStarted(false);
    setWaitingForTap(false);
    setShowTap(false);

    setWriteUp("");
    setWriteUpTextLocal("");

    const teamId = team?.team_id ?? "demo-team";

    startAttempt(teamId, "reaction");
  };

  const handleWriteUpChange = (text: string) => {
    setWriteUpTextLocal(text);
    setWriteUp(text);
  };

  // Results
  const averageReaction =
    reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;

  const fastestReaction =
    reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;

  const reactionScore = Math.max(
    0,
    Math.round(100 - (averageReaction - 200) / 8)
  );

  const briefSpeechText =
    "Test how quickly you can react to a signal. " +
    "Tap the screen as fast as possible when TAP appears.";

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
            • A phone{"\n"}• Fast reactions{"\n"}• Focus and concentration
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
            Round {Math.min(round, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          </Text>

          {!gameStarted && reactionTimes.length === 0 && !submitted ? (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.lg,
                  marginTop: theme.spacing.xl,
                },
              ]}
              onPress={handleStartGame}
            >
              <Text
                style={[
                  s.buttonText,
                  {
                    color: theme.colors.textOnPrimary,
                  },
                ]}
              >
                Start Test
              </Text>
            </TouchableOpacity>
          ) : null}

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
                },
              ]}
            >
              <TouchableOpacity
                style={s.fullArea}
                activeOpacity={1}
                onPress={handleTap}
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

          {!gameStarted &&
          reactionTimes.length === TOTAL_ROUNDS &&
          !submitted ? (
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

          {submitted ? (
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
              Complete the reaction test first.
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
                {reactionScore}
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
                  label="Average Reaction"
                  value={averageReaction.toFixed(0)}
                  unit="ms"
                />

                <MetricCard
                  label="Fastest Reaction"
                  value={String(fastestReaction)}
                  unit="ms"
                />

                <MetricCard label="Rounds" value={String(TOTAL_ROUNDS)} />
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
                        {
                          color: theme.colors.textOnPrimary,
                        },
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
                style={{
                  marginTop: theme.spacing.md,
                }}
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
            Did your reaction improve over time? What distractions affected your
            speed?
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

  tapArea: {
    marginTop: 32,
    height: 300,
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

  tapText: {
    fontSize: 48,
    fontWeight: "700",
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

  cta: {
    alignItems: "center",
  },

  textarea: {
    borderWidth: 1,
    minHeight: 140,
  },
});
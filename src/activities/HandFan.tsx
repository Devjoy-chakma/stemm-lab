import { useEffect, useState } from "react";
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
  calculateHandFanResult,
  DISTANCES_CM,
  HandFanMaterialId,
  MATERIALS,
} from "../lib/handFanScore";
import { sendToLeaderboard } from "../lib/leaderboardSync";
import { calculateImprovement } from "../lib/parachuteScore";
import { useAttemptStore, useTeamStore } from "../stores";
import { useTheme } from "../theme";

export default function HandFan() {
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

  // ---- Run state ----
  const [materialId, setMaterialId] = useState<HandFanMaterialId>("paper");
  const [distanceCm, setDistanceCm] = useState<number>(30);
  const [prediction, setPrediction] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");

  // ---- Submit / write-up state ----
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToLeaderboard, setSentToLeaderboard] = useState(false);
  const [writeUpText, setWriteUpTextLocal] = useState("");

  useEffect(() => {
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "hand-fan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Submit ----
  const handleSubmit = () => {
    const predNum = parseFloat(prediction);
    const outNum = parseFloat(outcome);
    if (Number.isNaN(predNum) || Number.isNaN(outNum)) {
      Alert.alert(
        "Missing angle",
        "Enter both the predicted and observed bend angles in degrees."
      );
      return;
    }
    const result = calculateHandFanResult(
      materialId,
      distanceCm,
      predNum,
      outNum
    );
    if (!result) {
      Alert.alert(
        "Invalid input",
        "Bend angles must be between 0° and 180°."
      );
      return;
    }

    updateRawData({
      materialId: result.material.id,
      materialLabel: result.material.label,
      distance_cm: result.distance_cm,
      prediction_degrees: result.prediction_degrees,
      outcome_degrees: result.outcome_degrees,
      prediction_error_degrees: result.prediction_error_degrees,
      prediction_accuracy: result.prediction_accuracy,
      airflow_score: result.airflow_score,
    });
    setScore(result.airflow_score);
    finishAttempt();
    setSubmitted(true);
  };

  const handleTryAgain = () => {
    setPrediction("");
    setOutcome("");
    setSubmitted(false);
    setSending(false);
    setSentToLeaderboard(false);
    setWriteUpTextLocal("");
    setWriteUp("");
    const teamId = team?.team_id ?? "demo-team";
    startAttempt(teamId, "hand-fan");
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
  const predNum = parseFloat(prediction);
  const outNum = parseFloat(outcome);
  const result =
    !Number.isNaN(predNum) && !Number.isNaN(outNum)
      ? calculateHandFanResult(materialId, distanceCm, predNum, outNum)
      : null;
  const airflowScore = result?.airflow_score ?? 0;

  const previous = getPreviousAttemptForActivity("hand-fan");
  const previousScore = previous?.score ?? null;
  const improvement = calculateImprovement(airflowScore, previousScore);

  const briefSpeechText =
    "Stand a sheet of paper or cardboard upright on a table. " +
    "Predict how much it will bend, then fan it from the chosen distance and measure the actual bend. " +
    "Compare your prediction with what really happened.";

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
            • Paper and cardboard{"\n"}
            • Scissors and tape (to build your fan){"\n"}
            • A flat table{"\n"}
            • A protractor (or angle app) to measure the bend
          </Text>

          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            How it works
          </Text>
          <Text style={[s.p, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            Moving air applies force to objects. Stiffer materials bend less for the same amount of airflow. Try different fan designs and distances to see what makes the paper move the most.
          </Text>
        </View>
      }
      run={
        <View>
          {/* Material picker */}
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Material
          </Text>
          <View style={[s.pillRow, { marginTop: theme.spacing.sm }]}>
            {MATERIALS.map((m) => {
              const active = m.id === materialId;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMaterialId(m.id)}
                  style={[
                    s.pillEqual,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.borderStrong,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.pillText,
                      {
                        color: active
                          ? theme.colors.textOnPrimary
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance picker */}
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            Fan distance
          </Text>
          <View style={[s.pillRow, { marginTop: theme.spacing.sm }]}>
            {DISTANCES_CM.map((d) => {
              const active = d === distanceCm;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDistanceCm(d)}
                  style={[
                    s.pillEqual,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.borderStrong,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.pillText,
                      {
                        color: active
                          ? theme.colors.textOnPrimary
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {d} cm
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prediction input */}
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            Prediction
          </Text>
          <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs }]}>
            Before fanning, predict how far the paper will bend.
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
              value={prediction}
              onChangeText={setPrediction}
              keyboardType="decimal-pad"
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={[s.unit, { color: theme.colors.text, fontSize: theme.fontSize.md, marginLeft: theme.spacing.sm }]}>
              degrees
            </Text>
          </View>

          {/* Outcome input */}
          <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            Outcome
          </Text>
          <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs }]}>
            Now fan the paper and measure how far it actually bent.
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
              value={outcome}
              onChangeText={setOutcome}
              keyboardType="decimal-pad"
              placeholder="35"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={[s.unit, { color: theme.colors.text, fontSize: theme.fontSize.md, marginLeft: theme.spacing.sm }]}>
              degrees
            </Text>
          </View>

          {/* Submit */}
          {!submitted ? (
            <TouchableOpacity
              style={[
                s.button,
                {
                  backgroundColor: theme.colors.success,
                  borderRadius: theme.radius.lg,
                  paddingVertical: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                  opacity: result ? 1 : 0.6,
                },
              ]}
              onPress={handleSubmit}
              disabled={!result}
            >
              <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                Submit & see results
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.lg, textAlign: "center" }]}>
              Submitted. Tap the Results tab to see your score.
            </Text>
          )}
        </View>
      }
      results={
        <View>
          {!submitted || !result ? (
            <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.md }]}>
              Pick a material, fan distance, and enter both bend angles on the Run tab.
            </Text>
          ) : (
            <View>
              <Text style={[s.h, { color: theme.colors.primary, fontSize: theme.fontSize.xxl, textAlign: "center", marginTop: theme.spacing.lg }]}>
                Nice work!
              </Text>
              <Text style={[s.p, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: "center", marginTop: theme.spacing.xs }]}>
                Airflow score · {team?.team_name ?? "Your team"}
              </Text>

              <Text style={[s.bigScore, { color: theme.colors.success, marginTop: theme.spacing.md }]}>
                {airflowScore}
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
                  <Text style={[s.badgeText, { color: theme.colors.textOnPrimary, fontSize: theme.fontSize.sm }]}>
                    {improvement >= 0 ? "↑" : "↓"} {Math.abs(improvement)}%{" "}
                    {improvement >= 0 ? "better than" : "compared to"} last attempt
                  </Text>
                </View>
              ) : null}

              <View style={[s.cards, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
                <MetricCard
                  label="Predicted"
                  value={result.prediction_degrees.toFixed(0)}
                  unit="°"
                />
                <MetricCard
                  label="Actual bend"
                  value={result.outcome_degrees.toFixed(0)}
                  unit="°"
                />
                <MetricCard
                  label="Prediction accuracy"
                  value={String(result.prediction_accuracy)}
                  unit="/100"
                />
                <MetricCard label="Material" value={result.material.label} />
                <MetricCard
                  label="Fan distance"
                  value={String(result.distance_cm)}
                  unit="cm"
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
                    <Text style={[s.buttonText, { color: theme.colors.textOnPrimary }]}>
                      Send to leaderboard 🏆
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={[s.p, { color: theme.colors.success, textAlign: "center", marginTop: theme.spacing.lg, fontSize: theme.fontSize.md }]}>
                  ✓ Sent to leaderboard
                </Text>
              )}

              <TouchableOpacity onPress={handleTryAgain} style={{ marginTop: theme.spacing.md }}>
                <Text style={[s.p, { color: theme.colors.primarySoft, fontSize: theme.fontSize.sm, textAlign: "center", textDecorationLine: "underline" }]}>
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
            How does material stiffness affect the bend angle? How does fan design influence air velocity and paper movement? How does distance from the fan affect bending?
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
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pillEqual: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  pillText: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, textAlign: "center" },
  unit: { fontWeight: "500" },
  button: { alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  bigScore: { fontSize: 96, fontWeight: "700", textAlign: "center" },
  badge: {},
  badgeText: { fontWeight: "700" },
  cards: { flexDirection: "column" },
  cta: { alignItems: "center" },
  textarea: { borderWidth: 1, minHeight: 140 },
});

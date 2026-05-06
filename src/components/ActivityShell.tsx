import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../theme';
import { useSettingsStore } from '../stores';
import type { ActivityShellProps, TabKey } from './ActivityShell.types';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'brief', label: 'Brief' },
  { key: 'run', label: 'Run' },
  { key: 'results', label: 'Results' },
  { key: 'writeup', label: 'Write-up' },
];

export default function ActivityShell({
  activity_id,
  title,
  brief,
  run,
  results,
  writeUp,
  briefSpeechText,
}: ActivityShellProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const tts_rate = useSettingsStore((s) => s.tts_rate);
  const tts_voice_id = useSettingsStore((s) => s.tts_voice_id);

  const [activeTab, setActiveTab] = useState<TabKey>('brief');

  // ---- Helpers ----
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'brief':
        return brief;
      case 'run':
        return run;
      case 'results':
        return results;
      case 'writeup':
        return writeUp;
    }
  };

  const handleSpeakBrief = () => {
    if (!briefSpeechText) return;
    Speech.stop(); // stop any prior speech first
    Speech.speak(briefSpeechText, {
      rate: tts_rate,
      voice: tts_voice_id ?? undefined,
    });
  };

  // ---- Render ----
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: theme.colors.primary, fontSize: theme.fontSize.lg },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* TTS button only shows on Brief tab if briefSpeechText is provided */}
        {activeTab === 'brief' && briefSpeechText ? (
          <TouchableOpacity onPress={handleSpeakBrief} style={styles.headerButton}>
            <Ionicons name="volume-high" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {/* TAB BAR */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                isActive && {
                  borderBottomColor: theme.colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.textMuted,
                    fontSize: theme.fontSize.sm,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { padding: theme.spacing.lg }]}
      >
        {renderActiveTab()}
      </ScrollView>

      {/* DEBUG FOOTER — temporary, remove later */}
      <View
        style={[
          styles.debugFooter,
          { backgroundColor: theme.colors.surfaceMuted, padding: theme.spacing.xs },
        ]}
      >
        <Text style={[styles.debugText, { color: theme.colors.textMuted }]}>
          {activity_id} · {activeTab}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {},
  content: { flex: 1 },
  contentInner: { paddingBottom: 40 },
  debugFooter: { alignItems: 'center' },
  debugText: { fontSize: 11 },
});
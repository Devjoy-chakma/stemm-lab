import { Stack } from "expo-router";
import { useEffect } from "react";

import { runMigrations } from "../src/database/migrations";
import { registerBackgroundSyncTask } from "../src/lib/backgroundSync";
import { ThemeProvider } from "../src/theme";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      await runMigrations();
      // Register the periodic task AFTER migrations so the
      // pending_sync table is guaranteed to exist when the OS first
      // wakes the task.
      void registerBackgroundSyncTask();
    })();
  }, []);

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="team-sign-in"
          options={{
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="team-sign-up"
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

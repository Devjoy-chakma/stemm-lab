import { Stack } from "expo-router";
import { useEffect } from "react";

import { runMigrations } from "../src/database/migrations";
import { ThemeProvider } from "../src/theme";

export default function RootLayout() {
  useEffect(() => {
    runMigrations();
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
      </Stack>
    </ThemeProvider>
  );
}

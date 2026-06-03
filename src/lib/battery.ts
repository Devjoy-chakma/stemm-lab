// React hook around expo-battery that exposes the current charge
// level and whether the device is plugged in. Subscribes to live
// updates so the UI redraws when the level changes.

import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';

export interface BatteryState {
  level: number;       // 0..1 (multiply by 100 for percentage)
  charging: boolean;   // true when CHARGING or FULL
}

function isChargingState(state: Battery.BatteryState): boolean {
  return (
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL
  );
}

export function useBattery(): BatteryState {
  const [level, setLevel] = useState<number>(1);
  const [charging, setCharging] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [initialLevel, initialState] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
        ]);
        if (!active) return;
        setLevel(initialLevel);
        setCharging(isChargingState(initialState));
      } catch (e) {
        // Battery API can fail on some simulators — fall through to
        // listeners which may still fire.
        console.warn('Failed to read initial battery state:', e);
      }
    })();

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (active) setLevel(batteryLevel);
    });
    const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
      if (active) setCharging(isChargingState(batteryState));
    });

    return () => {
      active = false;
      levelSub.remove();
      stateSub.remove();
    };
  }, []);

  return { level, charging };
}

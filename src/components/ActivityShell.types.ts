import { ReactNode } from 'react';

// =====================================================================
// ActivityShell types — shared between the shell and the 7 activities
// =====================================================================

export type TabKey = 'brief' | 'run' | 'results' | 'writeup';

export interface ActivityShellProps {
  // Identity
  activity_id: string;          // 'parachute', 'sound', etc.
  title: string;                 // 'Parachute Drop'

  // Tab content — each tab is React content
  brief: ReactNode;              // instructions
  run: ReactNode;                // the doing-the-activity UI
  results: ReactNode;            // score display
  writeUp: ReactNode;            // reflection input

  // Optional read-aloud text for the Brief tab
  briefSpeechText?: string;
}
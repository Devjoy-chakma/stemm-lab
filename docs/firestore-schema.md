# STEMMLab — Data Schema

**Version:** 1.0
**Last updated:** 2 May 2026
**Status:** Source of truth for both SQLite and Firestore implementations

This document defines the data model for STEMMLab. It covers both the on-device
SQLite database and the cloud Firestore database. **Both developers must
implement their respective layers to match this exactly** — field names, types,
and conventions.

---

## 1. Architecture overview

STEMMLab uses a **device-local data model** with selective cloud sync for the
leaderboard only.

### Key principles

1. **Privacy by design.** No personal data (first names, member details, video
   files) ever leaves the device. Only anonymous team identifiers (name +
   discriminator) and scores reach Firestore.
2. **Offline-first.** SQLite is the source of truth. Firestore writes are
   opportunistic — if offline, the device queues them and syncs when online.
3. **Session-scoped teams.** A team represents one session. It's created,
   played, and never edited. To play again with different members, create a
   new team.
4. **Snake_case everywhere.** Field names use snake_case for both SQLite and
   Firestore for consistency. Matches the lecturer's lab examples.

---

## 2. Authentication

**Provider:** Firebase Authentication, Email/Password method.

**Identity:** Firebase `uid` is the user's identity. One uid per Firebase
account. The uid is opaque (no personal data leaks from it) and stable for the
lifetime of the account.

**What the uid represents:** The owner of *this device's installation*.
Typically a teacher, parent, or older student. NOT a single playing student.

**Account model:** One user can create many teams over time. Each team is a
separate session. There is no concept of a shared team across users or devices.

**No personal data in Firebase Auth profiles.** We do not call `updateProfile`
or set display names. The Firebase user is purely an authentication anchor.

---

## 3. SQLite schema (on-device)

All tables use `INTEGER PRIMARY KEY AUTOINCREMENT` for primary keys unless
otherwise noted. All timestamps stored as ISO-8601 strings (text).

### 3.1 `users`

The currently logged-in user on this device. Typically only one row.

| Column | Type | Notes |
|---|---|---|
| user_id | INTEGER PK | Auto-increment local ID |
| firebase_uid | TEXT NOT NULL UNIQUE | Firebase Auth uid |
| email | TEXT NOT NULL | Email used to sign in |
| created_at | TEXT NOT NULL | ISO timestamp of first login |
| last_login_at | TEXT NOT NULL | ISO timestamp of most recent login |

### 3.2 `teams`

A team session. Created once, never edited. Many rows over time.

| Column | Type | Notes |
|---|---|---|
| team_id | INTEGER PK | Auto-increment |
| user_id | INTEGER NOT NULL FK → users | Owner of the team session |
| team_name | TEXT NOT NULL | 2–20 chars, user-provided |
| discriminator | TEXT NOT NULL UNIQUE | e.g. "DRP-4821" |
| grade_level | INTEGER NOT NULL | 3–9 |
| event_code | TEXT NULL | Optional, scopes leaderboard if set |
| created_at | TEXT NOT NULL | ISO timestamp |
| ended_at | TEXT NULL | ISO timestamp when session ended (nullable) |

**Indexes:** `user_id`, `discriminator` (unique).

### 3.3 `team_members`

First names of the kids in a team. **Never synced to cloud.**

| Column | Type | Notes |
|---|---|---|
| member_id | INTEGER PK | Auto-increment |
| team_id | INTEGER NOT NULL FK → teams | ON DELETE CASCADE |
| first_name | TEXT NOT NULL | Just first name, 1–20 chars |
| joined_at | TEXT NOT NULL | ISO timestamp |

**Indexes:** `team_id`.

### 3.4 `activities`

Static reference data — the 7 activities. Seeded once on first app launch.

| Column | Type | Notes |
|---|---|---|
| activity_id | TEXT PK | e.g. "parachute_drop" — string ID for stability |
| name | TEXT NOT NULL | Display name |
| category | TEXT NOT NULL | "engineering" or "health" |
| description | TEXT NOT NULL | Plain-language summary |
| icon | TEXT NOT NULL | Emoji or icon key |
| sort_order | INTEGER NOT NULL | Display order on home screen |

**Seed values:**

| activity_id | name | category |
|---|---|---|
| parachute_drop | Parachute Drop | engineering |
| sound_pollution | Sound Pollution Hunter | engineering |
| hand_fan | Hand Fan Challenge | engineering |
| earthquake_structure | Earthquake-Resistant Structure | engineering |
| stretch_gracefulness | Stretch & Gracefulness | health |
| reaction_board | Reaction Board | health |
| breathing_pace | Breathing Pace Trainer | health |

### 3.5 `activity_attempts`

Each attempt of an activity by a team. Multiple attempts per activity allowed.

| Column | Type | Notes |
|---|---|---|
| attempt_id | INTEGER PK | Auto-increment |
| team_id | INTEGER NOT NULL FK → teams | ON DELETE CASCADE |
| activity_id | TEXT NOT NULL FK → activities |  |
| attempt_number | INTEGER NOT NULL | 1, 2, 3 within the team-activity pair |
| started_at | TEXT NOT NULL | ISO timestamp |
| completed_at | TEXT NULL | ISO timestamp, null if abandoned |
| status | TEXT NOT NULL | "in_progress", "completed", "abandoned" |

**Indexes:** `team_id`, `activity_id`.

### 3.6 `attempt_results`

Calculated metrics from an attempt. Flexible schema (key-value) to handle 7
different activities with different metric sets.

| Column | Type | Notes |
|---|---|---|
| result_id | INTEGER PK | Auto-increment |
| attempt_id | INTEGER NOT NULL FK → activity_attempts | ON DELETE CASCADE |
| metric_name | TEXT NOT NULL | e.g. "velocity", "g_force", "decibels" |
| metric_value | REAL NOT NULL | The numeric value |
| unit | TEXT NOT NULL | e.g. "m/s", "g", "dB" |
| member_id | INTEGER NULL FK → team_members | For per-member results (Reaction, Breathing); null for team results |

**Indexes:** `attempt_id`.

### 3.7 `write_ups`

Prediction, outcome, reflection per attempt.

| Column | Type | Notes |
|---|---|---|
| writeup_id | INTEGER PK | Auto-increment |
| attempt_id | INTEGER NOT NULL FK → activity_attempts UNIQUE | One per attempt |
| prediction | TEXT NULL | What the team thought would happen |
| outcome | TEXT NULL | What actually happened |
| reflection | TEXT NULL | What they learned |
| was_correct | INTEGER NULL | 0 or 1 (SQLite boolean), null if not assessed |
| created_at | TEXT NOT NULL | ISO timestamp |

### 3.8 `media_files`

Videos, audio recordings, GPS-tagged points. Always local. Optional upload to
Firebase Storage triggers a flag.

| Column | Type | Notes |
|---|---|---|
| media_id | INTEGER PK | Auto-increment |
| attempt_id | INTEGER NOT NULL FK → activity_attempts | ON DELETE CASCADE |
| file_uri | TEXT NOT NULL | Local file path |
| media_type | TEXT NOT NULL | "video", "audio", "gps_point" |
| gps_lat | REAL NULL | For GPS points and Sound Pollution |
| gps_lng | REAL NULL | "" |
| duration_ms | INTEGER NULL | For video/audio |
| captured_at | TEXT NOT NULL | ISO timestamp |
| uploaded_to_cloud | INTEGER NOT NULL DEFAULT 0 | 0 = local only, 1 = uploaded |
| cloud_url | TEXT NULL | If uploaded, Firebase Storage URL |

**Indexes:** `attempt_id`.

### 3.9 `app_settings`

User preferences. Single row.

| Column | Type | Notes |
|---|---|---|
| settings_id | INTEGER PK | Always 1 |
| theme_mode | TEXT NOT NULL DEFAULT 'light' | "light", "dark", "system" |
| font_scale | REAL NOT NULL DEFAULT 1.0 | 0.8 to 1.5 |
| high_contrast | INTEGER NOT NULL DEFAULT 0 | 0 or 1 |
| sound_enabled | INTEGER NOT NULL DEFAULT 1 | 0 or 1 |
| notifications_enabled | INTEGER NOT NULL DEFAULT 1 | 0 or 1 |

### 3.10 `_meta`

Schema migration tracking. Single row.

| Column | Type | Notes |
|---|---|---|
| schema_version | INTEGER NOT NULL | Currently 1 |

---

## 4. Firestore schema (cloud)

Only ONE collection. Everything else stays local.

### 4.1 Collection: `leaderboard_entries`

One document per (team × activity) pair. Updated when a team beats their own
previous best. NO personally identifiable information.

**Document ID:** `{discriminator}_{activity_id}` — e.g. `DRP-4821_parachute_drop`

This makes lookups O(1) and updates idempotent — same team-activity always
writes to the same document.

**Document shape:**

```typescript
{
  team_name: string;          // "Drop Squad" — display label, no PII
  discriminator: string;      // "DRP-4821" — unique team ID
  grade_level: number;        // 3–9
  event_code: string | null;  // null = global leaderboard
  activity_id: string;        // "parachute_drop"
  best_score: number;         // The score (semantic per-activity, e.g. lower
                              // g-force = better; higher dB resolution = better)
  best_score_unit: string;    // "g", "dB", "ms" etc. for display
  attempt_count: number;      // How many times this team has tried this activity
  updated_at: Timestamp;      // Firestore server timestamp
}
```

**No `user_id` or `firebase_uid` is stored in Firestore.** Even though we know
which authenticated user created the entry, we don't write it. This means
leaderboard data is fully anonymous from a "who made this?" perspective.

### 4.2 Why no other collections

We considered putting `attempts`, `media`, `team_members` in Firestore. We
chose not to because:

- Privacy: no PII or media content should leave the device
- Cost: 30 teams × 7 activities × multiple attempts × video uploads would blow
  the free tier in a single classroom
- Complexity: bidirectional sync between SQLite and Firestore is hard. One-way
  push of summary scores is simple and reliable.

If a future version adds teacher dashboards, we'd add a `class_sessions`
collection then. Out of scope for v1.

### 4.3 Sync rules

**When a leaderboard entry is written to Firestore:**

After an attempt completes (`activity_attempts.status = 'completed'`), the app
checks if the new score is better than the team's previous best for that
activity. If yes, it writes to Firestore.

**Pseudocode:**
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const mediaType = pgEnum("media_type", ["MOVIE", "TV"]);
export const playlistVisibility = pgEnum("playlist_visibility", [
  "PRIVATE",
  "PUBLIC",
]);
export const watchStatus = pgEnum("watch_status", [
  "WANT_TO_WATCH",
  "WATCHING",
  "WATCHED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_normalized_uq").on(sql`lower(${table.email})`),
    check(
      "users_email_trimmed_ck",
      sql`${table.email} = trim(${table.email}) AND length(${table.email}) > 0`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull().default("TMDB"),
    externalId: integer("external_id").notNull(),
    mediaType: mediaType("media_type").notNull(),
    title: text("title").notNull(),
    overview: text("overview"),
    posterPath: text("poster_path"),
    releaseDate: date("release_date"),
    metadataUpdatedAt: timestamp("metadata_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("media_external_identity_uq").on(
      table.provider,
      table.mediaType,
      table.externalId,
    ),
    check("media_external_id_positive_ck", sql`${table.externalId} > 0`),
    check("media_title_not_blank_ck", sql`length(trim(${table.title})) > 0`),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaId] }),
    index("favorites_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaId] }),
    index("ratings_user_updated_idx").on(table.userId, table.updatedAt),
    check("ratings_score_range_ck", sql`${table.score} BETWEEN 1 AND 5`),
  ],
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 500 }),
    visibility: playlistVisibility("visibility").notNull().default("PRIVATE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("playlists_owner_created_idx").on(table.ownerId, table.createdAt),
    check(
      "playlists_name_trimmed_ck",
      sql`${table.name} = trim(${table.name}) AND length(${table.name}) BETWEEN 1 AND 80`,
    ),
  ],
);

export const playlistItems = pgTable(
  "playlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("playlist_items_playlist_media_uq").on(
      table.playlistId,
      table.mediaId,
    ),
    index("playlist_items_playlist_position_idx").on(
      table.playlistId,
      table.position,
    ),
    check(
      "playlist_items_position_nonnegative_ck",
      sql`${table.position} >= 0`,
    ),
  ],
);

export const userMediaStatuses = pgTable(
  "user_media_statuses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    status: watchStatus("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaId] }),
    index("user_media_statuses_user_status_idx").on(table.userId, table.status),
  ],
);

export const playlistAccesses = pgTable(
  "playlist_accesses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.playlistId] }),
    index("playlist_accesses_user_recent_idx").on(
      table.userId,
      table.lastAccessedAt,
    ),
  ],
);

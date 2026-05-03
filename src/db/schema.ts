import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  trusted: integer("trusted", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const inviteCodes = sqliteTable("invite_codes", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull().unique(),
  label: text("label"),
  maxUses: integer("max_uses").notNull(),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const animations = sqliteTable("animations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  stylePreset: text("style_preset").notNull().default("clean-teaching"),
  filePath: text("file_path").notNull(),
  sha256: text("sha256").notNull(),
  byteSize: integer("byte_size").notNull(),
  visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  reviewStatus: text("review_status", { enum: ["private", "pending", "approved", "rejected"] }).notNull().default("private"),
  rejectedReason: text("rejected_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  shaIdx: uniqueIndex("animations_sha256_unique").on(table.sha256),
}));

export const directoryItems = sqliteTable("directory_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  animationId: text("animation_id").notNull().references(() => animations.id, { onDelete: "cascade" }),
  customTitle: text("custom_title"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  detail: text("detail").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const aiSettings = sqliteTable("ai_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  customBaseUrl: text("custom_base_url"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  animations: many(animations),
  directoryItems: many(directoryItems),
  sessions: many(sessions),
}));

export const aiSettingRelations = relations(aiSettings, ({ one }) => ({
  user: one(users, {
    fields: [aiSettings.userId],
    references: [users.id],
  }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const animationRelations = relations(animations, ({ one, many }) => ({
  owner: one(users, {
    fields: [animations.ownerId],
    references: [users.id],
  }),
  directoryItems: many(directoryItems),
}));

export const directoryItemRelations = relations(directoryItems, ({ one }) => ({
  user: one(users, {
    fields: [directoryItems.userId],
    references: [users.id],
  }),
  animation: one(animations, {
    fields: [directoryItems.animationId],
    references: [animations.id],
  }),
}));

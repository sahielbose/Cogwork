import type { WorkflowSpec } from "@cogwork/spec";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Cogwork data model — COGWORK_CONTEXT.md §7.
 *
 * Notes:
 * - Encrypted OAuth tokens are stored as base64 `text` (AES-256-GCM envelope
 *   produced by @cogwork/connectors crypto). Functionally equivalent to the
 *   spec's `bytea`, and avoids cross-driver (postgres.js vs pglite) bytea quirks.
 * - Status/type columns are `text` with a `$type` union for compile-time safety
 *   (avoids brittle pg enums in migrations).
 */

export type WorkflowStatus = "draft" | "active" | "paused";
export type TriggerType = "manual" | "webhook" | "schedule";
export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "cancelled";
export type RunStepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type TriggerSource = "manual" | "schedule" | "webhook" | "api";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AuthType = "oauth2" | "api_key";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google' | 'slack' | 'notion' | 'github' | 'apify' ...
    label: text("label").notNull().default("default"),
    authType: text("auth_type").$type<AuthType>().notNull(),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    scopes: text("scopes").array(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    needsReauth: integer("needs_reauth").notNull().default(0), // 0/1 flag
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("connections_user_idx").on(t.userId)],
);

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    spec: jsonb("spec").$type<WorkflowSpec>().notNull(),
    compiledCode: text("compiled_code"),
    status: text("status").$type<WorkflowStatus>().notNull().default("draft"),
    triggerType: text("trigger_type").$type<TriggerType>().notNull(),
    scheduleCron: text("schedule_cron"),
    timezone: text("timezone"),
    webhookPath: text("webhook_path"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workflows_user_idx").on(t.userId),
    uniqueIndex("workflows_webhook_path_idx").on(t.webhookPath),
  ],
);

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    spec: jsonb("spec").$type<WorkflowSpec>().notNull(),
    compiledCode: text("compiled_code"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workflow_versions_unique").on(t.workflowId, t.version)],
);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    workflowVersion: integer("workflow_version").notNull(),
    status: text("status").$type<RunStatus>().notNull().default("queued"),
    triggerSource: text("trigger_source").$type<TriggerSource>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    tokenInput: integer("token_input").notNull().default(0),
    tokenOutput: integer("token_output").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("runs_workflow_idx").on(t.workflowId)],
);

export const runSteps = pgTable(
  "run_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    itemIndex: integer("item_index").notNull().default(0), // forEach index, 0 for single
    tool: text("tool").notNull(),
    status: text("status").$type<RunStepStatus>().notNull().default("pending"),
    input: jsonb("input"), // secrets redacted before persist
    output: jsonb("output"), // secrets redacted before persist
    error: text("error"),
    attempt: integer("attempt").notNull().default(1),
    idempotencyKey: text("idempotency_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("run_steps_run_idx").on(t.runId),
    uniqueIndex("run_steps_idempotency_idx").on(t.runId, t.stepId, t.itemIndex),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    itemIndex: integer("item_index").notNull().default(0),
    status: text("status").$type<ApprovalStatus>().notNull().default("pending"),
    preview: jsonb("preview").$type<Record<string, unknown>>(), // redacted summary
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("approvals_run_idx").on(t.runId),
    uniqueIndex("approvals_unique").on(t.runId, t.stepId, t.itemIndex),
  ],
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("preferences_user_key_idx").on(t.userId, t.key)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_user_idx").on(t.userId)],
);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  scopes: text("scopes").array().notNull().default([]), // 'read'|'write'|'execute'
  label: text("label"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations (typed joins) ──────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  connections: many(connections),
  workflows: many(workflows),
  preferences: many(preferences),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  runs: many(runs),
  versions: many(workflowVersions),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  workflow: one(workflows, { fields: [runs.workflowId], references: [workflows.id] }),
  steps: many(runSteps),
  approvals: many(approvals),
}));

export const runStepsRelations = relations(runSteps, ({ one }) => ({
  run: one(runs, { fields: [runSteps.runId], references: [runs.id] }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  run: one(runs, { fields: [approvals.runId], references: [runs.id] }),
}));

// ── Inferred row types ───────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;

export const schema = {
  users,
  connections,
  workflows,
  workflowVersions,
  runs,
  runSteps,
  approvals,
  preferences,
  auditLog,
  apiKeys,
  usersRelations,
  workflowsRelations,
  runsRelations,
  runStepsRelations,
  approvalsRelations,
};

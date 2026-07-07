import { mysqlTable, serial, varchar, text, timestamp, int, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseRequestsTable = mysqlTable("purchase_requests", {
  id: serial("id").primaryKey(),
  requestNumber: varchar("request_number", { length: 255 }).notNull().unique(),
  requesterEmail: text("requester_email").notNull(),
  department: text("department").notNull(),
  itemDescription: text("item_description").notNull(),
  quantity: int("quantity").notNull(),
  vendorId: int("vendor_id").notNull(),
  reason: text("reason").notNull(),
  managerEmail: text("manager_email").notNull(),
  status: varchar("status", { length: 64 }).notNull().default("pending_manager"),
  estimatedAmount: double("estimated_amount"),
  finalAmount: double("final_amount"),
  managerNote: text("manager_note"),
  accountsNote: text("accounts_note"),
  clarificationQuestion: text("clarification_question"),
  clarificationAnswer: text("clarification_answer"),
  executedAt: timestamp("executed_at"),
  executedBy: text("executed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requestActivitiesTable = mysqlTable("request_activities", {
  id: serial("id").primaryKey(),
  requestId: int("request_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseRequestSchema = createInsertSchema(purchaseRequestsTable).omit({
  id: true, requestNumber: true, status: true, createdAt: true, updatedAt: true,
  managerNote: true, accountsNote: true, clarificationQuestion: true, clarificationAnswer: true,
  executedAt: true, executedBy: true, finalAmount: true,
});
export type InsertPurchaseRequest = z.infer<typeof insertPurchaseRequestSchema>;
export type PurchaseRequest = typeof purchaseRequestsTable.$inferSelect;

export const insertRequestActivitySchema = createInsertSchema(requestActivitiesTable).omit({ id: true, createdAt: true });
export type InsertRequestActivity = z.infer<typeof insertRequestActivitySchema>;
export type RequestActivity = typeof requestActivitiesTable.$inferSelect;

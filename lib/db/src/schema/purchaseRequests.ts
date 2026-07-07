import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseRequestsTable = pgTable("purchase_requests", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  requesterEmail: text("requester_email").notNull(),
  department: text("department").notNull(),
  itemDescription: text("item_description").notNull(),
  quantity: integer("quantity").notNull(),
  vendorId: integer("vendor_id").notNull(),
  reason: text("reason").notNull(),
  managerEmail: text("manager_email").notNull(),
  status: text("status").notNull().default("pending_manager"),
  estimatedAmount: real("estimated_amount"),
  finalAmount: real("final_amount"),
  managerNote: text("manager_note"),
  accountsNote: text("accounts_note"),
  clarificationQuestion: text("clarification_question"),
  clarificationAnswer: text("clarification_answer"),
  executedAt: timestamp("executed_at"),
  executedBy: text("executed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requestActivitiesTable = pgTable("request_activities", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
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

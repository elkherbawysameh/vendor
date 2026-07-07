import { Router } from "express";
import { db } from "@workspace/db";
import {
  purchaseRequestsTable,
  requestActivitiesTable,
  vendorsTable,
  vendorCategoryLinksTable,
  vendorDocumentsTable,
  vendorCategoriesTable,
  vendorTransactionsTable,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  CreatePurchaseRequestBody,
  ApprovePurchaseRequestBody,
  ApprovePurchaseRequestParams,
  RejectPurchaseRequestBody,
  RejectPurchaseRequestParams,
  ClarifiyPurchaseRequestBody,
  ClarifiyPurchaseRequestParams,
  GetPurchaseRequestParams,
} from "@workspace/api-zod";

const router = Router();

async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseRequestsTable);
  const count = Number(result[0]?.count ?? 0) + 1;
  return `PR-${year}-${String(count).padStart(3, "0")}`;
}

async function enrichRequest(req: typeof purchaseRequestsTable.$inferSelect) {
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, req.vendorId));
  let vendorEnriched = null;
  if (vendor) {
    const categories = await db
      .select({ id: vendorCategoriesTable.id, name: vendorCategoriesTable.name })
      .from(vendorCategoryLinksTable)
      .innerJoin(vendorCategoriesTable, eq(vendorCategoryLinksTable.categoryId, vendorCategoriesTable.id))
      .where(eq(vendorCategoryLinksTable.vendorId, vendor.id));
    vendorEnriched = { ...vendor, categories, documents: [], categoryIds: categories.map((c) => c.id), totalSpent: null, transactionCount: null };
  }
  return { ...req, vendor: vendorEnriched };
}

// GET /purchase-requests
router.get("/purchase-requests", async (req, res) => {
  const { status, vendorId, requesterEmail, managerEmail } = req.query as Record<string, string | undefined>;
  let rows = await db.select().from(purchaseRequestsTable).orderBy(sql`${purchaseRequestsTable.createdAt} desc`);
  if (status) rows = rows.filter((r) => r.status === status);
  if (vendorId) rows = rows.filter((r) => r.vendorId === Number(vendorId));
  if (requesterEmail) rows = rows.filter((r) => r.requesterEmail === requesterEmail);
  if (managerEmail) rows = rows.filter((r) => r.managerEmail === managerEmail);
  const enriched = await Promise.all(rows.map(enrichRequest));
  return res.json(enriched);
});

// POST /purchase-requests
router.post("/purchase-requests", async (req, res) => {
  const parsed = CreatePurchaseRequestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const requestNumber = await generateRequestNumber();
  const [created] = await db
    .insert(purchaseRequestsTable)
    .values({ ...parsed.data, requestNumber, status: "pending_manager" })
    .returning();
  await db.insert(requestActivitiesTable).values({
    requestId: created.id,
    actorEmail: created.requesterEmail,
    action: "submitted",
    note: `طلب شراء جديد: ${created.itemDescription}`,
  });
  return res.status(201).json(await enrichRequest(created));
});

// GET /purchase-requests/:id
router.get("/purchase-requests/:id", async (req, res) => {
  const params = GetPurchaseRequestParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, params.data.id));
  if (!row) return res.status(404).json({ error: "Request not found" });
  return res.json(await enrichRequest(row));
});

// POST /purchase-requests/:id/approve
router.post("/purchase-requests/:id/approve", async (req, res) => {
  const params = ApprovePurchaseRequestParams.safeParse({ id: Number(req.params.id) });
  const body = ApprovePurchaseRequestBody.safeParse(req.body);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, params.data.id));
  if (!row) return res.status(404).json({ error: "Request not found" });

  let newStatus: string;
  let actorNote: string;
  let actorEmail = req.cookies?.user_email || row.managerEmail;

  if (row.status === "pending_manager" || row.status === "pending_clarification_employee_manager") {
    newStatus = "approved_by_manager";
    actorNote = body.data?.note || "تمت الموافقة من المدير";
  } else if (row.status === "approved_by_manager" || row.status === "pending_clarification_employee_accounts") {
    newStatus = "approved_by_accounts";
    actorNote = body.data?.note || "تمت الموافقة من مدير الحسابات";
  } else {
    return res.status(400).json({ error: "Cannot approve in current status" });
  }

  const [updated] = await db
    .update(purchaseRequestsTable)
    .set({
      status: newStatus,
      managerNote: newStatus === "approved_by_manager" ? (body.data?.note ?? undefined) : row.managerNote,
      accountsNote: newStatus === "approved_by_accounts" ? (body.data?.note ?? undefined) : row.accountsNote,
      updatedAt: new Date(),
    })
    .where(eq(purchaseRequestsTable.id, params.data.id))
    .returning();

  await db.insert(requestActivitiesTable).values({
    requestId: params.data.id,
    actorEmail,
    action: "approved",
    note: actorNote,
  });

  return res.json(await enrichRequest(updated));
});

// POST /purchase-requests/:id/reject
router.post("/purchase-requests/:id/reject", async (req, res) => {
  const params = RejectPurchaseRequestParams.safeParse({ id: Number(req.params.id) });
  const body = RejectPurchaseRequestBody.safeParse(req.body);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, params.data.id));
  if (!row) return res.status(404).json({ error: "Request not found" });

  let newStatus: string;
  const actorEmail = req.cookies?.user_email || row.managerEmail;

  if (row.status === "pending_manager" || row.status === "pending_clarification_employee_manager") {
    newStatus = "rejected_by_manager";
  } else if (row.status === "approved_by_manager" || row.status === "pending_clarification_employee_accounts") {
    newStatus = "rejected_by_accounts";
  } else {
    return res.status(400).json({ error: "Cannot reject in current status" });
  }

  const [updated] = await db
    .update(purchaseRequestsTable)
    .set({
      status: newStatus,
      managerNote: newStatus === "rejected_by_manager" ? (body.data?.note ?? undefined) : row.managerNote,
      accountsNote: newStatus === "rejected_by_accounts" ? (body.data?.note ?? undefined) : row.accountsNote,
      updatedAt: new Date(),
    })
    .where(eq(purchaseRequestsTable.id, params.data.id))
    .returning();

  await db.insert(requestActivitiesTable).values({
    requestId: params.data.id,
    actorEmail,
    action: "rejected",
    note: body.data?.note || "تم رفض الطلب",
  });

  return res.json(await enrichRequest(updated));
});

// POST /purchase-requests/:id/clarify
router.post("/purchase-requests/:id/clarify", async (req, res) => {
  const params = ClarifiyPurchaseRequestParams.safeParse({ id: Number(req.params.id) });
  const body = ClarifiyPurchaseRequestBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, params.data.id));
  if (!row) return res.status(404).json({ error: "Request not found" });

  let newStatus: string;
  const actorEmail = req.cookies?.user_email || row.managerEmail;

  if (row.status === "pending_manager") {
    newStatus = "pending_clarification_employee_manager";
  } else if (row.status === "approved_by_manager") {
    newStatus = "pending_clarification_employee_accounts";
  } else {
    return res.status(400).json({ error: "Cannot request clarification in current status" });
  }

  const [updated] = await db
    .update(purchaseRequestsTable)
    .set({
      status: newStatus,
      clarificationQuestion: body.data.note,
      clarificationAnswer: null,
      updatedAt: new Date(),
    })
    .where(eq(purchaseRequestsTable.id, params.data.id))
    .returning();

  await db.insert(requestActivitiesTable).values({
    requestId: params.data.id,
    actorEmail,
    action: "clarification_requested",
    note: body.data.note,
  });

  return res.json(await enrichRequest(updated));
});

// POST /purchase-requests/:id/respond
router.post("/purchase-requests/:id/respond", async (req, res) => {
  const id = Number(req.params.id);
  const { answer, updatedQuantity, updatedReason, updatedManagerEmail } = req.body as {
    answer: string;
    updatedQuantity?: number;
    updatedReason?: string;
    updatedManagerEmail?: string;
  };
  if (!answer) return res.status(400).json({ error: "Answer is required" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
  if (!row) return res.status(404).json({ error: "Request not found" });

  let newStatus: string;
  if (row.status === "pending_clarification_employee_manager") {
    newStatus = "pending_manager";
  } else if (row.status === "pending_clarification_employee_accounts") {
    newStatus = "approved_by_manager";
  } else {
    return res.status(400).json({ error: "Not pending clarification" });
  }

  const updateData: Partial<typeof purchaseRequestsTable.$inferSelect> = {
    status: newStatus,
    clarificationAnswer: answer,
    updatedAt: new Date(),
  };
  if (updatedQuantity) updateData.quantity = updatedQuantity;
  if (updatedReason) updateData.reason = updatedReason;
  if (updatedManagerEmail) updateData.managerEmail = updatedManagerEmail;

  const [updated] = await db
    .update(purchaseRequestsTable)
    .set(updateData)
    .where(eq(purchaseRequestsTable.id, id))
    .returning();

  await db.insert(requestActivitiesTable).values({
    requestId: id,
    actorEmail: row.requesterEmail,
    action: "clarification_answered",
    note: answer,
  });

  return res.json(await enrichRequest(updated));
});

// POST /purchase-requests/:id/execute
router.post("/purchase-requests/:id/execute", async (req, res) => {
  const id = Number(req.params.id);
  const { executedByEmail, finalAmount, notes } = req.body as {
    executedByEmail: string;
    finalAmount: number;
    notes?: string;
  };
  if (!executedByEmail || !finalAmount) return res.status(400).json({ error: "executedByEmail and finalAmount required" });
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
  if (!row) return res.status(404).json({ error: "Request not found" });
  if (row.status !== "approved_by_accounts") return res.status(400).json({ error: "Request not approved for execution" });

  const now = new Date();
  const [updated] = await db
    .update(purchaseRequestsTable)
    .set({ status: "executed", finalAmount, executedAt: now, executedBy: executedByEmail, updatedAt: now })
    .where(eq(purchaseRequestsTable.id, id))
    .returning();

  await db.insert(vendorTransactionsTable).values({
    vendorId: row.vendorId,
    purchaseRequestId: id,
    amount: finalAmount,
    quantity: row.quantity,
    executedAt: now,
    executedBy: executedByEmail,
    notes: notes ?? null,
  });

  await db.insert(requestActivitiesTable).values({
    requestId: id,
    actorEmail: executedByEmail,
    action: "executed",
    note: `تم التنفيذ بمبلغ ${finalAmount}`,
  });

  return res.json(await enrichRequest(updated));
});

// POST /purchase-requests/:id/reorder
router.post("/purchase-requests/:id/reorder", async (req, res) => {
  const id = Number(req.params.id);
  const { requesterEmail, quantity, reason, managerEmail, estimatedAmount } = req.body as {
    requesterEmail: string;
    quantity: number;
    reason: string;
    managerEmail: string;
    estimatedAmount?: number;
  };
  const [row] = await db.select().from(purchaseRequestsTable).where(eq(purchaseRequestsTable.id, id));
  if (!row) return res.status(404).json({ error: "Request not found" });
  const requestNumber = await generateRequestNumber();
  const [created] = await db
    .insert(purchaseRequestsTable)
    .values({
      requestNumber,
      requesterEmail,
      department: row.department,
      itemDescription: row.itemDescription,
      quantity,
      vendorId: row.vendorId,
      reason,
      managerEmail,
      status: "pending_manager",
      estimatedAmount: estimatedAmount ?? undefined,
    })
    .returning();
  await db.insert(requestActivitiesTable).values({
    requestId: created.id,
    actorEmail: requesterEmail,
    action: "submitted",
    note: `إعادة طلب من ${row.requestNumber}`,
  });
  return res.status(201).json(await enrichRequest(created));
});

// GET /purchase-requests/:id/activities
router.get("/purchase-requests/:id/activities", async (req, res) => {
  const id = Number(req.params.id);
  const activities = await db
    .select()
    .from(requestActivitiesTable)
    .where(eq(requestActivitiesTable.requestId, id))
    .orderBy(requestActivitiesTable.createdAt);
  return res.json(activities);
});

export default router;

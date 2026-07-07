import { Router } from "express";
import { db } from "@workspace/db";
import {
  purchaseRequestsTable,
  vendorsTable,
  vendorTransactionsTable,
  vendorDocumentsTable,
} from "@workspace/db";
import { sql, eq, and } from "drizzle-orm";

const router = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(purchaseRequestsTable);
  const totalVendorsResult = await db.select({ count: sql<number>`count(*)` }).from(vendorsTable);
  const spendingResult = await db
    .select({ total: sql<number>`coalesce(sum(${vendorTransactionsTable.amount}), 0)` })
    .from(vendorTransactionsTable);

  const statuses = ["pending_manager", "pending_clarification_employee_manager", "pending_clarification_employee_accounts", "approved_by_manager"];
  const pendingRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseRequestsTable)
    .where(sql`${purchaseRequestsTable.status} in ('pending_manager','pending_clarification_employee_manager','pending_clarification_employee_accounts','approved_by_manager')`);

  const approvedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseRequestsTable)
    .where(sql`${purchaseRequestsTable.status} in ('approved_by_accounts','executed')`);

  const rejectedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseRequestsTable)
    .where(sql`${purchaseRequestsTable.status} in ('rejected_by_manager','rejected_by_accounts')`);

  const executedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseRequestsTable)
    .where(eq(purchaseRequestsTable.status, "executed"));

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const expiringResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(vendorDocumentsTable)
    .where(
      and(
        sql`${vendorDocumentsTable.expiryDate} is not null`,
        sql`${vendorDocumentsTable.expiryDate} >= ${today}`,
        sql`${vendorDocumentsTable.expiryDate} <= ${thirtyDaysFromNow}`
      )
    );

  return res.json({
    totalRequests: Number(totalResult[0]?.count ?? 0),
    pendingRequests: Number(pendingRows[0]?.count ?? 0),
    approvedRequests: Number(approvedRows[0]?.count ?? 0),
    rejectedRequests: Number(rejectedRows[0]?.count ?? 0),
    executedRequests: Number(executedRows[0]?.count ?? 0),
    totalVendors: Number(totalVendorsResult[0]?.count ?? 0),
    totalSpent: Number(spendingResult[0]?.total ?? 0),
    expiringDocuments: Number(expiringResult[0]?.count ?? 0),
  });
});

// GET /dashboard/vendor-spending
router.get("/dashboard/vendor-spending", async (req, res) => {
  const rows = await db
    .select({
      vendorId: vendorTransactionsTable.vendorId,
      companyName: vendorsTable.companyName,
      totalSpent: sql<number>`sum(${vendorTransactionsTable.amount})`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(vendorTransactionsTable)
    .innerJoin(vendorsTable, eq(vendorTransactionsTable.vendorId, vendorsTable.id))
    .groupBy(vendorTransactionsTable.vendorId, vendorsTable.companyName)
    .orderBy(sql`sum(${vendorTransactionsTable.amount}) desc`);

  return res.json(
    rows.map((r) => ({
      vendorId: r.vendorId,
      vendorName: r.companyName,
      totalSpent: Number(r.totalSpent),
      transactionCount: Number(r.transactionCount),
    }))
  );
});

// GET /dashboard/recent-activity
router.get("/dashboard/recent-activity", async (req, res) => {
  const rows = await db
    .select()
    .from(purchaseRequestsTable)
    .orderBy(sql`${purchaseRequestsTable.updatedAt} desc`)
    .limit(10);
  return res.json(rows.map((r) => ({ ...r, vendor: null })));
});

// GET /dashboard/status-breakdown
router.get("/dashboard/status-breakdown", async (req, res) => {
  const rows = await db
    .select({
      status: purchaseRequestsTable.status,
      count: sql<number>`count(*)`,
    })
    .from(purchaseRequestsTable)
    .groupBy(purchaseRequestsTable.status);

  return res.json(rows.map((r) => ({ status: r.status, count: Number(r.count) })));
});

export default router;

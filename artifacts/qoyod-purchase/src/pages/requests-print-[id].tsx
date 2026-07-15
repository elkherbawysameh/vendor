import {
  useGetPurchaseRequest,
  useListPurchaseRequestActivities,
  getGetPurchaseRequestQueryKey,
  getListPurchaseRequestActivitiesQueryKey,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusInfo } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function RequestPrintPage() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: request, isLoading } = useGetPurchaseRequest(id, {
    query: { enabled: !!id, queryKey: getGetPurchaseRequestQueryKey(id) }
  });
  const { data: activities } = useListPurchaseRequestActivities(id, {
    query: { enabled: !!id, queryKey: getListPurchaseRequestActivitiesQueryKey(id) }
  });

  if (isLoading || !request) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const approvals = (activities ?? []).filter(a => a.action === "approved");
  const managerApproval = approvals[0];
  const accountsApproval = approvals[1];
  const attachmentActivity = (activities ?? []).find(
    a => a.action === (request.type === "refund" ? "invoice_submitted" : "vendor_assigned")
  );
  const statusInfo = getStatusInfo(request.status);
  const isRefund = request.type === "refund";

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0 print:max-w-none">
      <div className="flex justify-end mb-6 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="border rounded-lg p-8 print:border-none print:p-0 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">{isRefund ? "Refund Request" : "Purchase Request"}</h1>
            <p className="text-sm text-muted-foreground">{request.requestNumber}</p>
          </div>
          <div className="text-right">
            <div className="font-semibold">{statusInfo.label}</div>
            <div className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Requester</div>
            <div className="font-medium">{request.requesterEmail}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Department</div>
            <div className="font-medium">{request.department}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Manager</div>
            <div className="font-medium">{request.managerEmail}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Quantity</div>
            <div className="font-medium">{request.quantity}</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-1">{isRefund ? "Reason for Refund" : "Item / Reason"}</div>
          <div className="text-sm border rounded p-3 bg-muted/20">{request.reason}</div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Manager Approval</h2>
          {managerApproval ? (
            <div className="text-sm space-y-1">
              <div>Approved by <span className="font-medium">{managerApproval.actorEmail}</span> on {formatDate(managerApproval.createdAt)}</div>
              {managerApproval.note && <div className="italic text-muted-foreground">"{managerApproval.note}"</div>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Not yet approved.</div>
          )}
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">{isRefund ? "Invoice" : "Vendor & Quotation"}</h2>
          <div className="text-sm space-y-1">
            {!isRefund && request.vendor && (
              <div>Vendor: <span className="font-medium">{request.vendor.companyName}</span></div>
            )}
            {request.quotationAmount != null && (
              <div>{isRefund ? "Total Amount" : "Quotation Amount"}: <span className="font-medium">{formatCurrency(request.quotationAmount)}</span></div>
            )}
            {(isRefund ? request.invoiceUrl : request.quotationUrl) && (
              <div>
                Document: <a
                  href={(isRefund ? request.invoiceUrl : request.quotationUrl) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline print:no-underline"
                >
                  {isRefund ? request.invoiceUrl : request.quotationUrl}
                </a>
              </div>
            )}
            {attachmentActivity && (
              <div className="text-muted-foreground">Attached by {attachmentActivity.actorEmail} on {formatDate(attachmentActivity.createdAt)}</div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Accounts Approval</h2>
          {accountsApproval ? (
            <div className="text-sm space-y-1">
              <div>Approved by <span className="font-medium">{accountsApproval.actorEmail}</span> on {formatDate(accountsApproval.createdAt)}</div>
              {accountsApproval.note && <div className="italic text-muted-foreground">"{accountsApproval.note}"</div>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Not yet approved.</div>
          )}
        </div>

        {request.status === "executed" && (
          <div className="border-t pt-4">
            <h2 className="font-semibold mb-2">Execution</h2>
            <div className="text-sm space-y-1">
              <div>Executed by <span className="font-medium">{request.executedBy}</span> on {request.executedAt ? formatDate(request.executedAt) : "-"}</div>
              {request.finalAmount != null && (
                <div>Final Amount: <span className="font-medium">{formatCurrency(request.finalAmount)}</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

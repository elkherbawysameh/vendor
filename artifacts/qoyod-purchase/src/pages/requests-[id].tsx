import { useAuth } from "@/hooks/use-auth";
import {
  useGetPurchaseRequest,
  useListPurchaseRequestActivities,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
  useClarifiyPurchaseRequest,
  useRespondToClarification,
  useExecutePurchaseRequest,
  useAssignPurchaseRequestVendor,
  useListVendors,
  getListVendorsQueryKey,
  getGetPurchaseRequestQueryKey,
  getListPurchaseRequestActivitiesQueryKey,
} from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Activity, AlertCircle, CheckCircle, Clock, Send, DollarSign, Building2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusInfo } from "@/lib/constants";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function RequestDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: request, isLoading } = useGetPurchaseRequest(id, {
    query: { enabled: !!id, queryKey: getGetPurchaseRequestQueryKey(id) }
  });

  const { data: activities, isLoading: activitiesLoading } = useListPurchaseRequestActivities(id, {
    query: { enabled: !!id, queryKey: getListPurchaseRequestActivitiesQueryKey(id) }
  });

  // Action states
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "clarify" | "respond" | "execute" | null>(null);
  const [note, setNote] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [quotationUrl, setQuotationUrl] = useState("");

  // Mutations
  const approveMut = useApprovePurchaseRequest();
  const rejectMut = useRejectPurchaseRequest();
  const clarifyMut = useClarifiyPurchaseRequest();
  const respondMut = useRespondToClarification();
  const executeMut = useExecutePurchaseRequest();
  const assignVendorMut = useAssignPurchaseRequestVendor();

  const { data: vendors, isLoading: vendorsLoading } = useListVendors(undefined, {
    query: { enabled: request?.status === "pending_vendor_assignment" && user?.role === "admin", queryKey: getListVendorsQueryKey() },
  });

  if (isLoading || !request || !user) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 h-96"><Skeleton className="w-full h-full" /></Card>
          <Card className="h-96"><Skeleton className="w-full h-full" /></Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);
  
  // Role checks for actions
  const isRequester = user.email === request.requesterEmail;
  const isManager = user.email === request.managerEmail;
  const isAccountsManager = user.role === "admin" || user.role === "accounts_manager";
  const isAccountsEmployee = user.role === "accounts_employee";

  const canApproveReject = 
    (request.status === "pending_manager" && isManager) || 
    (request.status === "approved_by_manager" && isAccountsManager) ||
    (request.status === "pending_clarification_employee_manager" && isManager) ||
    (request.status === "pending_clarification_employee_accounts" && isAccountsManager);
    
  const canClarify = canApproveReject;
  
  const canRespond = 
    isRequester && 
    (request.status === "pending_clarification_employee_manager" || 
     request.status === "pending_clarification_employee_accounts");

  const canExecute = 
    request.status === "approved_by_accounts" && 
    (isAccountsEmployee || isAccountsManager);

  const handleAction = async () => {
    try {
      if (actionModal === "approve") {
        await approveMut.mutateAsync({ id, data: { note: note || undefined } });
      } else if (actionModal === "reject") {
        await rejectMut.mutateAsync({ id, data: { note: note || undefined } });
      } else if (actionModal === "clarify") {
        await clarifyMut.mutateAsync({ id, data: { note } });
      } else if (actionModal === "respond") {
        await respondMut.mutateAsync({ id, data: { answer: clarificationAnswer } });
      } else if (actionModal === "execute") {
        await executeMut.mutateAsync({ 
          id, 
          data: { executedByEmail: user.email, finalAmount: Number(finalAmount), notes: note || undefined } 
        });
      }
      
      toast({
        title: "Success",
        description: `Request successfully updated.`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: getGetPurchaseRequestQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPurchaseRequestActivitiesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      
      setActionModal(null);
      setNote("");
      setFinalAmount("");
      setClarificationAnswer("");
    } catch (error) {
      toast({
        title: "Action failed",
        description: "An error occurred while processing your request.",
        variant: "destructive"
      });
    }
  };

  const handleAssignVendor = async () => {
    if (!quotationUrl.trim() || (!request?.vendor && !selectedVendorId)) return;
    try {
      await assignVendorMut.mutateAsync({
        id,
        data: {
          quotationUrl,
          vendorId: request?.vendor ? undefined : Number(selectedVendorId),
        },
      });
      toast({ title: "Sent to accounts" });
      queryClient.invalidateQueries({ queryKey: getGetPurchaseRequestQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPurchaseRequestActivitiesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setSelectedVendorId("");
      setQuotationUrl("");
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/requests">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary">{request.requestNumber}</h1>
              <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">{statusInfo.label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Submitted on {formatDate(request.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {canApproveReject && (
            <>
              <Button variant="outline" className="text-info border-info/30 hover:bg-info/10" onClick={() => setActionModal("clarify")}>
                Request Clarification
              </Button>
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setActionModal("reject")}>
                Reject
              </Button>
              <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => setActionModal("approve")}>
                Approve Request
              </Button>
            </>
          )}
          
          {canRespond && (
            <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={() => setActionModal("respond")}>
              Respond to Clarification
            </Button>
          )}
          
          {canExecute && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setActionModal("execute")}>
              <DollarSign className="w-4 h-4 mr-2" />
              Execute Purchase
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Purchase Details / تفاصيل الشراء
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">{request.itemDescription}</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-muted px-3 py-1 rounded-full text-muted-foreground">Qty: <span className="font-bold text-foreground">{request.quantity}</span></div>
                  <div className="bg-muted px-3 py-1 rounded-full text-muted-foreground">Dept: <span className="font-bold text-foreground">{request.department}</span></div>
                  {request.estimatedAmount && (
                    <div className="bg-muted px-3 py-1 rounded-full text-muted-foreground">Est: <span className="font-bold text-foreground">{formatCurrency(request.estimatedAmount)}</span></div>
                  )}
                  {request.finalAmount && (
                    <div className="bg-success/10 text-success px-3 py-1 rounded-full font-bold">Final: {formatCurrency(request.finalAmount)}</div>
                  )}
                  {request.quotationUrl && (
                    <a
                      href={request.quotationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-info/10 text-info px-3 py-1 rounded-full font-medium hover:underline"
                    >
                      View Quotation
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Business Justification / مبرر العمل</Label>
                <div className="bg-muted/30 p-4 rounded-md text-sm leading-relaxed border">
                  {request.reason}
                </div>
              </div>

              {request.clarificationQuestion && (
                <div className="bg-info/5 border border-info/20 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-info flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" /> 
                    Clarification Requested
                  </h4>
                  <p className="text-sm text-foreground/80 mb-3">{request.clarificationQuestion}</p>
                  
                  {request.clarificationAnswer ? (
                    <div className="bg-background rounded p-3 text-sm border-l-2 border-info">
                      <span className="text-xs text-muted-foreground block mb-1">Answer from Requester:</span>
                      {request.clarificationAnswer}
                    </div>
                  ) : canRespond ? (
                    <div className="space-y-3 mt-4 pt-4 border-t border-info/20">
                      <Label>Your Answer:</Label>
                      <Textarea 
                        placeholder="Provide details to clarify..." 
                        value={clarificationAnswer}
                        onChange={(e) => setClarificationAnswer(e.target.value)}
                        className="bg-background border-info/30"
                      />
                      <Button size="sm" onClick={() => setActionModal("respond")} disabled={!clarificationAnswer.trim()}>
                        <Send className="w-4 h-4 mr-2" /> Submit Answer
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-warning italic mt-2">Waiting for requester to answer...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {request.status === "pending_vendor_assignment" && (
            <Card className="border-warning/30">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-warning" />
                  Vendor & Quotation / المورد وعرض السعر
                </CardTitle>
                <CardDescription>
                  {request.vendor
                    ? `Vendor: ${request.vendor.companyName}. Attach the quotation to send this to accounts.`
                    : request.category
                      ? `The requester picked the "${request.category.name}" category -- pick the vendor and attach a quotation.`
                      : "The requester couldn't find a matching category (Other) -- pick the vendor and attach a quotation."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {user.role === "admin" ? (
                  <div className="space-y-3">
                    {!request.vendor && (
                      <Select disabled={vendorsLoading} value={selectedVendorId} onValueChange={setSelectedVendorId}>
                        <SelectTrigger>
                          <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors?.map((vendor) => (
                            <SelectItem key={vendor.id} value={String(vendor.id)}>{vendor.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={quotationUrl}
                      onChange={(e) => setQuotationUrl(e.target.value)}
                      placeholder="Quotation link (Google Drive)"
                    />
                    <Button
                      onClick={handleAssignVendor}
                      disabled={!quotationUrl.trim() || (!request.vendor && !selectedVendorId) || assignVendorMut.isPending}
                    >
                      {assignVendorMut.isPending ? "Sending..." : "Send to Accounts"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Waiting for an admin to {request.vendor ? "attach a quotation" : "assign a vendor and attach a quotation"}.</p>
                )}
              </CardContent>
            </Card>
          )}

          {request.vendor && (
            <Card>
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Vendor Information / معلومات المورد
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Company Name</Label>
                    <div className="font-medium mt-1">{request.vendor.companyName}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact</Label>
                    <div className="font-medium mt-1">
                      {request.vendor.contactPerson || '-'}
                      <div className="text-sm text-muted-foreground font-normal">{request.vendor.contactEmail}</div>
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-4 border-t">
                    <Label className="text-xs text-muted-foreground block mb-2">Banking Details</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground mr-2">Bank:</span>{request.vendor.bankName || '-'}</div>
                      <div><span className="text-muted-foreground mr-2">Acc:</span>{request.vendor.bankAccountNumber || '-'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground mr-2">IBAN:</span><span className="font-mono">{request.vendor.iban || '-'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t flex justify-end">
                  <Link href={`/vendors/${request.vendorId}`}>
                    <Button variant="outline" size="sm">View Full Vendor Profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Key Personnel</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Requester</Label>
                <div className="font-medium">{request.requesterEmail.split('@')[0]}</div>
                <div className="text-muted-foreground">{request.requesterEmail}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Approving Manager</Label>
                <div className="font-medium">{request.managerEmail.split('@')[0]}</div>
                <div className="text-muted-foreground">{request.managerEmail}</div>
              </div>
              {request.executedBy && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Executed By</Label>
                    <div className="font-medium">{request.executedBy.split('@')[0]}</div>
                    <div className="text-muted-foreground">{request.executedBy}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {activitiesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-border">
                  {activities.map((activity, i) => (
                    <div key={activity.id} className="relative flex items-start gap-4">
                      <div className="absolute left-0 mt-1.5 w-6 h-6 rounded-full bg-background border-2 border-primary z-10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div className="pl-10 pb-1 w-full">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-semibold text-sm capitalize leading-none">{activity.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(activity.createdAt)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">{activity.actorEmail.split('@')[0]}</div>
                        {activity.note && (
                          <div className="text-sm bg-muted/50 p-2 rounded mt-1 italic border-l-2 border-muted-foreground/30">
                            "{activity.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No activity recorded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Modals */}
      <Dialog open={actionModal !== null} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal === 'approve' && 'Approve Request'}
              {actionModal === 'reject' && 'Reject Request'}
              {actionModal === 'clarify' && 'Request Clarification'}
              {actionModal === 'respond' && 'Respond to Clarification'}
              {actionModal === 'execute' && 'Execute Purchase'}
            </DialogTitle>
            <DialogDescription>
              {actionModal === 'approve' && 'You are about to approve this request and forward it to the next step.'}
              {actionModal === 'reject' && 'You are rejecting this request. It will not be processed further.'}
              {actionModal === 'clarify' && 'Send this back to the requester for more information.'}
              {actionModal === 'respond' && 'Provide the requested details to move this request forward.'}
              {actionModal === 'execute' && 'Confirm that the PO has been created and payment processed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionModal === 'execute' && (
              <div className="space-y-2">
                <Label>Final Actual Amount (EGP) <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                  placeholder={request.estimatedAmount?.toString() || "0.00"}
                />
              </div>
            )}
            
            {actionModal === 'respond' ? (
              <div className="space-y-2">
                <Label>Your Answer <span className="text-destructive">*</span></Label>
                <Textarea 
                  value={clarificationAnswer}
                  onChange={(e) => setClarificationAnswer(e.target.value)}
                  placeholder="Type your response here..."
                  className="h-24"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  Notes {actionModal === 'clarify' ? <span className="text-destructive">*</span> : '(Optional)'}
                </Label>
                <Textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    actionModal === 'clarify' 
                      ? "What needs clarification?" 
                      : "Add any internal notes..."
                  }
                  className="h-24"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button 
              variant={actionModal === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={
                approveMut.isPending || 
                rejectMut.isPending || 
                clarifyMut.isPending || 
                respondMut.isPending || 
                executeMut.isPending ||
                (actionModal === 'clarify' && !note.trim()) ||
                (actionModal === 'respond' && !clarificationAnswer.trim()) ||
                (actionModal === 'execute' && !finalAmount)
              }
            >
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useAuth } from "@/hooks/use-auth";
import { useListPurchaseRequests } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAllPurchaseRequests, deletePurchaseRequest } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusInfo } from "@/lib/constants";
import { Link } from "wouter";
import { Eye, Plus, Search, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function RequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const isManager = user?.role === "admin" || user?.role === "accounts_manager" || user?.role === "accounts_employee";
  
  const queryParams: any = {};
  if (statusFilter !== "all") {
    queryParams.status = statusFilter;
  }
  
  if (!isManager && user?.email) {
    queryParams.requesterEmail = user.email;
  } else if (user?.role === "accounts_employee" && user.email) {
    // Accounts employee sees all
  }

  const { data: requests, isLoading } = useListPurchaseRequests(
    !isManager && user?.email ? { requesterEmail: user.email } : {},
    {
      query: {
        enabled: !!user,
        queryKey: ["purchase-requests", isManager ? "all" : user?.email],
      }
    }
  );

  const deleteOneMut = useMutation({
    mutationFn: (id: number) => deletePurchaseRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast({ title: "Request deleted" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete request", variant: "destructive" }),
  });

  const deleteAllMut = useMutation({
    mutationFn: deleteAllPurchaseRequests,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast({ title: "All requests cleared" });
      setClearAllOpen(false);
    },
    onError: () => toast({ title: "Failed to clear requests", variant: "destructive" }),
  });

  // Client-side filtering
  const filteredRequests = requests?.filter(req => {
    // Filter by search term
    const searchMatch = !searchTerm || 
      req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.vendor?.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Filter by status (if not done by server)
    const statusMatch = statusFilter === "all" || req.status === statusFilter;
    
    // Filter by manager (if standard employee, already handled by server, if manager, they only see theirs unless admin/accounts)
    const managerMatch = user?.role === "employee" || 
      user?.role === "admin" || 
      user?.role === "accounts_manager" || 
      user?.role === "accounts_employee" || 
      req.managerEmail === user?.email || 
      req.requesterEmail === user?.email;
      
    return searchMatch && statusMatch && managerMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Purchase Requests</h1>
          <p className="text-muted-foreground text-sm">Manage and track procurement requests / إدارة وتتبع طلبات الشراء</p>
        </div>
        <div className="flex items-center gap-2">
        {isAdmin && (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setClearAllOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All / حذف الكل
          </Button>
        )}
        <Link href="/requests/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Request / طلب جديد
        </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search PR, item, vendor..." 
                className="pl-9 bg-muted/50 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48 flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-muted/50 border-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses / جميع الحالات</SelectItem>
                  <SelectItem value="pending_manager">Pending Manager</SelectItem>
                  <SelectItem value="approved_by_manager">Pending Accounts</SelectItem>
                  <SelectItem value="approved_by_accounts">Approved / Pending Exec</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="rejected_by_manager">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-primary pl-6">PR Number</TableHead>
                <TableHead className="font-semibold">Item & Vendor</TableHead>
                <TableHead className="font-semibold">Requester</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRequests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No purchase requests found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests?.map((req) => {
                  const statusInfo = getStatusInfo(req.status);
                  return (
                    <TableRow key={req.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 font-medium text-primary">{req.requestNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium">{req.itemDescription}</div>
                        <div className="text-xs text-muted-foreground">
                          {req.vendor?.companyName || 'Unknown Vendor'}
                          <span className="mx-1">•</span>
                          Qty: {req.quantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{req.requesterEmail.split('@')[0]}</div>
                        <div className="text-xs text-muted-foreground">{req.department}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {req.finalAmount 
                          ? formatCurrency(req.finalAmount) 
                          : req.estimatedAmount 
                            ? <span className="text-muted-foreground">~{formatCurrency(req.estimatedAmount)}</span>
                            : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="whitespace-nowrap">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/requests/${req.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(req.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Request?</DialogTitle>
            <DialogDescription>This action cannot be undone. This will permanently delete the request and its activity history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteOneMut.mutate(deleteId)} disabled={deleteOneMut.isPending}>
              {deleteOneMut.isPending ? "Deleting..." : "Delete Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Clear All Requests?</DialogTitle>
            <DialogDescription>This action cannot be undone. This will permanently delete every purchase request and their activity history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAllMut.mutate()} disabled={deleteAllMut.isPending}>
              {deleteAllMut.isPending ? "Clearing..." : "Clear All Requests"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

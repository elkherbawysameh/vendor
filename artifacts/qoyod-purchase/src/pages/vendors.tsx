import { useAuth } from "@/hooks/use-auth";
import { useListVendors, useDeleteVendor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Plus, Search, Building2, ExternalLink, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListVendorsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VendorsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: vendors, isLoading } = useListVendors();
  const deleteMutation = useDeleteVendor();

  // Role checks
  const isAdmin = user?.role === "admin";
  const canAddEdit = user?.role === "admin" || user?.role === "accounts_manager";

  // Client filtering
  const filteredVendors = vendors?.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return v.companyName.toLowerCase().includes(term) || 
           v.contactPerson?.toLowerCase().includes(term) || 
           v.contactEmail?.toLowerCase().includes(term);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast({ title: "Vendor deleted successfully" });
      queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
      setDeleteId(null);
    } catch (e) {
      toast({ 
        title: "Failed to delete", 
        description: "Vendor may have existing purchase requests.",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Vendors Directory</h1>
          <p className="text-muted-foreground text-sm">Manage suppliers and their documentation / إدارة الموردين ووثائقهم</p>
        </div>
        {canAddEdit && (
          <Link href="/vendors/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor / إضافة مورد
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by company name, contact, email..." 
              className="pl-9 bg-muted/50 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-primary pl-6 w-[300px]">Company</TableHead>
                <TableHead className="font-semibold">Contact Info</TableHead>
                <TableHead className="font-semibold">Categories</TableHead>
                <TableHead className="font-semibold text-right">Total Spent</TableHead>
                <TableHead className="text-right pr-6 w-[150px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredVendors?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground flex-col items-center justify-center">
                    <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p>No vendors found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors?.map((vendor) => (
                  <TableRow key={vendor.id} className="group">
                    <TableCell className="pl-6">
                      <div className="font-medium text-foreground">{vendor.companyName}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        IBAN: <span className="font-mono text-[10px]">{vendor.iban || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{vendor.contactPerson || '-'}</div>
                      <div className="text-xs text-muted-foreground">{vendor.contactEmail || '-'}</div>
                      <div className="text-xs text-muted-foreground">{vendor.contactPhone || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.categories && vendor.categories.length > 0 ? (
                          vendor.categories.map(cat => (
                            <Badge key={cat.id} variant="secondary" className="text-[10px] py-0 font-normal">
                              {cat.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {vendor.totalSpent && vendor.totalSpent > 0 ? formatCurrency(vendor.totalSpent) : '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setLocation(`/vendors/${vendor.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(vendor.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Vendor?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the vendor profile.
              Note: You cannot delete vendors that have existing purchase requests associated with them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

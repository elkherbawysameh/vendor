import { useAuth } from "@/hooks/use-auth";
import { 
  useGetVendor, 
  useListVendorDocuments,
  useGetReport,
  useCreateVendorDocument,
  useDeleteVendorDocument
} from "@workspace/api-client-react";
import { getListVendorDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { listDocumentTypes } from "@/lib/admin-api";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Landmark, 
  FileText, Upload, Calendar, AlertTriangle, CheckCircle2,
  Trash2, ExternalLink
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays, parseISO } from "date-fns";

export default function VendorDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vendor, isLoading: vendorLoading } = useGetVendor(id, {
    query: { enabled: !!id, queryKey: ["vendor", id] }
  });

  const { data: documents, isLoading: docsLoading } = useListVendorDocuments(id, {
    query: { enabled: !!id, queryKey: getListVendorDocumentsQueryKey(id) }
  });

  const { data: report, isLoading: reportLoading } = useGetReport({ vendorId: id, type: 'detailed' }, {
    query: { enabled: !!id, queryKey: ["vendor-report", id] }
  });

  const { data: documentTypes } = useQuery({
    queryKey: ["vendor-document-types"],
    queryFn: listDocumentTypes,
  });

  // Doc upload state
  const [docModal, setDocModal] = useState(false);
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docFileUrl, setDocFileUrl] = useState("");

  const createDocMut = useCreateVendorDocument();
  const deleteDocMut = useDeleteVendorDocument();

  const handleUploadDoc = async () => {
    try {
      await createDocMut.mutateAsync({
        vendorId: id,
        data: {
          documentType: docType,
          documentNumber: docNumber,
          expiryDate: docExpiry ? new Date(docExpiry).toISOString() : undefined,
          fileUrl: docFileUrl || undefined,
        }
      });
      toast({ title: "Document recorded successfully" });
      queryClient.invalidateQueries({ queryKey: getListVendorDocumentsQueryKey(id) });
      setDocModal(false);
      setDocType("");
      setDocNumber("");
      setDocExpiry("");
      setDocFileUrl("");
    } catch (e) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (confirm("Delete this document record?")) {
      try {
        await deleteDocMut.mutateAsync({ vendorId: id, docId });
        queryClient.invalidateQueries({ queryKey: getListVendorDocumentsQueryKey(id) });
        toast({ title: "Deleted" });
      } catch (e) {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  if (vendorLoading || !vendor) return <div>Loading...</div>;

  const isAdminOrAccounts = user?.role === "admin" || user?.role === "accounts_manager" || user?.role === "accounts_employee";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/vendors">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">{vendor.companyName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {vendor.categories?.map(cat => (
              <Badge key={cat.id} variant="secondary" className="font-normal text-xs">{cat.name}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{vendor.contactPerson || 'No contact name'}</span>
                    <span className="block text-muted-foreground">{vendor.contactEmail || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{vendor.contactPhone || '-'}</span>
                </div>
                {vendor.notes && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs italic">
                    "{vendor.notes}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                Banking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Bank Name</span>
                <span className="font-medium">{vendor.bankName || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Account Name</span>
                <span className="font-medium">{vendor.bankAccountName || '-'}</span>
              </div>
              <div className="pt-2 border-t border-dashed">
                <span className="text-muted-foreground block text-xs">Account Number</span>
                <span className="font-mono text-base">{vendor.bankAccountNumber || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">IBAN</span>
                <span className="font-mono text-base">{vendor.iban || '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="p-6">
              <div className="text-primary-foreground/80 text-sm mb-1">Total Lifetime Spend</div>
              <div className="text-3xl font-bold">{vendor.totalSpent ? formatCurrency(vendor.totalSpent) : 'EGP 0.00'}</div>
              <div className="text-primary-foreground/60 text-xs mt-2">{vendor.transactionCount || 0} completed transactions</div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col - Docs & History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="documents" className="h-10">Compliance Documents</TabsTrigger>
              <TabsTrigger value="history" className="h-10">Purchase History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="space-y-4 m-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Vendor Documents</h3>
                {isAdminOrAccounts && (
                  <Button size="sm" onClick={() => setDocModal(true)}>
                    <Upload className="w-4 h-4 mr-2" /> Add Record
                  </Button>
                )}
              </div>
              
              <Card>
                <CardContent className="p-0">
                  {docsLoading ? (
                    <div className="p-8 text-center"><Skeleton className="h-8 w-32 mx-auto" /></div>
                  ) : documents && documents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">Document Type</TableHead>
                          <TableHead>Number</TableHead>
                          <TableHead>Status / Expiry</TableHead>
                          <TableHead>File</TableHead>
                          {isAdminOrAccounts && <TableHead className="text-right pr-6">Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map(doc => {
                          let isExpired = false;
                          let isExpiringSoon = false;
                          let daysText = "";
                          
                          if (doc.expiryDate) {
                            const days = differenceInDays(parseISO(doc.expiryDate), new Date());
                            isExpired = days < 0;
                            isExpiringSoon = days >= 0 && days <= 30;
                            daysText = isExpired ? "Expired" : isExpiringSoon ? `Exp in ${days}d` : `Valid`;
                          }
                          
                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="pl-6 font-medium">{doc.documentType}</TableCell>
                              <TableCell className="font-mono text-sm">{doc.documentNumber || '-'}</TableCell>
                              <TableCell>
                                {doc.expiryDate ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isExpired ? "destructive" : isExpiringSoon ? "warning" : "success"} className="text-[10px]">
                                      {daysText}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(doc.expiryDate)}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No expiry</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {doc.fileUrl ? (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Open in Drive
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              {isAdminOrAccounts && (
                                <TableCell className="text-right pr-6">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteDoc(doc.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-3 text-muted/50" />
                      <p>No compliance documents recorded.</p>
                      <p className="text-sm">Commercial Registration and VAT certificates should be added here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <Card>
                <CardContent className="p-0">
                  {reportLoading ? (
                    <div className="p-8"><Skeleton className="h-32 w-full" /></div>
                  ) : report?.requests && report.requests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">PR Number</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right pr-6">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.requests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="pl-6 font-medium">
                              <Link href={`/requests/${req.id}`} className="text-primary hover:underline">
                                {req.requestNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{req.itemDescription}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                            <TableCell className="text-right pr-6 font-medium">
                              {req.finalAmount ? formatCurrency(req.finalAmount) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">
                      <p>No purchase history found for this vendor.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={docModal} onOpenChange={setDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Record</DialogTitle>
            <DialogDescription>Record a compliance document for this vendor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type <span className="text-destructive">*</span></Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {documentTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Need a new type? Manage them under Categories.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Document/Registration Number</Label>
              <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="e.g. 1010123456" />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Google Drive Link (Optional)</Label>
              <Input
                value={docFileUrl}
                onChange={e => setDocFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Upload the file to Google Drive, then paste its share link here.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocModal(false)}>Cancel</Button>
            <Button onClick={handleUploadDoc} disabled={!docType || createDocMut.isPending}>
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

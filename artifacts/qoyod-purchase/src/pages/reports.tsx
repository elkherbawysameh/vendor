import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetReport, useListVendors } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileText, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusInfo } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: vendors } = useListVendors();
  
  const [vendorId, setVendorId] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [reportType, setReportType] = useState<"summary" | "detailed">("detailed");

  // Generate last 12 months for dropdown
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d)
    };
  });

  const queryParams: any = { type: reportType };
  if (vendorId !== "all") queryParams.vendorId = parseInt(vendorId);
  if (month !== "all") queryParams.month = month;

  const { data: report, isLoading } = useGetReport(queryParams, {
    query: {
      enabled: user?.role === "admin" || user?.role === "accounts_manager",
      queryKey: ["report", queryParams],
    }
  });

  if (user && user.role !== "admin" && user.role !== "accounts_manager") {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized. Reporting access required.</div>;
  }

  const handleExport = () => {
    if (!report?.requests || report.requests.length === 0) return;

    // Simple CSV generator
    const headers = ["PR Number", "Date", "Requester", "Department", "Vendor", "Item", "Status", "Amount (EGP)"];
    
    const rows = report.requests.map(req => [
      req.requestNumber,
      new Date(req.createdAt).toISOString().split('T')[0],
      req.requesterEmail,
      req.department,
      req.vendor?.companyName || 'N/A',
      `"${req.itemDescription.replace(/"/g, '""')}"`,
      req.status,
      req.finalAmount || req.estimatedAmount || 0
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `qoyod-purchases-${month === 'all' ? 'all-time' : month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Financial Reports</h1>
          <p className="text-muted-foreground text-sm">Analyze procurement spending / تحليل المصروفات</p>
        </div>
        <Button onClick={handleExport} disabled={!report || report.requests.length === 0} variant="outline" className="bg-white">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card className="bg-muted/10 border-dashed">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="All Vendors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors?.map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="All Time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="bg-primary text-primary-foreground p-3 rounded-md w-full flex justify-between items-center shadow-sm">
              <span className="text-sm font-medium">Total Spend (Selected)</span>
              <span className="text-xl font-bold">{report?.totalAmount ? formatCurrency(report.totalAmount) : 'EGP 0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Report Data Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">PR Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading report data...</TableCell></TableRow>
              ) : report?.requests && report.requests.length > 0 ? (
                report.requests.map(req => {
                  const statusInfo = getStatusInfo(req.status);
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="pl-6 font-medium text-primary">{req.requestNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(req.createdAt)}</TableCell>
                      <TableCell className="text-sm">{req.department}</TableCell>
                      <TableCell className="text-sm font-medium">{req.vendor?.companyName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal border-none bg-muted/50 text-muted-foreground">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-medium">
                        {req.finalAmount ? formatCurrency(req.finalAmount) : req.estimatedAmount ? <span className="text-muted-foreground">~{formatCurrency(req.estimatedAmount)}</span> : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No data matching these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useAuth } from "@/hooks/use-auth";
import { 
  useGetDashboardStats, 
  useGetRecentActivity, 
  useGetVendorSpending, 
  useGetExpiringDocuments 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShoppingCart, 
  Users, 
  Wallet,
  XCircle 
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusInfo } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const isManager = user.role === "admin" || user.role === "accounts_manager" || user.role === "accounts_employee";
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Welcome back, {user.name || user.email.split('@')[0]}</h2>
          <p className="text-muted-foreground">Here's what's happening with your purchase requests today.</p>
        </div>
      </div>
      
      {isManager ? <ManagerDashboard /> : <EmployeeDashboard />}
    </div>
  );
}

function EmployeeDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Requests" 
          titleAr="إجمالي الطلبات"
          value={stats?.totalRequests} 
          icon={ShoppingCart} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Pending" 
          titleAr="قيد الانتظار"
          value={stats?.pendingRequests} 
          icon={Clock} 
          variant="warning"
          loading={statsLoading} 
        />
        <StatCard 
          title="Approved" 
          titleAr="موافق عليها"
          value={stats?.approvedRequests} 
          icon={CheckCircle2} 
          variant="success"
          loading={statsLoading} 
        />
        <StatCard 
          title="Rejected" 
          titleAr="مرفوضة"
          value={stats?.rejectedRequests} 
          icon={XCircle} 
          variant="destructive"
          loading={statsLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity / النشاط الأخير</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 5).map((req) => {
                  const statusInfo = getStatusInfo(req.status);
                  return (
                    <Link key={req.id} href={`/requests/${req.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full text-primary">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{req.requestNumber}</div>
                            <div className="text-xs text-muted-foreground">{req.itemDescription} • {req.requesterEmail.split('@')[0]}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={statusInfo.variant} className="text-xs whitespace-nowrap">{statusInfo.label}</Badge>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(req.createdAt)}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Need something new?
              </CardTitle>
              <CardDescription>Submit a new purchase request for approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/requests/new" className="flex items-center justify-center w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Create Request / إنشاء طلب
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: spending, isLoading: spendingLoading } = useGetVendorSpending();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();
  const { data: expiringDocs, isLoading: docsLoading } = useGetExpiringDocuments();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pending Approvals" 
          titleAr="موافقات معلقة"
          value={stats?.pendingRequests} 
          icon={Clock} 
          variant="warning"
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Vendors" 
          titleAr="إجمالي الموردين"
          value={stats?.totalVendors} 
          icon={Users} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Spent" 
          titleAr="إجمالي المصروفات"
          value={stats?.totalSpent ? formatCurrency(stats.totalSpent) : undefined} 
          icon={Wallet} 
          variant="success"
          loading={statsLoading} 
        />
        <StatCard 
          title="Expiring Docs" 
          titleAr="مستندات منتهية"
          value={stats?.expiringDocuments} 
          icon={AlertTriangle} 
          variant={stats?.expiringDocuments && stats.expiringDocuments > 0 ? "destructive" : "default"}
          loading={statsLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendor Spending / مصروفات الموردين</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {spendingLoading ? (
              <Skeleton className="w-full h-full" />
            ) : spending && spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="vendorName" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    dx={-10}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Spent']}
                  />
                  <Bar dataKey="totalSpent" radius={[4, 4, 0, 0]}>
                    {spending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No spending data available</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> 
                  Expiring Documents
                </CardTitle>
                <Badge variant="outline">{expiringDocs?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : expiringDocs && expiringDocs.length > 0 ? (
                <div className="space-y-3 max-h-[230px] overflow-auto pr-2">
                  {expiringDocs.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                      <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate">{doc.vendorName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{doc.documentType.replace('_', ' ')}</div>
                      </div>
                      <Badge variant={doc.daysUntilExpiry <= 7 ? "destructive" : "warning"} className="shrink-0 whitespace-nowrap">
                        {doc.daysUntilExpiry <= 0 ? 'Expired' : `${doc.daysUntilExpiry} days`}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No documents expiring soon.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity / النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.slice(0, 5).map((req) => {
                const statusInfo = getStatusInfo(req.status);
                return (
                  <Link key={req.id} href={`/requests/${req.id}`}>
                    <div className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-sm">{req.requestNumber}</span>
                            <span className="text-muted-foreground text-sm ml-2 truncate">• {req.itemDescription}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(req.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">by <span className="font-medium">{req.requesterEmail.split('@')[0]}</span></span>
                          <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0">{statusInfo.label}</Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No recent activity</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, 
  titleAr,
  value, 
  icon: Icon, 
  variant = "default", 
  loading 
}: { 
  title: string; 
  titleAr: string;
  value?: number | string; 
  icon: any; 
  variant?: "default" | "success" | "warning" | "destructive";
  loading: boolean;
}) {
  const colors = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10"
  };

  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">{titleAr}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <h3 className="text-3xl font-bold">{value !== undefined ? value : 0}</h3>
          )}
        </div>
        <div className={`p-4 rounded-xl ${colors[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}

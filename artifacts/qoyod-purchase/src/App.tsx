import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, Link } from 'wouter';
import { AuthProvider } from '@/hooks/use-auth';
import AppLayout from '@/components/layout/AppLayout';

// Pages
import LoginPage from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import RequestsPage from '@/pages/requests';
import NewRequestPage from '@/pages/requests-new';
import RequestDetail from '@/pages/requests-[id]';
import VendorsPage from '@/pages/vendors';
import NewVendorPage from '@/pages/vendors-new';
import VendorDetail from '@/pages/vendors-[id]';
import CategoriesPage from '@/pages/categories';
import ReportsPage from '@/pages/reports';
import PoliciesPage from '@/pages/policies';
import UsersPage from '@/pages/users';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h2 className="text-4xl font-bold text-primary mb-2">404</h2>
      <p className="text-muted-foreground text-lg mb-6">The page you're looking for doesn't exist.</p>
      <Link href="/" className="text-primary hover:underline">Return to Dashboard</Link>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" nest>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/requests" component={RequestsPage} />
            <Route path="/requests/new" component={NewRequestPage} />
            <Route path="/requests/:id" component={RequestDetail} />
            <Route path="/vendors" component={VendorsPage} />
            <Route path="/vendors/new" component={NewVendorPage} />
            <Route path="/vendors/:id" component={VendorDetail} />
            <Route path="/categories" component={CategoriesPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route path="/policies" component={PoliciesPage} />
            <Route path="/users" component={UsersPage} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

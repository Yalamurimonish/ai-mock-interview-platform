import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";

// Import pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Resumes from "@/pages/resumes";
import InterviewNew from "@/pages/interview-new";
import InterviewList from "@/pages/interview-list";
import InterviewLive from "@/pages/interview-live";
import InterviewAnalysis from "@/pages/interview-analysis";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/resumes">
        <ProtectedRoute>
          <AppLayout>
            <Resumes />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/interviews">
        <ProtectedRoute>
          <AppLayout>
            <InterviewList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/interviews/new">
        <ProtectedRoute>
          <AppLayout>
            <InterviewNew />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/interviews/:id/analysis">
        <ProtectedRoute>
          <AppLayout>
            <InterviewAnalysis />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/interviews/:id">
        <ProtectedRoute>
          <InterviewLive />
        </ProtectedRoute>
      </Route>
      
      <Route path="/analytics">
        <ProtectedRoute>
          <AppLayout>
            <Analytics />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <AppLayout>
            <Profile />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout>
            <Settings />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import { EditorProvider } from "./lovable-editor-kit/src/EditorContext";
import GlobalEditor from "./lovable-editor-kit/src/GlobalEditor";
import EditModeToggle from "./lovable-editor-kit/src/EditModeToggle";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EditorProvider saveEndpoint={null}>
          <UserProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* Backward-compat for old Kyn deep links */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/leaderboard" element={<Navigate to="/" replace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </UserProvider>
          <GlobalEditor />
          <EditModeToggle />
        </EditorProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

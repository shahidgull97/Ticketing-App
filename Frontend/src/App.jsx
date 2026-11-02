import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorModeProvider } from './theme';
import { AuthProvider } from './features/auth/AuthContext';
import { NotifyProvider } from './components/NotifyProvider';
import AppLayout from './components/AppLayout';
import LoginPage from './features/auth/LoginPage';
import TicketListPage from './features/tickets/TicketListPage';
import TicketDetailPage from './features/tickets/TicketDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => (error?.response?.status ?? 500) >= 500 && count < 2,
    },
  },
});

export default function App() {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NotifyProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AppLayout />}>
                  <Route index element={<TicketListPage />} />
                  <Route path="tickets/:id" element={<TicketDetailPage />} />
                  <Route path="*" element={<TicketListPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </NotifyProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ColorModeProvider>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
import { ReportDetail } from './pages/ReportDetail';
import { Layout } from './components/Layout';
import { Button } from './components/ui';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          {/* sample button to verify Tailwind/shadcn setup */}
          <div className="p-4">
            <Button>Test shadcn</Button>
          </div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
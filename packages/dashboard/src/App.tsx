import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ReportDetail } from './pages/ReportDetail';
import { ViolationDetail } from './pages/ViolationDetail';
import { PageDetail } from './pages/PageDetail';
import { Layout } from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/violation" element={<ViolationDetail />} />
          <Route path="/page" element={<PageDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
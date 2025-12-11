import { Routes, Route, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import WorkshopApp from './WorkshopApp';
import AdminDashboard from './AdminDashboard';

function App() {
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/" element={<WorkshopApp />} />
        <Route path="/admin" element={<AdminDashboard onBack={() => navigate('/')} />} />
      </Routes>

      {/* Floating Admin Button - Only show on home page */}
      {window.location.pathname === '/' && (
        <button
          onClick={() => navigate('/admin')}
          className="fixed bottom-4 right-4 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Admin Dashboard"
        >
          <Lock size={20} />
        </button>
      )}
    </>
  );
}

export default App;

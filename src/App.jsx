import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { supabase as supabaseClient } from './supabaseClient';
import Auth from './views/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Users from './views/Users';
import Inventory from './views/Inventory';
import Sales from './views/Sales';
import Purchases from './views/Purchases';
import Payments from './views/Payments';
import Expenses from './views/Expenses';
import Reports from './views/Reports';
import Contacts from './views/Contacts';
import { Menu } from 'lucide-react';
import logo from './assets/logo.svg';

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Global toast states
  const [toasts, setToasts] = useState([]);

  const addToast = (text, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Monitor auth state changes on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    fetchBranches();

    return () => subscription.unsubscribe();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>Loading ALMAS Accessories ERP...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Connecting securely to your database...</p>
        </div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return <Auth onAuthSuccess={(s) => setSession(s)} />;
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Top Navbar */}
      <div className="mobile-header no-print">
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <img src={logo} alt="Almas Logo" style={{ width: '22px', height: '22px' }} />
          <span>ALMAS ERP</span>
        </div>
        <div style={{ width: 20 }}></div>
      </div>

      {/* Backdrop Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="sidebar-overlay no-print" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        userProfile={userProfile}
        onLogout={handleLogout}
        branches={branches}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={(val) => {
          setIsSidebarCollapsed(val);
          localStorage.setItem('sidebar_collapsed', val);
        }}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/users" element={<Users branches={branches} fetchBranches={fetchBranches} addToast={addToast} />} />
          <Route path="/inventory" element={<Inventory userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/sales" element={<Sales userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/purchases" element={<Purchases userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/payments" element={<Payments userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/expenses" element={<Expenses userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/reports" element={<Reports userProfile={userProfile} branches={branches} addToast={addToast} />} />
          <Route path="/contacts" element={<Contacts userProfile={userProfile} addToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container no-print">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <span className="toast-message">{toast.text}</span>
            <button className="toast-close" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

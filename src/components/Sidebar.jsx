import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.svg';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  ShoppingCart,
  Download,
  CreditCard,
  Receipt,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({ userProfile, onLogout, branches, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const role = userProfile?.role || 'staff';
  const assignedBranchId = userProfile?.branch_id;
  const activeBranch = branches.find((b) => b.id === assignedBranchId);

  const location = useLocation();
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    return path.substring(1); // removes leading slash
  };
  const activeView = getActiveView();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'users', name: 'eStaff', icon: UserCheck, roles: ['owner'] },
    { id: 'contacts', name: 'eContacts', icon: Users, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'inventory', name: 'eInventory', icon: Package, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'sales', name: 'eSales', icon: ShoppingCart, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'purchases', name: 'ePurchases', icon: Download, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'payments', name: 'ePayments', icon: CreditCard, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'expenses', name: 'eExpenses', icon: Receipt, roles: ['owner', 'branch_manager', 'staff'] },
    { id: 'reports', name: 'eReports', icon: BarChart3, roles: ['owner', 'branch_manager', 'staff'] },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logo} alt="Almas Logo" style={{ width: '26px', height: '26px', flexShrink: 0 }} />
            <span className="logo-full">ALMAS ERP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              className="desktop-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button 
              className="sidebar-close-btn" 
              onClick={() => setIsOpen(false)}
              style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="sidebar-branch-badge">
          {role === 'owner' ? 'All Branches (Owner)' : activeBranch ? activeBranch.name : 'No Branch'}
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-name">{userProfile?.full_name || 'Staff User'}</div>
          <div className="user-role">{role}</div>
        </div>
        <button className="btn sidebar-logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

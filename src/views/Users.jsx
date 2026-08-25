import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { UserPlus, Building, Shield, Mail, Lock, User, MapPin, Phone, Plus } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a non-session-persisting client so creating users doesn't log the owner out
const authCreatorClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export default function Users({ branches, fetchBranches, addToast }) {
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'branches'
  const [loading, setLoading] = useState(false);

  // Modal display states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);

  // User form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Branch form states
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      showMessage('Failed to load user profiles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    addToast(text, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      showMessage('Please fill all required user fields.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (fullName.trim().length < 3) {
      showMessage('Full name must be at least 3 characters long.', 'error');
      return;
    }

    if (role !== 'owner' && !selectedBranch) {
      showMessage('Please select a branch location for this employee account.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up the user in Supabase Auth (does not sign out current session)
      const { data, error } = await authCreatorClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      const newUserId = data.user?.id;
      if (!newUserId) throw new Error('No user ID returned from auth sign up.');

      // 2. Update their profile with the chosen role and branch
      // The trigger automatically creates the profile row, so we just update it
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role: role,
          branch_id: role === 'owner' ? null : selectedBranch || null,
        })
        .eq('id', newUserId);

      if (profileError) throw profileError;

      showMessage(`User account for ${fullName} created successfully!`, 'success');
      resetUserForm();
      setShowUserModal(false);
      
      // Refresh the profiles list
      fetchProfiles();
    } catch (err) {
      console.error('Error creating user:', err);
      showMessage(err.message || 'Failed to create user account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) {
      showMessage('Branch name is required.', 'error');
      return;
    }

    if (branchPhone.trim() && !/^\+?[0-9\s\-()]{7,15}$/.test(branchPhone.trim())) {
      showMessage('Please enter a valid phone number (7-15 digits).', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('branches').insert([
        {
          name: branchName,
          address: branchAddress || null,
          phone: branchPhone || null,
        },
      ]);

      if (error) throw error;

      showMessage(`Branch "${branchName}" created successfully!`, 'success');
      resetBranchForm();
      setShowBranchModal(false);
      
      // Refresh branches list in parent component
      fetchBranches();
    } catch (err) {
      console.error('Error creating branch:', err);
      showMessage('Failed to create branch location.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetUserForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setSelectedBranch('');
  };

  const resetBranchForm = () => {
    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="top-bar">
        <div className="page-title-group">
          <h1>User Access & Locations</h1>
          <p>Create staff accounts, assign security roles, and manage branch offices.</p>
        </div>
        <div className="top-bar-actions">
          {activeTab === 'users' ? (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetUserForm();
                setShowUserModal(true);
              }}
            >
              <Plus size={16} />
              <span>Create Staff Account</span>
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetBranchForm();
                setShowBranchModal(true);
              }}
            >
              <Plus size={16} />
              <span>Create Branch Location</span>
            </button>
          )}
        </div>
      </div>



      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: '-1px' }}
          onClick={() => setActiveTab('users')}
        >
          <UserPlus size={16} />
          <span>Staff Accounts</span>
        </button>
        <button
          className={`btn ${activeTab === 'branches' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: '-1px' }}
          onClick={() => setActiveTab('branches')}
        >
          <Building size={16} />
          <span>Branch Locations</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        /* Users Tab (Full Width table) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Active Profiles</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch Office</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                        No profiles found.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p, index) => {
                      const userBranch = branches.find((b) => b.id === p.branch_id);
                      return (
                        <tr key={p.id}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.full_name || 'N/A'}</td>
                          <td>{p.email}</td>
                          <td>
                            <span className={`badge badge-${p.role}`}>{p.role.replace('_', ' ')}</span>
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {p.role === 'owner' ? (
                              <span style={{ color: 'var(--text-muted)' }}>All Branches</span>
                            ) : userBranch ? (
                              userBranch.name
                            ) : (
                              <span style={{ color: 'var(--danger-text)' }}>Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Branches Tab (Full Width table) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Existing Branches</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Branch ID</th>
                    <th>Branch Name</th>
                    <th>Phone</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                        No branches registered. Add a branch to link staff profiles.
                      </td>
                    </tr>
                  ) : (
                    branches.map((b, index) => (
                      <tr key={b.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {b.id}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</td>
                        <td style={{ fontWeight: 500 }}>{b.phone || 'N/A'}</td>
                        <td>{b.address || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Staff / Employee</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setShowUserModal(false);
                  resetUserForm();
                }} 
                style={{ borderRadius: '50%', padding: '0.4rem', border: 'none' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="staff@almasaccessories.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password (Temporary) *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Role Privilege *</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <select
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    >
                      <option value="staff">Staff (Basic POS / Catalog access)</option>
                      <option value="branch_manager">Branch Manager (Branch specific admin)</option>
                      <option value="owner">Owner (Full access across all branches)</option>
                    </select>
                  </div>
                </div>

                {role !== 'owner' && (
                  <div className="form-group">
                    <label>Assign Branch Location *</label>
                    <div style={{ position: 'relative' }}>
                      <Building size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <select
                        className="input-control"
                        style={{ paddingLeft: '2.5rem' }}
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Branch --</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUserModal(false);
                    resetUserForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {showBranchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Branch Location</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setShowBranchModal(false);
                  resetBranchForm();
                }} 
                style={{ borderRadius: '50%', padding: '0.4rem', border: 'none' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBranch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Branch Name *</label>
                  <div style={{ position: 'relative' }}>
                    <Building size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="Dhanmondi Outlet"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={14} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: 'var(--text-muted)' }} />
                    <textarea
                      className="input-control"
                      style={{ paddingLeft: '2.5rem', minHeight: '80px', resize: 'vertical' }}
                      placeholder="House 12, Road 4, Dhanmondi, Dhaka"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="+8801700000000"
                      value={branchPhone}
                      onChange={(e) => setBranchPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowBranchModal(false);
                    resetBranchForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

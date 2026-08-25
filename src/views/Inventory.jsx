import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Search, Plus, Eye, Edit } from 'lucide-react';

export default function Inventory({ userProfile, branches, addToast }) {
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'stock', 'logs'
  const [loading, setLoading] = useState(false);

  // Filtering states
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Product form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Manual stock adjustment states
  const [adjustmentProductId, setAdjustmentProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('adjustment_in');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const role = userProfile?.role || 'staff';
  const myBranchId = userProfile?.branch_id;

  // Sync initial branch selection
  useEffect(() => {
    if (role === 'owner') {
      if (branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branches[0].id);
      }
    } else {
      setSelectedBranchId(myBranchId);
    }
  }, [branches, userProfile]);

  useEffect(() => {
    fetchProducts();
    if (selectedBranchId) {
      fetchStockLevels();
      fetchMovements();
    }
  }, [selectedBranchId]);

  const showMessage = (text, type) => {
    addToast(text, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockLevels = async () => {
    if (!selectedBranchId) return;
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity,
          min_stock_level,
          product_id,
          products (
            sku,
            name,
            category,
            unit
          )
        `)
        .eq('branch_id', selectedBranchId);

      if (error) throw error;
      setStockLevels(data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load branch stock levels.', 'error');
    }
  };

  const fetchMovements = async () => {
    if (!selectedBranchId) return;
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          product_id,
          type,
          quantity,
          description,
          created_at,
          products (
            sku,
            name
          ),
          profiles (
            full_name
          )
        `)
        .eq('branch_id', selectedBranchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load stock movements log.', 'error');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!sku || !name || !purchasePrice || !salePrice) {
      showMessage('Please fill all required fields.', 'error');
      return;
    }

    const trimmedSku = sku.trim();
    if (!/^[a-zA-Z0-9\-_]{3,20}$/.test(trimmedSku)) {
      showMessage('SKU must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores.', 'error');
      return;
    }

    const pPrice = parseFloat(purchasePrice);
    const sPrice = parseFloat(salePrice);

    if (isNaN(pPrice) || pPrice <= 0) {
      showMessage('Purchase price must be a valid positive number.', 'error');
      return;
    }
    if (isNaN(sPrice) || sPrice <= 0) {
      showMessage('Sale price must be a valid positive number.', 'error');
      return;
    }
    if (sPrice < pPrice) {
      if (!window.confirm(`Warning: The selling price (৳${sPrice.toFixed(2)}) is lower than the purchase price (৳${pPrice.toFixed(2)}). Do you want to save this product anyway?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const productData = {
        sku,
        name,
        category: category || null,
        unit,
        purchase_price: parseFloat(purchasePrice),
        sale_price: parseFloat(salePrice),
        description: description || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProductId);

        if (error) throw error;
        showMessage(`Product "${name}" updated successfully!`, 'success');
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        showMessage(`Product "${name}" added to catalog!`, 'success');
      }

      setSku('');
      setName('');
      setCategory('');
      setUnit('pcs');
      setPurchasePrice('');
      setSalePrice('');
      setDescription('');
      setIsEditing(false);
      setEditProductId(null);
      setShowCreateModal(false);
      fetchProducts();
      fetchStockLevels(); // refresh stock screen product options
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Error saving product.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setSku('');
    setName('');
    setCategory('');
    setUnit('pcs');
    setPurchasePrice('');
    setSalePrice('');
    setDescription('');
    setIsEditing(false);
    setEditProductId(null);
  };

  const handleEditProduct = (product) => {
    setSku(product.sku);
    setName(product.name);
    setCategory(product.category || '');
    setUnit(product.unit || 'pcs');
    setPurchasePrice(product.purchase_price);
    setSalePrice(product.sale_price);
    setDescription(product.description || '');
    setIsEditing(true);
    setEditProductId(product.id);
    setShowCreateModal(true);
    setActiveTab('catalog');
  };

  const handleManualAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentProductId || !adjustmentQty || !adjustmentReason) {
      showMessage('Please fill all adjustment fields.', 'error');
      return;
    }

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      showMessage('Adjustment quantity must be a positive integer.', 'error');
      return;
    }

    const isOut = adjustmentType === 'adjustment_out';
    if (isOut) {
      const currentStockItem = stockLevels.find(item => item.product_id === adjustmentProductId);
      const currentQty = currentStockItem ? currentStockItem.quantity : 0;
      if (qty > currentQty) {
        if (!window.confirm(`Warning: You are attempting to adjust out ${qty} units, but the current branch stock is only ${currentQty} units. This will result in a negative stock level of ${currentQty - qty} units. Do you want to proceed?`)) {
          return;
        }
      }
    }

    setLoading(true);
    try {
      const qty = parseInt(adjustmentQty);
      const isOut = adjustmentType === 'adjustment_out';
      const actualQtyChange = isOut ? -qty : qty;

      // 1. Log manual movement in inventory_movements table
      const { error: moveError } = await supabase.from('inventory_movements').insert([
        {
          branch_id: selectedBranchId,
          product_id: adjustmentProductId,
          type: adjustmentType,
          quantity: qty,
          description: `Manual adjustment: ${adjustmentReason}`,
          created_by: userProfile.id,
        },
      ]);
      if (moveError) throw moveError;

      // 2. Adjust inventory levels
      const { error: invError } = await supabase.rpc('adjust_stock', {
        p_branch_id: selectedBranchId,
        p_product_id: adjustmentProductId,
        p_qty_change: actualQtyChange,
      });

      // RPC call fallback: if adjust_stock RPC is not created, do manual upsert
      if (invError) {
        // Fetch current quantity
        const { data: currentInv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('branch_id', selectedBranchId)
          .eq('product_id', adjustmentProductId)
          .maybeSingle();

        const currentQty = currentInv ? currentInv.quantity : 0;
        const newQty = currentQty + actualQtyChange;

        const { error: upsertError } = await supabase
          .from('inventory')
          .upsert({
            branch_id: selectedBranchId,
            product_id: adjustmentProductId,
            quantity: newQty,
            updated_at: new Date().toISOString()
          }, { onConflict: 'branch_id,product_id' });

        if (upsertError) throw upsertError;
      }

      showMessage('Stock level adjusted successfully!', 'success');
      setAdjustmentProductId('');
      setAdjustmentQty('');
      setAdjustmentReason('');
      setShowAdjustmentModal(false);
      fetchStockLevels();
      fetchMovements();
    } catch (err) {
      console.error(err);
      showMessage('Failed to complete stock adjustment.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStock = stockLevels.filter(
    (s) =>
      s.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.products?.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="top-bar">
        <div className="page-title-group">
          <h1>Thread Catalog & Stock</h1>
          <p>Configure product codes, prices, view stock counts, and log movements.</p>
        </div>

        <div className="top-bar-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {role === 'owner' && (
            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ whiteSpace: 'nowrap' }}>Active Branch:</label>
              <select
                className="input-control"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{ width: '220px' }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'catalog' && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetProductForm();
                setShowCreateModal(true);
              }}
            >
              <Plus size={16} />
              <span>Create Thread / Accessory</span>
            </button>
          )}
        </div>
      </div>



      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        <button
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Package size={16} />
          <span>Thread & Item Catalog</span>
        </button>
        <button
          className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stock')}
        >
          <AlertTriangle size={16} />
          <span>Inventory Stock In Hand</span>
        </button>
        <button
          className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('logs')}
        >
          <RefreshCw size={16} />
          <span>Inventory Ledger Logs</span>
        </button>
      </div>

      {/* TAB CONTENT: CATALOG */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Catalog Listing Full Width */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 className="card-title">Product Catalog ({filteredProducts.length})</h3>
              <div className="catalog-search-bar" style={{ width: '250px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '2.2rem', paddingHeight: '34px', fontSize: '0.85rem' }}
                    placeholder="Search by SKU or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Cost Price</th>
                    <th>Sale Price</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        No products found. Add a product to configure pricing.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, index) => (
                      <tr key={p.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                        <td>{p.category || 'N/A'}</td>
                        <td style={{ fontFamily: 'Outfit, sans-serif' }}>৳{p.purchase_price.toFixed(2)}</td>
                        <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--primary)' }}>
                          ৳{p.sale_price.toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              onClick={() => handleEditProduct(p)}
                              title="Edit Item"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Edit Thread / Accessory Item' : 'Create Thread / Accessory'}</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setShowCreateModal(false);
                  resetProductForm();
                }} 
                style={{ borderRadius: '50%', padding: '0.4rem', border: 'none' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>SKU / Barcode *</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="TH-402-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      required
                      disabled={isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit of Measure *</label>
                    <select className="input-control" value={unit} onChange={(e) => setUnit(e.target.value)}>
                      <option value="cone">Cone (cone)</option>
                      <option value="carton">Carton (ctn)</option>
                      <option value="box">Box (box)</option>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="dzn">Dozen (dzn)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Spun Polyester Sewing Thread 40/2 (5000 Yds) - DTM Color"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="Sewing Thread, Embroidery, Zippers, Buttons, etc."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Default Buying Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-control"
                      placeholder="0.00"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Default Selling Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-control"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="input-control"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="e.g. Color code, ply count, material composition, count thickness (e.g., 40s/2, 20s/2)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowCreateModal(false);
                    resetProductForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {isEditing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Inventory Levels</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="catalog-search-bar" style={{ width: '250px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Filter products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAdjustmentModal(true)}>
                <Plus size={16} />
                <span>Manual Stock Adjust</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SL</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>UoM</th>
                  <th>Stock In</th>
                  <th>Stock Out</th>
                  <th>Stock In Hand</th>
                  <th>Alert Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                      No inventory records found for this branch. Finalize a Purchase or add manual stock.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s, index) => {
                    const isLow = s.quantity <= (s.min_stock_level || 5);
                    const productMovements = movements.filter(m => m.product_id === s.product_id);
                    const stockIn = productMovements
                      .filter(m => ['purchase', 'adjustment_in', 'transfer_in'].includes(m.type))
                      .reduce((sum, m) => sum + m.quantity, 0);
                    const stockOut = productMovements
                      .filter(m => ['sale', 'adjustment_out', 'transfer_out'].includes(m.type))
                      .reduce((sum, m) => sum + m.quantity, 0);
                    return (
                      <tr key={s.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontFamily: 'monospace' }}>{s.products?.sku}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.products?.name}</td>
                        <td>{s.products?.unit}</td>
                        <td>{stockIn}</td>
                        <td>{stockOut}</td>
                        <td style={{ fontWeight: 700, fontSize: '1.05rem', color: isLow ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                          {s.quantity}
                        </td>
                        <td>{s.min_stock_level}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-unpaid">
                              <AlertTriangle size={12} />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="badge badge-paid">Healthy</span>
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
      )}

      {/* TAB CONTENT: STOCK FLOW LOGS */}
      {activeTab === 'logs' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Stock In / Stock Out Ledger</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th>Quantity Change</th>
                  <th>Description</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                      No stock movements recorded. Sales and purchases automatically log movements here.
                    </td>
                  </tr>
                ) : (
                  movements.map((m, index) => {
                    const isIn = ['purchase', 'adjustment_in', 'transfer_in'].includes(m.type);
                    return (
                      <tr key={m.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{m.products?.name}</span>
                          <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {m.products?.sku}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isIn ? 'badge-paid' : 'badge-unpaid'}`}>
                            {isIn ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span style={{ marginLeft: '0.25rem' }}>{m.type.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: isIn ? 'var(--success-text)' : 'var(--danger-text)' }}>
                          {isIn ? '+' : '-'}{m.quantity}
                        </td>
                        <td>{m.description}</td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.profiles?.full_name || 'System'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANUAL ADJUSTMENT MODAL */}
      {showAdjustmentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Manual Inventory Stock Adjustment</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAdjustmentModal(false)}
                style={{ borderRadius: '50%', padding: '0.4rem', border: 'none' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleManualAdjustment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Select Yarn / Accessory *</label>
                  <select
                    className="input-control"
                    value={adjustmentProductId}
                    onChange={(e) => setAdjustmentProductId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Thread / Accessory --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Adjustment Type *</label>
                    <select
                      className="input-control"
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      required
                    >
                      <option value="adjustment_in">Stock In (Winding / Return / Excess)</option>
                      <option value="adjustment_out">Stock Out (Wastage / Breakage / Damage)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="input-control"
                      placeholder="Enter amount"
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason / Notes *</label>
                  <textarea
                    className="input-control"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="e.g. Thread winding wastage, yarn breakage, damage, physical count discrepancy..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdjustmentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Post Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

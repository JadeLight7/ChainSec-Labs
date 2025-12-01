import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import './ProductRegistry.css';

function ProductRegistry({ contracts, account, userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: ''
  });
  const [txStatus, setTxStatus] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [contracts]);

  const loadProducts = async () => {
    if (!contracts.ProductRegistry) return;

    try {
      setLoading(true);
      const productCount = Number(await contracts.ProductRegistry.getProductCount());
      const loadedProducts = [];

      for (let i = 1; i <= productCount; i++) {
        try {
          const product = await contracts.ProductRegistry.getProduct(i);
          if (product.exists) {
            loadedProducts.push({
              id: i,
              name: product.name,
              category: product.category,
              manufacturer: product.manufacturer,
              timestamp: new Date(Number(product.timestamp) * 1000).toLocaleString('zh-CN')
            });
          }
        } catch (error) {
          console.log(`无法加载产品 #${i}`);
        }
      }

      setProducts(loadedProducts);
      setLoading(false);
    } catch (error) {
      console.error('加载产品失败:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contracts.ProductRegistry) {
      alert('合约未加载');
      return;
    }

    try {
      setTxStatus({ type: 'loading', message: '正在注册产品...' });

      const tx = await contracts.ProductRegistry.registerProduct(
        formData.name,
        formData.category
      );

      setTxStatus({ type: 'loading', message: '等待交易确认...' });
      const receipt = await tx.wait();

      setTxStatus({ 
        type: 'success', 
        message: `产品注册成功! Gas消耗: ${receipt.gasUsed.toString()}` 
      });

      // 重置表单
      setFormData({ name: '', category: '' });
      setShowAddForm(false);

      // 重新加载产品列表
      setTimeout(() => {
        loadProducts();
        setTxStatus(null);
      }, 2000);

    } catch (error) {
      console.error('注册产品失败:', error);
      setTxStatus({ 
        type: 'error', 
        message: error.message || '注册失败，请检查权限' 
      });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canRegisterProduct = userRole && (
    userRole.includes('ADMIN') || 
    userRole.includes('MANUFACTURER')
  );

  return (
    <div className="product-registry">
      <div className="page-header">
        <div>
          <h2>
            <Package size={32} />
            产品注册管理
          </h2>
          <p className="page-subtitle">注册和管理供应链中的产品</p>
        </div>
        {canRegisterProduct && (
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={20} />
            注册新产品
          </button>
        )}
      </div>

      {/* 交易状态提示 */}
      {txStatus && (
        <div className={`alert alert-${txStatus.type === 'success' ? 'success' : txStatus.type === 'error' ? 'error' : 'info'}`}>
          {txStatus.type === 'loading' && <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>}
          {txStatus.type === 'success' && <CheckCircle size={20} />}
          {txStatus.type === 'error' && <XCircle size={20} />}
          <span>{txStatus.message}</span>
        </div>
      )}

      {/* 添加产品表单 */}
      {showAddForm && (
        <div className="card form-card">
          <h3>注册新产品</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">产品名称</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如: 有机苹果"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">产品类别</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如: 水果"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <CheckCircle size={18} />
                确认注册
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="search-bar card">
        <Search size={20} />
        <input
          type="text"
          placeholder="搜索产品名称或类别..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <Filter size={20} />
      </div>

      {/* 产品列表 */}
      <div className="card">
        <div className="table-header">
          <h3>产品列表</h3>
          <div className="product-count">
            共 {filteredProducts.length} 个产品
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
            <p>加载产品数据...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="product-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>产品名称</th>
                  <th>类别</th>
                  <th>制造商</th>
                  <th>注册时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td className="product-name">{product.name}</td>
                    <td>
                      <span className="category-badge">{product.category}</span>
                    </td>
                    <td className="address-cell">
                      {product.manufacturer.slice(0, 6)}...{product.manufacturer.slice(-4)}
                    </td>
                    <td className="timestamp-cell">{product.timestamp}</td>
                    <td>
                      <span className="status-badge status-active">已注册</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Package size={64} color="#ddd" />
            <p>暂无产品记录</p>
            {canRegisterProduct && (
              <button 
                className="btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                注册第一个产品
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductRegistry;

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import './QualityControl.css';

function QualityControl({ contracts, account, userRole }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    passedReports: 0,
    passRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    passed: true,
    comments: ''
  });
  const [txStatus, setTxStatus] = useState(null);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, [contracts]);

  useEffect(() => {
    if (selectedProduct) {
      loadReports(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    if (!contracts.ProductRegistry) return;

    try {
      const productCount = Number(await contracts.ProductRegistry.getProductCount());
      const loadedProducts = [];

      for (let i = 1; i <= productCount; i++) {
        try {
          const product = await contracts.ProductRegistry.getProduct(i);
          if (product.exists) {
            loadedProducts.push({
              id: i,
              name: product.name,
              category: product.category
            });
          }
        } catch (error) {
          console.log(`无法加载产品 #${i}`);
        }
      }

      setProducts(loadedProducts);
    } catch (error) {
      console.error('加载产品失败:', error);
    }
  };

  const loadStats = async () => {
    if (!contracts.QualityControl) return;

    try {
      const totalReports = Number(await contracts.QualityControl.totalReports());
      const passedReports = Number(await contracts.QualityControl.passedReports());
      const passRate = totalReports > 0 
        ? Number(await contracts.QualityControl.getPassRate())
        : 0;

      setStats({ totalReports, passedReports, passRate });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const loadReports = async (productId) => {
    if (!contracts.QualityControl) return;

    try {
      setLoading(true);
      const productReports = await contracts.QualityControl.getReports(productId);
      
      const formattedReports = productReports.map((report, index) => ({
        id: index + 1,
        inspector: report.inspector,
        passed: report.passed,
        comments: report.comments,
        timestamp: new Date(Number(report.timestamp) * 1000).toLocaleString('zh-CN')
      }));

      setReports(formattedReports);
      setLoading(false);
    } catch (error) {
      console.error('加载质检报告失败:', error);
      setReports([]);
      setLoading(false);
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!contracts.QualityControl) {
      alert('合约未加载');
      return;
    }

    try {
      setTxStatus({ type: 'loading', message: '正在添加质检报告...' });

      const tx = await contracts.QualityControl.addReport(
        formData.productId,
        formData.passed,
        formData.comments
      );

      setTxStatus({ type: 'loading', message: '等待交易确认...' });
      const receipt = await tx.wait();

      setTxStatus({ 
        type: 'success', 
        message: `质检报告添加成功! Gas消耗: ${receipt.gasUsed.toString()}` 
      });

      setFormData({ productId: '', passed: true, comments: '' });
      setShowAddForm(false);

      // 重新加载数据
      setTimeout(() => {
        loadStats();
        if (selectedProduct) {
          loadReports(selectedProduct);
        }
        setTxStatus(null);
      }, 2000);

    } catch (error) {
      console.error('添加报告失败:', error);
      setTxStatus({ 
        type: 'error', 
        message: error.message || '添加失败，请检查权限' 
      });
    }
  };

  const canAddReport = userRole && (
    userRole.includes('ADMIN') || 
    userRole.includes('QUALITY_INSPECTOR')
  );

  return (
    <div className="quality-control">
      <div className="page-header">
        <div>
          <h2>
            <ClipboardCheck size={32} />
            质量检测管理
          </h2>
          <p className="page-subtitle">管理产品质量检测报告</p>
        </div>
        {canAddReport && (
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={20} />
            添加质检报告
          </button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="quality-stats">
        <div className="stat-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="stat-icon" style={{ background: '#667eea20' }}>
            <ClipboardCheck size={28} style={{ color: '#667eea' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">总检测数</div>
            <div className="stat-value">{stats.totalReports}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #11998e' }}>
          <div className="stat-icon" style={{ background: '#11998e20' }}>
            <CheckCircle size={28} style={{ color: '#11998e' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">合格数量</div>
            <div className="stat-value">{stats.passedReports}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f093fb' }}>
          <div className="stat-icon" style={{ background: '#f093fb20' }}>
            <TrendingUp size={28} style={{ color: '#f093fb' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">合格率</div>
            <div className="stat-value">{stats.passRate}%</div>
          </div>
        </div>
      </div>

      {txStatus && (
        <div className={`alert alert-${txStatus.type === 'success' ? 'success' : txStatus.type === 'error' ? 'error' : 'info'}`}>
          {txStatus.type === 'loading' && <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>}
          <span>{txStatus.message}</span>
        </div>
      )}

      {showAddForm && (
        <div className="card form-card">
          <h3>添加质检报告</h3>
          <form onSubmit={handleAddReport}>
            <div className="form-group">
              <label className="label">选择产品</label>
              <select
                className="input-field"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
              >
                <option value="">请选择产品</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    #{product.id} - {product.name} ({product.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">检测结果</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="passed"
                    checked={formData.passed === true}
                    onChange={() => setFormData({ ...formData, passed: true })}
                  />
                  <CheckCircle size={18} color="#11998e" />
                  <span>合格</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="passed"
                    checked={formData.passed === false}
                    onChange={() => setFormData({ ...formData, passed: false })}
                  />
                  <XCircle size={18} color="#eb3349" />
                  <span>不合格</span>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="label">备注说明</label>
              <textarea
                className="input-field"
                placeholder="请输入质检详情..."
                rows="4"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">提交报告</button>
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

      {/* 产品列表和报告 */}
      <div className="quality-container">
        <div className="product-selector card">
          <h3>产品列表</h3>
          <div className="product-list">
            {products.map(product => (
              <div
                key={product.id}
                className={`product-item ${selectedProduct === product.id ? 'selected' : ''}`}
                onClick={() => setSelectedProduct(product.id)}
              >
                <div className="product-id">#{product.id}</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-category">{product.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reports-section card">
          <h3>质检报告</h3>

          {loading ? (
            <div className="loading-container">
              <div className="loading"></div>
              <p>加载质检报告...</p>
            </div>
          ) : selectedProduct ? (
            reports.length > 0 ? (
              <div className="reports-list">
                {reports.map(report => (
                  <div key={report.id} className={`report-card ${report.passed ? 'passed' : 'failed'}`}>
                    <div className="report-header">
                      <div className="report-status">
                        {report.passed ? (
                          <>
                            <CheckCircle size={24} color="#11998e" />
                            <span className="status-text passed">合格</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={24} color="#eb3349" />
                            <span className="status-text failed">不合格</span>
                          </>
                        )}
                      </div>
                      <div className="report-number">报告 #{report.id}</div>
                    </div>
                    <div className="report-body">
                      <div className="report-field">
                        <strong>质检员:</strong>
                        <span className="address-text">
                          {report.inspector.slice(0, 6)}...{report.inspector.slice(-4)}
                        </span>
                      </div>
                      <div className="report-field">
                        <strong>检测时间:</strong>
                        <span>{report.timestamp}</span>
                      </div>
                      <div className="report-comments">
                        <strong>备注:</strong>
                        <p>{report.comments}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ClipboardCheck size={64} color="#ddd" />
                <p>该产品暂无质检报告</p>
                {canAddReport && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setFormData({ ...formData, productId: selectedProduct });
                      setShowAddForm(true);
                    }}
                  >
                    添加质检报告
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="empty-state">
              <ClipboardCheck size={64} color="#ddd" />
              <p>请从左侧选择一个产品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QualityControl;

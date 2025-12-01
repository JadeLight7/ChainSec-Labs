import React, { useState, useEffect } from 'react';
import { TruckIcon, MapPin, Clock, User, Plus, Search } from 'lucide-react';
import './SupplyChainTracker.css';

function SupplyChainTracker({ contracts, account, userRole }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [supplyChainSteps, setSupplyChainSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    stage: '0',
    location: ''
  });
  const [txStatus, setTxStatus] = useState(null);

  const stages = [
    { value: 0, label: '生产', icon: '🏭', color: '#667eea' },
    { value: 1, label: '运输', icon: '🚚', color: '#764ba2' },
    { value: 2, label: '配送', icon: '📦', color: '#11998e' },
    { value: 3, label: '销售', icon: '🏪', color: '#f093fb' }
  ];

  useEffect(() => {
    loadProducts();
  }, [contracts]);

  useEffect(() => {
    if (selectedProduct) {
      loadSupplyChainSteps(selectedProduct);
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

  const loadSupplyChainSteps = async (productId) => {
    if (!contracts.SupplyChain) return;

    try {
      setLoading(true);
      const steps = await contracts.SupplyChain.getSteps(productId);
      
      const formattedSteps = steps.map((step, index) => ({
        id: index + 1,
        stage: Number(step.stage),
        stageName: stages[Number(step.stage)]?.label || '未知',
        location: step.location,
        actor: step.actor,
        timestamp: new Date(Number(step.timestamp) * 1000).toLocaleString('zh-CN')
      }));

      setSupplyChainSteps(formattedSteps);
      setLoading(false);
    } catch (error) {
      console.error('加载供应链步骤失败:', error);
      setSupplyChainSteps([]);
      setLoading(false);
    }
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    if (!contracts.SupplyChain) {
      alert('合约未加载');
      return;
    }

    try {
      setTxStatus({ type: 'loading', message: '正在添加供应链步骤...' });

      const tx = await contracts.SupplyChain.addStep(
        formData.productId,
        formData.stage,
        formData.location
      );

      setTxStatus({ type: 'loading', message: '等待交易确认...' });
      const receipt = await tx.wait();

      setTxStatus({ 
        type: 'success', 
        message: `供应链步骤添加成功! Gas消耗: ${receipt.gasUsed.toString()}` 
      });

      setFormData({ productId: '', stage: '0', location: '' });
      setShowAddForm(false);

      // 重新加载当前产品的供应链
      if (selectedProduct) {
        setTimeout(() => {
          loadSupplyChainSteps(selectedProduct);
          setTxStatus(null);
        }, 2000);
      }

    } catch (error) {
      console.error('添加步骤失败:', error);
      setTxStatus({ 
        type: 'error', 
        message: error.message || '添加失败，请检查权限和参数' 
      });
    }
  };

  const canAddStep = userRole && (
    userRole.includes('ADMIN') || 
    userRole.includes('MANUFACTURER') ||
    userRole.includes('DISTRIBUTOR') ||
    userRole.includes('RETAILER')
  );

  return (
    <div className="supply-chain-tracker">
      <div className="page-header">
        <div>
          <h2>
            <TruckIcon size={32} />
            供应链追踪
          </h2>
          <p className="page-subtitle">追踪产品在供应链中的全程流转</p>
        </div>
        {canAddStep && (
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={20} />
            添加供应链步骤
          </button>
        )}
      </div>

      {txStatus && (
        <div className={`alert alert-${txStatus.type === 'success' ? 'success' : txStatus.type === 'error' ? 'error' : 'info'}`}>
          {txStatus.type === 'loading' && <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>}
          <span>{txStatus.message}</span>
        </div>
      )}

      {showAddForm && (
        <div className="card form-card">
          <h3>添加供应链步骤</h3>
          <form onSubmit={handleAddStep}>
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
              <label className="label">阶段</label>
              <select
                className="input-field"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                required
              >
                {stages.map(stage => (
                  <option key={stage.value} value={stage.value}>
                    {stage.icon} {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">位置</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如: 北京配送中心"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">确认添加</button>
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

      <div className="tracker-container">
        <div className="product-selector card">
          <h3>
            <Search size={20} />
            选择产品
          </h3>
          <div className="product-list">
            {products.length > 0 ? (
              products.map(product => (
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
              ))
            ) : (
              <div className="empty-message">暂无产品</div>
            )}
          </div>
        </div>

        <div className="supply-chain-timeline card">
          <h3>
            <MapPin size={20} />
            供应链流程
          </h3>

          {loading ? (
            <div className="loading-container">
              <div className="loading"></div>
              <p>加载供应链数据...</p>
            </div>
          ) : selectedProduct ? (
            supplyChainSteps.length > 0 ? (
              <div className="timeline">
                {supplyChainSteps.map((step, index) => {
                  const stageInfo = stages[step.stage] || stages[0];
                  return (
                    <div key={step.id} className="timeline-item">
                      <div className="timeline-marker" style={{ background: stageInfo.color }}>
                        {stageInfo.icon}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h4>{step.stageName}</h4>
                          <span className="step-number">步骤 {step.id}</span>
                        </div>
                        <div className="timeline-details">
                          <div className="detail-item">
                            <MapPin size={16} />
                            <span>{step.location}</span>
                          </div>
                          <div className="detail-item">
                            <User size={16} />
                            <span>{step.actor.slice(0, 6)}...{step.actor.slice(-4)}</span>
                          </div>
                          <div className="detail-item">
                            <Clock size={16} />
                            <span>{step.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      {index < supplyChainSteps.length - 1 && (
                        <div className="timeline-connector"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <TruckIcon size={64} color="#ddd" />
                <p>该产品暂无供应链记录</p>
                {canAddStep && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setFormData({ ...formData, productId: selectedProduct });
                      setShowAddForm(true);
                    }}
                  >
                    添加第一个步骤
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="empty-state">
              <Search size={64} color="#ddd" />
              <p>请从左侧选择一个产品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupplyChainTracker;

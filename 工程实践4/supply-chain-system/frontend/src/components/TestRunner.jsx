import React, { useState } from 'react';
import { TestTube, Play, CheckCircle, XCircle, Clock, Zap, BarChart3 } from 'lucide-react';
import './TestRunner.css';

function TestRunner({ contracts, account, provider }) {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [summary, setSummary] = useState(null);

  const runAllTests = async () => {
    if (!contracts.RoleManager || !contracts.ProductRegistry || 
        !contracts.SupplyChain || !contracts.QualityControl) {
      alert('请确保所有合约已部署并加载');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setSummary(null);
    const results = [];
    const startTime = Date.now();

    // 测试 1: RoleManager 合约测试
    await runTest('RoleManager - 检查管理员角色', async () => {
      const adminRole = await contracts.RoleManager.ADMIN_ROLE();
      const hasRole = await contracts.RoleManager.hasRole(adminRole, account);
      if (!hasRole) throw new Error('当前用户不是管理员');
      return { adminRole, hasRole };
    }, results);

    await runTest('RoleManager - 获取用户总数', async () => {
      const userCount = await contracts.RoleManager.getUserCount();
      return { userCount: Number(userCount) };
    }, results);

    await runTest('RoleManager - 测试角色授予', async () => {
      const accounts = await provider.listAccounts();
      const testAccount = accounts[5].address;
      const manufacturerRole = await contracts.RoleManager.MANUFACTURER_ROLE();
      
      const tx = await contracts.RoleManager.grantRole(manufacturerRole, testAccount);
      const receipt = await tx.wait();
      
      const hasRole = await contracts.RoleManager.hasRole(manufacturerRole, testAccount);
      if (!hasRole) throw new Error('角色授予失败');
      
      return { 
        gasUsed: Number(receipt.gasUsed),
        testAccount,
        roleGranted: hasRole
      };
    }, results);

    // 测试 2: ProductRegistry 合约测试
    await runTest('ProductRegistry - 注册测试产品', async () => {
      const tx = await contracts.ProductRegistry.registerProduct('测试产品', '测试类别');
      const receipt = await tx.wait();
      const productId = await contracts.ProductRegistry.getProductCount();
      
      return {
        productId: Number(productId),
        gasUsed: Number(receipt.gasUsed)
      };
    }, results);

    await runTest('ProductRegistry - 查询产品信息', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const product = await contracts.ProductRegistry.getProduct(productId);
      
      if (!product.exists) throw new Error('产品不存在');
      
      return {
        productId: Number(productId),
        name: product.name,
        category: product.category,
        manufacturer: product.manufacturer
      };
    }, results);

    await runTest('ProductRegistry - 获取所有产品ID', async () => {
      const ids = await contracts.ProductRegistry.getAllProductIds();
      return {
        totalProducts: ids.length,
        productIds: ids.slice(0, 5).map(id => Number(id))
      };
    }, results);

    // 测试 3: SupplyChain 合约测试
    await runTest('SupplyChain - 添加生产步骤', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const tx = await contracts.SupplyChain.addStep(productId, 0, '测试工厂');
      const receipt = await tx.wait();
      
      return {
        productId: Number(productId),
        stage: 'Manufactured',
        location: '测试工厂',
        gasUsed: Number(receipt.gasUsed)
      };
    }, results);

    await runTest('SupplyChain - 添加运输步骤', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const tx = await contracts.SupplyChain.addStep(productId, 1, '测试仓库');
      const receipt = await tx.wait();
      
      return {
        productId: Number(productId),
        stage: 'InTransit',
        location: '测试仓库',
        gasUsed: Number(receipt.gasUsed)
      };
    }, results);

    await runTest('SupplyChain - 查询供应链步骤', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const steps = await contracts.SupplyChain.getSteps(productId);
      const stepCount = await contracts.SupplyChain.getStepCount(productId);
      
      return {
        productId: Number(productId),
        totalSteps: Number(stepCount),
        stepsRetrieved: steps.length
      };
    }, results);

    // 测试 4: QualityControl 合约测试
    await runTest('QualityControl - 添加质检报告（合格）', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const tx = await contracts.QualityControl.addReport(productId, true, '质量优秀');
      const receipt = await tx.wait();
      
      return {
        productId: Number(productId),
        passed: true,
        comments: '质量优秀',
        gasUsed: Number(receipt.gasUsed)
      };
    }, results);

    await runTest('QualityControl - 添加质检报告（不合格）', async () => {
      // 创建新产品用于不合格测试
      const tx1 = await contracts.ProductRegistry.registerProduct('不合格产品', '测试');
      await tx1.wait();
      const productId = await contracts.ProductRegistry.getProductCount();
      
      const tx = await contracts.QualityControl.addReport(productId, false, '需要改进');
      const receipt = await tx.wait();
      
      return {
        productId: Number(productId),
        passed: false,
        comments: '需要改进',
        gasUsed: Number(receipt.gasUsed)
      };
    }, results);

    await runTest('QualityControl - 计算合格率', async () => {
      const totalReports = await contracts.QualityControl.totalReports();
      const passedReports = await contracts.QualityControl.passedReports();
      const passRate = await contracts.QualityControl.getPassRate();
      
      return {
        totalReports: Number(totalReports),
        passedReports: Number(passedReports),
        failedReports: Number(totalReports) - Number(passedReports),
        passRate: Number(passRate) + '%'
      };
    }, results);

    // 测试 5: 性能测试
    await runTest('性能测试 - 批量注册产品', async () => {
      const batchSize = 10;
      const gasUsages = [];
      const startTime = Date.now();
      
      for (let i = 0; i < batchSize; i++) {
        const tx = await contracts.ProductRegistry.registerProduct(
          `批量产品${i}`,
          '测试'
        );
        const receipt = await tx.wait();
        gasUsages.push(Number(receipt.gasUsed));
      }
      
      const duration = Date.now() - startTime;
      const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
      
      return {
        batchSize,
        duration: duration + 'ms',
        averageGas: Math.round(avgGas),
        minGas: Math.min(...gasUsages),
        maxGas: Math.max(...gasUsages),
        throughput: ((batchSize / duration) * 1000).toFixed(2) + ' ops/s'
      };
    }, results);

    await runTest('性能测试 - 批量添加供应链步骤', async () => {
      const productId = await contracts.ProductRegistry.getProductCount();
      const gasUsages = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        const stage = i % 4;
        const tx = await contracts.SupplyChain.addStep(
          productId,
          stage,
          `测试位置${i}`
        );
        const receipt = await tx.wait();
        gasUsages.push(Number(receipt.gasUsed));
      }
      
      const duration = Date.now() - startTime;
      const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
      
      return {
        steps: 5,
        duration: duration + 'ms',
        averageGas: Math.round(avgGas)
      };
    }, results);

    // 生成测试摘要
    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const totalGas = results.reduce((sum, r) => sum + (r.gasUsed || 0), 0);

    setSummary({
      total: results.length,
      passed,
      failed,
      passRate: ((passed / results.length) * 100).toFixed(2),
      duration: totalDuration,
      totalGas
    });

    setTestResults(results);
    setIsRunning(false);
    setCurrentTest('');
  };

  const runTest = async (name, testFn, results) => {
    setCurrentTest(name);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      results.push({
        name,
        status: 'passed',
        duration,
        gasUsed: result.gasUsed || 0,
        details: result
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        name,
        status: 'failed',
        duration,
        error: error.message,
        details: null
      });
    }
    
    setTestResults([...results]);
  };

  return (
    <div className="test-runner">
      <div className="page-header">
        <div>
          <h2>
            <TestTube size={32} />
            系统测试
          </h2>
          <p className="page-subtitle">运行完整的合约功能测试</p>
        </div>
        <button 
          className="btn-primary"
          onClick={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
              运行中...
            </>
          ) : (
            <>
              <Play size={20} />
              运行所有测试
            </>
          )}
        </button>
      </div>

      {/* 测试摘要 */}
      {summary && (
        <div className="test-summary">
          <div className="summary-card" style={{ borderLeft: '4px solid #667eea' }}>
            <div className="summary-icon" style={{ background: '#667eea20' }}>
              <TestTube size={28} style={{ color: '#667eea' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">总测试数</div>
              <div className="summary-value">{summary.total}</div>
            </div>
          </div>

          <div className="summary-card" style={{ borderLeft: '4px solid #11998e' }}>
            <div className="summary-icon" style={{ background: '#11998e20' }}>
              <CheckCircle size={28} style={{ color: '#11998e' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">通过</div>
              <div className="summary-value">{summary.passed}</div>
            </div>
          </div>

          <div className="summary-card" style={{ borderLeft: '4px solid #eb3349' }}>
            <div className="summary-icon" style={{ background: '#eb334920' }}>
              <XCircle size={28} style={{ color: '#eb3349' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">失败</div>
              <div className="summary-value">{summary.failed}</div>
            </div>
          </div>

          <div className="summary-card" style={{ borderLeft: '4px solid #f093fb' }}>
            <div className="summary-icon" style={{ background: '#f093fb20' }}>
              <BarChart3 size={28} style={{ color: '#f093fb' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">通过率</div>
              <div className="summary-value">{summary.passRate}%</div>
            </div>
          </div>

          <div className="summary-card" style={{ borderLeft: '4px solid #764ba2' }}>
            <div className="summary-icon" style={{ background: '#764ba220' }}>
              <Clock size={28} style={{ color: '#764ba2' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">总耗时</div>
              <div className="summary-value">{summary.duration}ms</div>
            </div>
          </div>

          <div className="summary-card" style={{ borderLeft: '4px solid #667eea' }}>
            <div className="summary-icon" style={{ background: '#667eea20' }}>
              <Zap size={28} style={{ color: '#667eea' }} />
            </div>
            <div className="summary-content">
              <div className="summary-title">总Gas消耗</div>
              <div className="summary-value">{summary.totalGas.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* 当前运行的测试 */}
      {isRunning && currentTest && (
        <div className="current-test card">
          <div className="loading"></div>
          <span>正在运行: {currentTest}</span>
        </div>
      )}

      {/* 测试结果列表 */}
      {testResults.length > 0 && (
        <div className="card">
          <h3>测试结果详情</h3>
          <div className="test-results-list">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`test-result-item ${result.status}`}
              >
                <div className="result-header">
                  <div className="result-status">
                    {result.status === 'passed' ? (
                      <CheckCircle size={20} color="#11998e" />
                    ) : (
                      <XCircle size={20} color="#eb3349" />
                    )}
                    <span className={`status-text ${result.status}`}>
                      {result.status === 'passed' ? '通过' : '失败'}
                    </span>
                  </div>
                  <div className="result-meta">
                    <span className="duration">
                      <Clock size={14} />
                      {result.duration}ms
                    </span>
                    {result.gasUsed > 0 && (
                      <span className="gas">
                        <Zap size={14} />
                        {result.gasUsed.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="result-name">{result.name}</div>
                {result.error && (
                  <div className="result-error">
                    错误: {result.error}
                  </div>
                )}
                {result.details && (
                  <div className="result-details">
                    <strong>详细信息:</strong>
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 初始状态 */}
      {!isRunning && testResults.length === 0 && (
        <div className="empty-state card">
          <TestTube size={80} color="#ddd" />
          <h3>准备运行测试</h3>
          <p>点击上方"运行所有测试"按钮开始测试</p>
          <div className="test-info">
            <h4>测试内容包括:</h4>
            <ul>
              <li>✓ RoleManager 合约功能测试</li>
              <li>✓ ProductRegistry 合约功能测试</li>
              <li>✓ SupplyChain 合约功能测试</li>
              <li>✓ QualityControl 合约功能测试</li>
              <li>✓ 性能和压力测试</li>
              <li>✓ Gas消耗分析</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestRunner;

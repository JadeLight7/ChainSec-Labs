import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TruckIcon, CheckCircle, AlertCircle, Users, Activity } from 'lucide-react';
import './Dashboard.css';

function Dashboard({ contracts, account }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSteps: 0,
    totalReports: 0,
    passRate: 0,
    totalUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [contracts]);

  const loadDashboardData = async () => {
    if (!contracts.ProductRegistry) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 获取产品总数
      let totalProducts = 0;
      if (contracts.ProductRegistry) {
        totalProducts = Number(await contracts.ProductRegistry.getProductCount());
      }

      // 获取质检统计
      let totalReports = 0;
      let passRate = 0;
      if (contracts.QualityControl) {
        totalReports = Number(await contracts.QualityControl.totalReports());
        if (totalReports > 0) {
          passRate = Number(await contracts.QualityControl.getPassRate());
        }
      }

      // 获取用户总数
      let totalUsers = 0;
      if (contracts.RoleManager) {
        totalUsers = Number(await contracts.RoleManager.getUserCount());
      }

      // 计算供应链步骤（估算）
      const totalSteps = totalProducts * 2; // 平均每个产品2个步骤

      setStats({
        totalProducts,
        totalSteps,
        totalReports,
        passRate,
        totalUsers
      });

      // 生成图表数据
      generateChartData(totalProducts, totalReports, passRate);
      
      // 生成最近活动
      generateRecentActivity(totalProducts);

      setLoading(false);
    } catch (error) {
      console.error('加载数据失败:', error);
      setLoading(false);
    }
  };

  const generateChartData = (products, reports, passRate) => {
    const data = [
      { name: '产品注册', value: products, color: '#667eea' },
      { name: '质检报告', value: reports, color: '#764ba2' },
      { name: '合格产品', value: Math.round(products * passRate / 100), color: '#11998e' },
      { name: '待检产品', value: Math.max(0, products - reports), color: '#f093fb' }
    ];
    setChartData(data);
  };

  const generateRecentActivity = (productCount) => {
    const activities = [];
    const actions = ['注册产品', '添加供应链步骤', '质量检测', '更新信息'];
    const actors = ['制造商', '分销商', '零售商', '质检员'];

    for (let i = 0; i < Math.min(5, productCount); i++) {
      activities.push({
        id: i + 1,
        action: actions[Math.floor(Math.random() * actions.length)],
        actor: actors[Math.floor(Math.random() * actors.length)],
        target: `产品 #${productCount - i}`,
        time: `${Math.floor(Math.random() * 60)} 分钟前`
      });
    }

    setRecentActivity(activities);
  };

  const StatCard = ({ icon: Icon, title, value, color, trend }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-icon" style={{ background: `${color}20` }}>
        <Icon size={28} style={{ color }} />
      </div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading"></div>
        <p>加载数据中...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>系统概览</h2>
        <p className="subtitle">实时监控供应链数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <StatCard
          icon={Package}
          title="总产品数"
          value={stats.totalProducts}
          color="#667eea"
          trend="+12% 本月"
        />
        <StatCard
          icon={TruckIcon}
          title="供应链步骤"
          value={stats.totalSteps}
          color="#764ba2"
          trend="+8% 本月"
        />
        <StatCard
          icon={CheckCircle}
          title="质检报告"
          value={stats.totalReports}
          color="#11998e"
          trend={`${stats.passRate}% 合格率`}
        />
        <StatCard
          icon={Users}
          title="系统用户"
          value={stats.totalUsers}
          color="#f093fb"
          trend="5 个角色"
        />
      </div>

      {/* 图表区域 */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>数据分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>质量概览</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="activity-section card">
        <div className="section-header">
          <h3>
            <Activity size={20} />
            最近活动
          </h3>
        </div>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>{activity.actor}</strong> {activity.action} <span className="activity-target">{activity.target}</span>
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <AlertCircle size={48} color="#ccc" />
              <p>暂无活动记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="quick-actions card">
        <h3>快速操作</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.location.hash = '#products'}>
            <Package size={20} />
            <span>注册产品</span>
          </button>
          <button className="action-btn" onClick={() => window.location.hash = '#supply-chain'}>
            <TruckIcon size={20} />
            <span>追踪供应链</span>
          </button>
          <button className="action-btn" onClick={() => window.location.hash = '#quality'}>
            <CheckCircle size={20} />
            <span>质量检测</span>
          </button>
          <button className="action-btn" onClick={() => window.location.hash = '#roles'}>
            <Users size={20} />
            <span>管理角色</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

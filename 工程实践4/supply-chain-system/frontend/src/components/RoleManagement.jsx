import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Shield, Award } from 'lucide-react';
import './RoleManagement.css';

function RoleManagement({ contracts, account, userRole, provider }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    role: 'MANUFACTURER'
  });
  const [txStatus, setTxStatus] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    manufacturerCount: 0,
    distributorCount: 0,
    retailerCount: 0,
    inspectorCount: 0
  });

  const roles = [
    { id: 'ADMIN', label: '管理员', icon: Shield, color: '#eb3349' },
    { id: 'MANUFACTURER', label: '制造商', icon: Award, color: '#667eea' },
    { id: 'DISTRIBUTOR', label: '分销商', icon: Users, color: '#764ba2' },
    { id: 'RETAILER', label: '零售商', icon: Users, color: '#11998e' },
    { id: 'QUALITY_INSPECTOR', label: '质检员', icon: Shield, color: '#f093fb' }
  ];

  useEffect(() => {
    loadUsers();
  }, [contracts]);

  const loadUsers = async () => {
    if (!contracts.RoleManager || !provider) return;

    try {
      setLoading(true);
      const userCount = Number(await contracts.RoleManager.getUserCount());
      const loadedUsers = [];
      const roleCounts = {
        adminCount: 0,
        manufacturerCount: 0,
        distributorCount: 0,
        retailerCount: 0,
        inspectorCount: 0
      };

      // 获取所有账户
      const accounts = await provider.listAccounts();
      
      for (let i = 0; i < Math.min(accounts.length, 10); i++) {
        const userAddress = accounts[i].address;
        const userRoles = [];

        // 检查每个角色
        for (const role of roles) {
          try {
            const roleHash = await contracts.RoleManager[`${role.id}_ROLE`]();
            const hasRole = await contracts.RoleManager.hasRole(roleHash, userAddress);
            if (hasRole) {
              userRoles.push(role.id);
              
              // 统计角色数量
              if (role.id === 'ADMIN') roleCounts.adminCount++;
              if (role.id === 'MANUFACTURER') roleCounts.manufacturerCount++;
              if (role.id === 'DISTRIBUTOR') roleCounts.distributorCount++;
              if (role.id === 'RETAILER') roleCounts.retailerCount++;
              if (role.id === 'QUALITY_INSPECTOR') roleCounts.inspectorCount++;
            }
          } catch (error) {
            console.log(`无法检查角色 ${role.id}`);
          }
        }

        if (userRoles.length > 0) {
          loadedUsers.push({
            address: userAddress,
            roles: userRoles,
            isCurrentUser: userAddress.toLowerCase() === account.toLowerCase()
          });
        }
      }

      setUsers(loadedUsers);
      setStats({
        totalUsers: loadedUsers.length,
        ...roleCounts
      });
      setLoading(false);
    } catch (error) {
      console.error('加载用户失败:', error);
      setLoading(false);
    }
  };

  const handleGrantRole = async (e) => {
    e.preventDefault();
    if (!contracts.RoleManager) {
      alert('合约未加载');
      return;
    }

    try {
      setTxStatus({ type: 'loading', message: '正在授予角色...' });

      const roleHash = await contracts.RoleManager[`${formData.role}_ROLE`]();
      const tx = await contracts.RoleManager.grantRole(roleHash, formData.address);

      setTxStatus({ type: 'loading', message: '等待交易确认...' });
      const receipt = await tx.wait();

      setTxStatus({ 
        type: 'success', 
        message: `角色授予成功! Gas消耗: ${receipt.gasUsed.toString()}` 
      });

      setFormData({ address: '', role: 'MANUFACTURER' });
      setShowGrantForm(false);

      setTimeout(() => {
        loadUsers();
        setTxStatus(null);
      }, 2000);

    } catch (error) {
      console.error('授予角色失败:', error);
      setTxStatus({ 
        type: 'error', 
        message: error.message || '授予失败，请检查权限' 
      });
    }
  };

  const handleRevokeRole = async (userAddress, roleId) => {
    if (!contracts.RoleManager) return;

    if (!window.confirm(`确定要撤销该用户的 ${roleId} 角色吗？`)) {
      return;
    }

    try {
      setTxStatus({ type: 'loading', message: '正在撤销角色...' });

      const roleHash = await contracts.RoleManager[`${roleId}_ROLE`]();
      const tx = await contracts.RoleManager.revokeRole(roleHash, userAddress);

      setTxStatus({ type: 'loading', message: '等待交易确认...' });
      const receipt = await tx.wait();

      setTxStatus({ 
        type: 'success', 
        message: `角色撤销成功! Gas消耗: ${receipt.gasUsed.toString()}` 
      });

      setTimeout(() => {
        loadUsers();
        setTxStatus(null);
      }, 2000);

    } catch (error) {
      console.error('撤销角色失败:', error);
      setTxStatus({ 
        type: 'error', 
        message: error.message || '撤销失败，请检查权限' 
      });
    }
  };

  const isAdmin = userRole && userRole.includes('ADMIN');

  return (
    <div className="role-management">
      <div className="page-header">
        <div>
          <h2>
            <Users size={32} />
            角色管理
          </h2>
          <p className="page-subtitle">管理系统用户和权限</p>
        </div>
        {isAdmin && (
          <button 
            className="btn-primary"
            onClick={() => setShowGrantForm(!showGrantForm)}
          >
            <UserPlus size={20} />
            授予角色
          </button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="role-stats">
        <div className="stat-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="stat-icon" style={{ background: '#667eea20' }}>
            <Users size={28} style={{ color: '#667eea' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">总用户数</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #eb3349' }}>
          <div className="stat-icon" style={{ background: '#eb334920' }}>
            <Shield size={28} style={{ color: '#eb3349' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">管理员</div>
            <div className="stat-value">{stats.adminCount}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #11998e' }}>
          <div className="stat-icon" style={{ background: '#11998e20' }}>
            <Award size={28} style={{ color: '#11998e' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">制造商</div>
            <div className="stat-value">{stats.manufacturerCount}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #764ba2' }}>
          <div className="stat-icon" style={{ background: '#764ba220' }}>
            <Users size={28} style={{ color: '#764ba2' }} />
          </div>
          <div className="stat-content">
            <div className="stat-title">其他角色</div>
            <div className="stat-value">
              {stats.distributorCount + stats.retailerCount + stats.inspectorCount}
            </div>
          </div>
        </div>
      </div>

      {txStatus && (
        <div className={`alert alert-${txStatus.type === 'success' ? 'success' : txStatus.type === 'error' ? 'error' : 'info'}`}>
          {txStatus.type === 'loading' && <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>}
          <span>{txStatus.message}</span>
        </div>
      )}

      {/* 授予角色表单 */}
      {showGrantForm && (
        <div className="card form-card">
          <h3>授予用户角色</h3>
          <form onSubmit={handleGrantRole}>
            <div className="form-group">
              <label className="label">用户地址</label>
              <input
                type="text"
                className="input-field"
                placeholder="0x..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">选择角色</label>
              <select
                className="input-field"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">确认授予</button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowGrantForm(false)}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 用户列表 */}
      <div className="card">
        <div className="table-header">
          <h3>用户列表</h3>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
            <p>加载用户数据...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="users-list">
            {users.map((user, index) => (
              <div key={index} className={`user-card ${user.isCurrentUser ? 'current-user' : ''}`}>
                <div className="user-header">
                  <div className="user-address">
                    <Users size={20} />
                    <span className="address-text">
                      {user.address.slice(0, 10)}...{user.address.slice(-8)}
                    </span>
                    {user.isCurrentUser && (
                      <span className="current-badge">当前用户</span>
                    )}
                  </div>
                </div>
                <div className="user-roles">
                  <strong>角色:</strong>
                  <div className="roles-badges">
                    {user.roles.map(roleId => {
                      const roleInfo = roles.find(r => r.id === roleId);
                      if (!roleInfo) return null;
                      const Icon = roleInfo.icon;
                      return (
                        <div 
                          key={roleId} 
                          className="role-badge-container"
                        >
                          <span 
                            className="role-badge"
                            style={{ 
                              background: `${roleInfo.color}20`,
                              color: roleInfo.color,
                              border: `2px solid ${roleInfo.color}`
                            }}
                          >
                            <Icon size={14} />
                            {roleInfo.label}
                          </span>
                          {isAdmin && !user.isCurrentUser && roleId !== 'ADMIN' && (
                            <button
                              className="revoke-btn"
                              onClick={() => handleRevokeRole(user.address, roleId)}
                              title="撤销角色"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users size={64} color="#ddd" />
            <p>暂无用户数据</p>
          </div>
        )}
      </div>

      {/* 角色说明 */}
      <div className="card">
        <h3>角色权限说明</h3>
        <div className="roles-info">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <div key={role.id} className="role-info-item">
                <div className="role-info-header" style={{ color: role.color }}>
                  <Icon size={24} />
                  <strong>{role.label}</strong>
                </div>
                <div className="role-permissions">
                  {getRolePermissions(role.id).map((perm, idx) => (
                    <div key={idx} className="permission-item">• {perm}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getRolePermissions(roleId) {
  const permissions = {
    ADMIN: ['授予和撤销所有角色', '完全的系统管理权限', '查看所有数据'],
    MANUFACTURER: ['注册新产品', '添加生产阶段', '查看产品信息'],
    DISTRIBUTOR: ['添加运输和配送阶段', '查看供应链信息'],
    RETAILER: ['添加销售阶段', '查看产品和供应链信息'],
    QUALITY_INSPECTOR: ['添加质检报告', '查看质量统计数据']
  };
  return permissions[roleId] || [];
}

export default RoleManagement;

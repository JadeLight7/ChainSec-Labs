import React, { useState } from 'react';
import { Home, Package, TruckIcon, ClipboardCheck, Users, TestTube, ChevronDown } from 'lucide-react';
import './Header.css';

function Header({ account, userRole, networkInfo, currentView, setCurrentView, onSwitchAccount }) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '仪表板', icon: Home },
    { id: 'products', label: '产品注册', icon: Package },
    { id: 'supply-chain', label: '供应链', icon: TruckIcon },
    { id: 'quality', label: '质量检测', icon: ClipboardCheck },
    { id: 'roles', label: '角色管理', icon: Users },
    { id: 'test', label: '系统测试', icon: TestTube }
  ];

  const testAccounts = [
    { index: 0, label: '管理员', role: 'ADMIN' },
    { index: 1, label: '制造商', role: 'MANUFACTURER' },
    { index: 2, label: '分销商', role: 'DISTRIBUTOR' },
    { index: 3, label: '零售商', role: 'RETAILER' },
    { index: 4, label: '质检员', role: 'QUALITY_INSPECTOR' }
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <h1>🔗 供应链溯源</h1>
          {networkInfo && (
            <div className="network-badge">
              <span className="status-dot"></span>
              {networkInfo.name}
            </div>
          )}
        </div>

        <nav className="header-nav">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="header-account">
          {account ? (
            <div className="account-dropdown">
              <button 
                className="account-trigger"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
              >
                <div className="account-info">
                  {userRole && userRole.length > 0 && (
                    <div className="user-roles">
                      {userRole.map(role => (
                        <span key={role} className="role-badge">{role}</span>
                      ))}
                    </div>
                  )}
                  <div className="account-address">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                </div>
                <ChevronDown size={16} />
              </button>

              {showAccountMenu && (
                <div className="account-menu">
                  <div className="menu-header">切换测试账户</div>
                  {testAccounts.map(acc => (
                    <button
                      key={acc.index}
                      className="menu-item"
                      onClick={() => {
                        onSwitchAccount(acc.index);
                        setShowAccountMenu(false);
                      }}
                    >
                      <span className="account-label">{acc.label}</span>
                      <span className="account-role">{acc.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-account">连接中...</div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

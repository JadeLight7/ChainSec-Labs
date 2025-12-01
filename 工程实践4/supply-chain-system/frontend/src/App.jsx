import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductRegistry from './components/ProductRegistry';
import SupplyChainTracker from './components/SupplyChainTracker';
import QualityControl from './components/QualityControl';
import RoleManagement from './components/RoleManagement';
import TestRunner from './components/TestRunner';
import contracts from './contracts.json';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contractInstances, setContractInstances] = useState({});
  const [currentView, setCurrentView] = useState('dashboard');
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      setIsLoading(true);
      
      // 连接到本地 Hardhat 节点
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      setProvider(provider);

      // 获取网络信息
      const network = await provider.getNetwork();
      setNetworkInfo({
        name: 'Hardhat Local',
        chainId: Number(network.chainId)
      });

      // 获取账户
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const signer = await provider.getSigner(0);
        setSigner(signer);
        const address = await signer.getAddress();
        setAccount(address);
        
        // 初始化合约实例
        await loadContracts(provider, signer, address);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('初始化失败:', error);
      setIsLoading(false);
    }
  };

  const loadContracts = async (provider, signer, userAddress) => {
    try {
      // 尝试读取部署信息
      const response = await fetch('/deployment-info.json');
      let deployment = {};
      
      if (response.ok) {
        deployment = await response.json();
      }

      const instances = {};
      
      // 如果有部署的合约地址，加载它们
      if (deployment.contracts) {
        for (const [name, address] of Object.entries(deployment.contracts)) {
          const contractConfig = contracts[name];
          if (contractConfig && contractConfig.abi && contractConfig.abi.length > 0) {
            instances[name] = new ethers.Contract(
              address,
              contractConfig.abi,
              signer
            );
            console.log(`✅ 加载合约: ${name} at ${address}`);
          }
        }

        setContractInstances(instances);
        
        // 检查用户角色
        if (instances.RoleManager) {
          await checkUserRole(instances.RoleManager, userAddress);
        }
      }
    } catch (error) {
      console.error('加载合约失败:', error);
    }
  };

  const checkUserRole = async (roleManager, address) => {
    try {
      const roles = ['ADMIN', 'MANUFACTURER', 'DISTRIBUTOR', 'RETAILER', 'QUALITY_INSPECTOR'];
      const userRoles = [];

      for (const role of roles) {
        try {
          const roleHash = await roleManager[`${role}_ROLE`]();
          const hasRole = await roleManager.hasRole(roleHash, address);
          if (hasRole) {
            userRoles.push(role);
          }
        } catch (e) {
          console.log(`无法检查角色: ${role}`);
        }
      }

      setUserRole(userRoles.length > 0 ? userRoles : ['NONE']);
    } catch (error) {
      console.error('检查角色失败:', error);
      setUserRole(['NONE']);
    }
  };

  const switchAccount = async (accountIndex) => {
    if (!provider) return;
    
    try {
      const signer = await provider.getSigner(accountIndex);
      const address = await signer.getAddress();
      setSigner(signer);
      setAccount(address);
      
      // 重新加载合约实例
      await loadContracts(provider, signer, address);
    } catch (error) {
      console.error('切换账户失败:', error);
    }
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px', color: 'white' }}>
          <div className="loading" style={{ 
            width: '60px', 
            height: '60px', 
            borderWidth: '6px',
            margin: '0 auto 20px'
          }}></div>
          <h2>初始化系统...</h2>
        </div>
      );
    }

    const props = {
      contracts: contractInstances,
      account,
      signer,
      provider,
      userRole
    };

    switch (currentView) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'products':
        return <ProductRegistry {...props} />;
      case 'supply-chain':
        return <SupplyChainTracker {...props} />;
      case 'quality':
        return <QualityControl {...props} />;
      case 'roles':
        return <RoleManagement {...props} />;
      case 'test':
        return <TestRunner {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  return (
    <div className="app">
      <Header 
        account={account}
        userRole={userRole}
        networkInfo={networkInfo}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onSwitchAccount={switchAccount}
      />
      <div className="container">
        {renderView()}
      </div>
    </div>
  );
}

export default App;

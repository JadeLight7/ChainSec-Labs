const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 开始部署供应链溯源系统合约...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // 1. 部署 RoleManager
  console.log("1️⃣  部署 RoleManager 合约...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy();
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  
  console.log("   ✅ RoleManager 部署成功:", roleManagerAddress);
  deploymentInfo.contracts.RoleManager = roleManagerAddress;

  // 2. 部署 ProductRegistry
  console.log("\n2️⃣  部署 ProductRegistry 合约...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(roleManagerAddress);
  await productRegistry.waitForDeployment();
  const productRegistryAddress = await productRegistry.getAddress();
  
  console.log("   ✅ ProductRegistry 部署成功:", productRegistryAddress);
  deploymentInfo.contracts.ProductRegistry = productRegistryAddress;

  // 3. 部署 SupplyChain
  console.log("\n3️⃣  部署 SupplyChain 合约...");
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy(roleManagerAddress);
  await supplyChain.waitForDeployment();
  const supplyChainAddress = await supplyChain.getAddress();
  
  console.log("   ✅ SupplyChain 部署成功:", supplyChainAddress);
  deploymentInfo.contracts.SupplyChain = supplyChainAddress;

  // 4. 部署 QualityControl
  console.log("\n4️⃣  部署 QualityControl 合约...");
  const QualityControl = await ethers.getContractFactory("QualityControl");
  const qualityControl = await QualityControl.deploy(roleManagerAddress);
  await qualityControl.waitForDeployment();
  const qualityControlAddress = await qualityControl.getAddress();
  
  console.log("   ✅ QualityControl 部署成功:", qualityControlAddress);
  deploymentInfo.contracts.QualityControl = qualityControlAddress;

  // 5. 设置角色
  console.log("\n👥 设置角色权限...");
  const accounts = await ethers.getSigners();
  
  if (accounts.length >= 5) {
    console.log("   授予 MANUFACTURER 角色给账户 1...");
    await roleManager.grantRole(
      await roleManager.MANUFACTURER_ROLE(),
      accounts[1].address
    );
    
    console.log("   授予 DISTRIBUTOR 角色给账户 2...");
    await roleManager.grantRole(
      await roleManager.DISTRIBUTOR_ROLE(),
      accounts[2].address
    );
    
    console.log("   授予 RETAILER 角色给账户 3...");
    await roleManager.grantRole(
      await roleManager.RETAILER_ROLE(),
      accounts[3].address
    );
    
    console.log("   授予 QUALITY_INSPECTOR 角色给账户 4...");
    await roleManager.grantRole(
      await roleManager.QUALITY_INSPECTOR_ROLE(),
      accounts[4].address
    );
    
    console.log("   ✅ 角色设置完成");
  }

  // 6. 保存部署信息
  const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);

  // 7. 复制到前端公共目录
  const frontendPath = path.join(__dirname, '..', 'frontend', 'public', 'deployment-info.json');
  if (fs.existsSync(path.dirname(frontendPath))) {
    fs.writeFileSync(frontendPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 部署信息已复制到前端目录");
  }

  // 8. 打印摘要
  console.log("\n" + "=".repeat(80));
  console.log("✅ 部署完成!");
  console.log("=".repeat(80));
  console.log("\n📋 部署摘要:");
  console.log("   Network:", deploymentInfo.network);
  console.log("   Chain ID:", deploymentInfo.chainId);
  console.log("   Deployer:", deploymentInfo.deployer);
  console.log("\n📜 合约地址:");
  Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log("\n" + "=".repeat(80));
  console.log("\n📝 下一步:");
  console.log("   1. 运行: node scripts/exportABI.js");
  console.log("   2. 进入前端目录: cd frontend");
  console.log("   3. 安装依赖: npm install");
  console.log("   4. 启动前端: npm run dev");
  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

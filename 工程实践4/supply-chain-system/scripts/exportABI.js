const fs = require('fs');
const path = require('path');

async function exportABI() {
  console.log("\n📦 导出合约 ABI...\n");

  const contracts = ['RoleManager', 'ProductRegistry', 'SupplyChain', 'QualityControl'];
  const config = {};

  for (const contractName of contracts) {
    const artifactPath = path.join(
      __dirname,
      '..',
      'artifacts',
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      config[contractName] = {
        address: '',
        abi: artifact.abi
      };
      console.log(`✅ 导出 ${contractName} ABI (${artifact.abi.length} 个方法)`);
    } else {
      console.log(`❌ 找不到 ${contractName} artifact`);
    }
  }

  // 读取部署信息
  const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // 更新合约地址
    Object.keys(config).forEach(contractName => {
      if (deployment.contracts[contractName]) {
        config[contractName].address = deployment.contracts[contractName];
      }
    });
    console.log("\n✅ 已加载合约地址");
  }

  // 保存到前端目录
  const outputPath = path.join(__dirname, '..', 'frontend', 'src', 'contracts.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log('\n💾 ABI 已导出到:', outputPath);

  // 打印摘要
  console.log("\n" + "=".repeat(80));
  console.log("📊 导出摘要:");
  Object.entries(config).forEach(([name, data]) => {
    console.log(`   ${name}:`);
    console.log(`     - ABI 方法数: ${data.abi.length}`);
    console.log(`     - 合约地址: ${data.address || '未部署'}`);
  });
  console.log("=".repeat(80) + "\n");
}

exportABI()
  .then(() => {
    console.log("✅ ABI 导出完成!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 导出失败:", error);
    process.exit(1);
  });

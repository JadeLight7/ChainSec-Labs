const { ethers } = require("hardhat");

class TestHelpers {
  static async getGasUsed(tx) {
    const receipt = await tx.wait();
    return receipt.gasUsed;
  }

  static async measureExecutionTime(fn) {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  }

  static async deployAllContracts(deployer) {
    const contracts = {};
    
    const RoleManager = await ethers.getContractFactory("RoleManager", deployer);
    contracts.roleManager = await RoleManager.deploy();
    await contracts.roleManager.waitForDeployment();
    
    const ProductRegistry = await ethers.getContractFactory("ProductRegistry", deployer);
    contracts.productRegistry = await ProductRegistry.deploy(
      await contracts.roleManager.getAddress()
    );
    await contracts.productRegistry.waitForDeployment();
    
    const SupplyChain = await ethers.getContractFactory("SupplyChain", deployer);
    contracts.supplyChain = await SupplyChain.deploy(
      await contracts.roleManager.getAddress()
    );
    await contracts.supplyChain.waitForDeployment();
    
    const QualityControl = await ethers.getContractFactory("QualityControl", deployer);
    contracts.qualityControl = await QualityControl.deploy(
      await contracts.roleManager.getAddress()
    );
    await contracts.qualityControl.waitForDeployment();
    
    return contracts;
  }

  static async setupRoles(roleManager, accounts) {
    const [admin, manufacturer, distributor, retailer, inspector] = accounts;
    
    await roleManager.grantRole(
      await roleManager.MANUFACTURER_ROLE(),
      manufacturer.address
    );
    
    await roleManager.grantRole(
      await roleManager.DISTRIBUTOR_ROLE(),
      distributor.address
    );
    
    await roleManager.grantRole(
      await roleManager.RETAILER_ROLE(),
      retailer.address
    );
    
    await roleManager.grantRole(
      await roleManager.QUALITY_INSPECTOR_ROLE(),
      inspector.address
    );
  }

  static formatGas(gas) {
    return gas.toString();
  }

  static calculateAverage(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  static calculatePercentile(numbers, percentile) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

module.exports = TestHelpers;

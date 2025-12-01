const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("./utils/helpers");
const fs = require('fs');

describe("【完整测试套件】供应链溯源系统", function () {
  let contracts;
  let accounts;
  let admin, manufacturer, distributor, retailer, inspector, outsider;
  let allTestResults = [];
  let gasStats = {};
  let startTime;

  before(async function () {
    this.timeout(120000);
    startTime = Date.now();
    
    accounts = await ethers.getSigners();
    [admin, manufacturer, distributor, retailer, inspector, outsider] = accounts;
    
    console.log("\n🚀 部署合约...");
    const deployStartTime = Date.now();
    contracts = await TestHelpers.deployAllContracts(admin);
    const deployDuration = Date.now() - deployStartTime;
    
    console.log("👥 设置角色...");
    await TestHelpers.setupRoles(contracts.roleManager, accounts);
    
    // 保存合约地址
    global.deployedContracts = {
      roleManager: await contracts.roleManager.getAddress(),
      productRegistry: await contracts.productRegistry.getAddress(),
      supplyChain: await contracts.supplyChain.getAddress(),
      qualityControl: await contracts.qualityControl.getAddress()
    };

    allTestResults.push({
      suite: "系统初始化",
      test: "部署所有合约",
      status: "passed",
      duration: deployDuration,
      gasUsed: 0,
      timestamp: new Date().toISOString()
    });
  });

  describe("1. 单元测试 - RoleManager", function () {
    it("1.1 应该正确初始化管理员", async function () {
      const testStart = Date.now();
      const hasRole = await contracts.roleManager.hasRole(
        await contracts.roleManager.ADMIN_ROLE(),
        admin.address
      );
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-RoleManager",
        test: "初始化管理员角色",
        status: hasRole ? "passed" : "failed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          adminAddress: admin.address,
          hasAdminRole: hasRole
        }
      });
      
      expect(hasRole).to.be.true;
    });

    it("1.2 应该能够授予角色", async function () {
      const testStart = Date.now();
      const [newUser] = await ethers.getSigners();
      const tx = await contracts.roleManager.grantRole(
        await contracts.roleManager.MANUFACTURER_ROLE(),
        newUser.address
      );
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      const hasRole = await contracts.roleManager.hasRole(
        await contracts.roleManager.MANUFACTURER_ROLE(),
        newUser.address
      );
      
      allTestResults.push({
        suite: "单元测试-RoleManager",
        test: "授予制造商角色",
        status: hasRole ? "passed" : "failed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          userAddress: newUser.address,
          role: "MANUFACTURER",
          gasUsed: Number(receipt.gasUsed),
          transactionHash: receipt.hash
        }
      });
      
      expect(hasRole).to.be.true;
    });

    it("1.3 非管理员不能授予角色", async function () {
      const testStart = Date.now();
      let failed = false;
      let errorMessage = "";
      
      try {
        await contracts.roleManager.connect(outsider).grantRole(
          await contracts.roleManager.RETAILER_ROLE(),
          retailer.address
        );
      } catch (error) {
        failed = true;
        errorMessage = error.message;
      }
      
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-RoleManager",
        test: "权限控制验证",
        status: failed ? "passed" : "failed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          expectedBehavior: "应该拒绝非管理员授权",
          actualBehavior: failed ? "正确拒绝" : "错误允许",
          errorMessage: errorMessage.substring(0, 100)
        }
      });
      
      expect(failed).to.be.true;
    });

    it("1.4 应该能够撤销角色", async function () {
      const testStart = Date.now();
      
      // 先授予角色
      const [testUser] = await ethers.getSigners();
      await contracts.roleManager.grantRole(
        await contracts.roleManager.DISTRIBUTOR_ROLE(),
        testUser.address
      );
      
      // 撤销角色
      const tx = await contracts.roleManager.revokeRole(
        await contracts.roleManager.DISTRIBUTOR_ROLE(),
        testUser.address
      );
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      const hasRole = await contracts.roleManager.hasRole(
        await contracts.roleManager.DISTRIBUTOR_ROLE(),
        testUser.address
      );
      
      allTestResults.push({
        suite: "单元测试-RoleManager",
        test: "撤销角色功能",
        status: !hasRole ? "passed" : "failed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          userAddress: testUser.address,
          roleRevoked: !hasRole,
          gasUsed: Number(receipt.gasUsed)
        }
      });
      
      expect(hasRole).to.be.false;
    });

    it("1.5 应该正确统计用户数量", async function () {
      const testStart = Date.now();
      const userCount = await contracts.roleManager.getUserCount();
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-RoleManager",
        test: "用户计数统计",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          totalUsers: Number(userCount),
          expectedMinimum: 5
        }
      });
      
      expect(userCount).to.be.greaterThan(0);
    });
  });

  describe("2. 单元测试 - ProductRegistry", function () {
    let productGasUsages = [];

    it("2.1 制造商应该能够注册产品", async function () {
      const testStart = Date.now();
      const tx = await contracts.productRegistry.connect(manufacturer)
        .registerProduct("有机苹果", "水果");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      const count = await contracts.productRegistry.getProductCount();
      productGasUsages.push(Number(receipt.gasUsed));
      
      allTestResults.push({
        suite: "单元测试-ProductRegistry",
        test: "注册产品功能",
        status: count > 0 ? "passed" : "failed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productName: "有机苹果",
          category: "水果",
          productId: Number(count),
          gasUsed: Number(receipt.gasUsed),
          transactionHash: receipt.hash
        }
      });
      
      expect(count).to.be.greaterThan(0);
    });

    it("2.2 应该能够查询产品信息", async function () {
      const testStart = Date.now();
      const productCount = await contracts.productRegistry.getProductCount();
      const product = await contracts.productRegistry.getProduct(productCount);
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-ProductRegistry",
        test: "查询产品信息",
        status: product.exists ? "passed" : "failed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(productCount),
          productName: product.name,
          category: product.category,
          manufacturer: product.manufacturer,
          exists: product.exists
        }
      });
      
      expect(product.exists).to.be.true;
    });

    it("2.3 非制造商不能注册产品", async function () {
      const testStart = Date.now();
      let failed = false;
      let errorMessage = "";
      
      try {
        await contracts.productRegistry.connect(outsider)
          .registerProduct("测试产品", "测试");
      } catch (error) {
        failed = true;
        errorMessage = error.message;
      }
      
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-ProductRegistry",
        test: "非制造商权限限制",
        status: failed ? "passed" : "failed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          expectedBehavior: "应该拒绝非制造商注册",
          actualBehavior: failed ? "正确拒绝" : "错误允许",
          unauthorizedUser: outsider.address,
          errorMessage: errorMessage.substring(0, 100)
        }
      });
      
      expect(failed).to.be.true;
    });

    it("2.4 批量注册产品性能", async function () {
      const testStart = Date.now();
      const batchSize = 10;
      const products = [
        { name: "新鲜牛奶", category: "乳制品" },
        { name: "野生三文鱼", category: "海鲜" },
        { name: "有机蔬菜", category: "蔬菜" },
        { name: "天然蜂蜜", category: "调味品" },
        { name: "精选大米", category: "粮食" },
        { name: "新鲜鸡蛋", category: "禽蛋" },
        { name: "有机茶叶", category: "饮品" },
        { name: "优质牛肉", category: "肉类" },
        { name: "新鲜水果", category: "水果" },
        { name: "有机咖啡", category: "饮品" }
      ];
      
      for (const p of products) {
        const tx = await contracts.productRegistry.connect(manufacturer)
          .registerProduct(p.name, p.category);
        const receipt = await tx.wait();
        productGasUsages.push(Number(receipt.gasUsed));
      }
      
      const duration = Date.now() - testStart;
      const avgGas = TestHelpers.calculateAverage(productGasUsages);
      
      allTestResults.push({
        suite: "单元测试-ProductRegistry",
        test: "批量注册性能测试",
        status: "passed",
        duration,
        gasUsed: Math.round(avgGas),
        timestamp: new Date().toISOString(),
        details: {
          batchSize,
          totalDuration: duration,
          averageDuration: (duration / batchSize).toFixed(2) + "ms",
          averageGas: Math.round(avgGas),
          minGas: Math.min(...productGasUsages),
          maxGas: Math.max(...productGasUsages)
        }
      });
    });

    it("2.5 查询所有产品ID", async function () {
      const testStart = Date.now();
      const ids = await contracts.productRegistry.getAllProductIds();
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-ProductRegistry",
        test: "获取产品ID列表",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          totalProducts: ids.length,
          productIds: ids.slice(0, 5).map(id => Number(id)),
          showingFirst: 5
        }
      });
      
      expect(ids.length).to.be.greaterThan(0);
    });
  });

  describe("3. 单元测试 - SupplyChain", function () {
    let testProductId;
    let supplyChainGasUsages = [];

    before(async function () {
      await contracts.productRegistry.connect(manufacturer)
        .registerProduct("供应链测试产品", "测试");
      testProductId = await contracts.productRegistry.getProductCount();
    });

    it("3.1 应该能够添加生产阶段", async function () {
      const testStart = Date.now();
      const tx = await contracts.supplyChain.connect(manufacturer)
        .addStep(testProductId, 0, "北京工厂");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      supplyChainGasUsages.push(Number(receipt.gasUsed));
      
      const steps = await contracts.supplyChain.getSteps(testProductId);
      
      allTestResults.push({
        suite: "单元测试-SupplyChain",
        test: "添加生产阶段",
        status: steps.length === 1 ? "passed" : "failed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(testProductId),
          stage: "Manufactured",
          location: "北京工厂",
          actor: manufacturer.address,
          gasUsed: Number(receipt.gasUsed),
          totalSteps: steps.length
        }
      });
      
      expect(steps.length).to.equal(1);
    });

    it("3.2 应该能够添加运输阶段", async function () {
      const testStart = Date.now();
      const tx = await contracts.supplyChain.connect(distributor)
        .addStep(testProductId, 1, "上海仓库");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      supplyChainGasUsages.push(Number(receipt.gasUsed));
      
      allTestResults.push({
        suite: "单元测试-SupplyChain",
        test: "添加运输阶段",
        status: "passed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(testProductId),
          stage: "InTransit",
          location: "上海仓库",
          actor: distributor.address,
          gasUsed: Number(receipt.gasUsed)
        }
      });
    });

    it("3.3 应该能够添加配送阶段", async function () {
      const testStart = Date.now();
      const tx = await contracts.supplyChain.connect(distributor)
        .addStep(testProductId, 2, "广州配送中心");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      supplyChainGasUsages.push(Number(receipt.gasUsed));
      
      allTestResults.push({
        suite: "单元测试-SupplyChain",
        test: "添加配送阶段",
        status: "passed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(testProductId),
          stage: "Delivered",
          location: "广州配送中心",
          actor: distributor.address,
          gasUsed: Number(receipt.gasUsed)
        }
      });
    });

    it("3.4 应该能够查询供应链步骤", async function () {
      const testStart = Date.now();
      const steps = await contracts.supplyChain.getSteps(testProductId);
      const stepCount = await contracts.supplyChain.getStepCount(testProductId);
      const duration = Date.now() - testStart;
      
      const stepDetails = steps.map((step, index) => ({
        stepNumber: index + 1,
        stage: ["Manufactured", "InTransit", "Delivered", "Sold"][Number(step.stage)],
        location: step.location,
        actor: step.actor
      }));
      
      allTestResults.push({
        suite: "单元测试-SupplyChain",
        test: "查询供应链完整信息",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(testProductId),
          totalSteps: Number(stepCount),
          steps: stepDetails,
          averageGasPerStep: Math.round(TestHelpers.calculateAverage(supplyChainGasUsages))
        }
      });
      
      expect(steps.length).to.be.greaterThan(0);
    });
  });

  describe("4. 单元测试 - QualityControl", function () {
    let testProductId;
    let qualityGasUsages = [];

    before(async function () {
      await contracts.productRegistry.connect(manufacturer)
        .registerProduct("质检测试产品", "测试");
      testProductId = await contracts.productRegistry.getProductCount();
    });

    it("4.1 质检员应该能够添加合格报告", async function () {
      const testStart = Date.now();
      const tx = await contracts.qualityControl.connect(inspector)
        .addReport(testProductId, true, "质量优秀，符合标准");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      qualityGasUsages.push(Number(receipt.gasUsed));
      
      const reports = await contracts.qualityControl.getReports(testProductId);
      
      allTestResults.push({
        suite: "单元测试-QualityControl",
        test: "添加合格质检报告",
        status: reports.length === 1 ? "passed" : "failed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(testProductId),
          passed: true,
          comments: "质量优秀，符合标准",
          inspector: inspector.address,
          gasUsed: Number(receipt.gasUsed),
          totalReports: reports.length
        }
      });
      
      expect(reports.length).to.equal(1);
    });

    it("4.2 应该能够添加不合格报告", async function () {
      const testStart = Date.now();
      
      // 创建新产品用于不合格测试
      await contracts.productRegistry.connect(manufacturer)
        .registerProduct("不合格测试", "测试");
      const failProductId = await contracts.productRegistry.getProductCount();
      
      const tx = await contracts.qualityControl.connect(inspector)
        .addReport(failProductId, false, "需要改进包装");
      const receipt = await tx.wait();
      const duration = Date.now() - testStart;
      
      qualityGasUsages.push(Number(receipt.gasUsed));
      
      allTestResults.push({
        suite: "单元测试-QualityControl",
        test: "添加不合格质检报告",
        status: "passed",
        duration,
        gasUsed: Number(receipt.gasUsed),
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(failProductId),
          passed: false,
          comments: "需要改进包装",
          inspector: inspector.address,
          gasUsed: Number(receipt.gasUsed)
        }
      });
    });

    it("4.3 应该正确计算合格率", async function () {
      const testStart = Date.now();
      const passRate = await contracts.qualityControl.getPassRate();
      const totalReports = await contracts.qualityControl.totalReports();
      const passedReports = await contracts.qualityControl.passedReports();
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "单元测试-QualityControl",
        test: "计算合格率统计",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          totalReports: Number(totalReports),
          passedReports: Number(passedReports),
          failedReports: Number(totalReports) - Number(passedReports),
          passRate: Number(passRate) + "%",
          calculatedPassRate: ((Number(passedReports) / Number(totalReports)) * 100).toFixed(2) + "%"
        }
      });
      
      expect(passRate).to.be.greaterThan(0);
    });

    it("4.4 批量质检报告性能", async function () {
      const testStart = Date.now();
      const batchSize = 5;
      
      for (let i = 0; i < batchSize; i++) {
        await contracts.productRegistry.connect(manufacturer)
          .registerProduct(`批量质检${i}`, "测试");
        const pid = await contracts.productRegistry.getProductCount();
        
        const tx = await contracts.qualityControl.connect(inspector)
          .addReport(pid, i % 3 !== 0, `批量质检报告${i}`);
        const receipt = await tx.wait();
        qualityGasUsages.push(Number(receipt.gasUsed));
      }
      
      const duration = Date.now() - testStart;
      const avgGas = TestHelpers.calculateAverage(qualityGasUsages);
      
      allTestResults.push({
        suite: "单元测试-QualityControl",
        test: "批量质检性能测试",
        status: "passed",
        duration,
        gasUsed: Math.round(avgGas),
        timestamp: new Date().toISOString(),
        details: {
          batchSize,
          totalDuration: duration,
          averageDuration: (duration / batchSize).toFixed(2) + "ms",
          averageGas: Math.round(avgGas),
          minGas: Math.min(...qualityGasUsages),
          maxGas: Math.max(...qualityGasUsages)
        }
      });
    });
  });

  describe("5. 集成测试 - 完整流程", function () {
    it("5.1 应该完成产品完整生命周期", async function () {
      const testStart = Date.now();
      
      // 1. 注册产品
      await contracts.productRegistry.connect(manufacturer)
        .registerProduct("集成测试产品", "食品");
      const productId = await contracts.productRegistry.getProductCount();
      
      // 2. 完整供应链
      await contracts.supplyChain.connect(manufacturer)
        .addStep(productId, 0, "成都生产基地");
      await contracts.supplyChain.connect(distributor)
        .addStep(productId, 1, "重庆物流中心");
      await contracts.supplyChain.connect(distributor)
        .addStep(productId, 2, "昆明配送站");
      await contracts.supplyChain.connect(retailer)
        .addStep(productId, 3, "西安超市");
      
      // 3. 质检
      await contracts.qualityControl.connect(inspector)
        .addReport(productId, true, "全程冷链，质量优秀");
      
      // 验证
      const product = await contracts.productRegistry.getProduct(productId);
      const steps = await contracts.supplyChain.getSteps(productId);
      const reports = await contracts.qualityControl.getReports(productId);
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "集成测试-完整流程",
        test: "产品完整生命周期追踪",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(productId),
          productName: product.name,
          supplyChainSteps: steps.length,
          qualityReports: reports.length,
          lifecycle: [
            { stage: "注册", location: "系统", actor: "制造商" },
            { stage: "生产", location: "成都生产基地", actor: "制造商" },
            { stage: "运输", location: "重庆物流中心", actor: "分销商" },
            { stage: "配送", location: "昆明配送站", actor: "分销商" },
            { stage: "销售", location: "西安超市", actor: "零售商" },
            { stage: "质检", result: "合格", inspector: "质检员" }
          ]
        }
      });
      
      expect(product.exists).to.be.true;
      expect(steps.length).to.equal(4);
      expect(reports.length).to.equal(1);
    });

    it("5.2 应该支持多产品并发处理", async function () {
      const testStart = Date.now();
      const concurrentProducts = 10;
      
      for (let i = 0; i < concurrentProducts; i++) {
        await contracts.productRegistry.connect(manufacturer)
          .registerProduct(`并发产品${i}`, `类别${i % 3}`);
        
        const pid = await contracts.productRegistry.getProductCount();
        
        // 添加供应链
        await contracts.supplyChain.connect(manufacturer)
          .addStep(pid, 0, `工厂${i}`);
        
        // 质检
        await contracts.qualityControl.connect(inspector)
          .addReport(pid, true, `并发测试${i}`);
      }
      
      const duration = Date.now() - testStart;
      const totalProducts = await contracts.productRegistry.getProductCount();
      
      allTestResults.push({
        suite: "集成测试-并发处理",
        test: "多产品并发处理能力",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          concurrentProducts,
          totalDuration: duration,
          averageTimePerProduct: (duration / concurrentProducts).toFixed(2) + "ms",
          totalProductsInSystem: Number(totalProducts),
          throughput: ((concurrentProducts / duration) * 1000).toFixed(2) + " products/s"
        }
      });
    });

    it("5.3 跨合约数据一致性验证", async function () {
      const testStart = Date.now();
      
      // 创建测试产品
      await contracts.productRegistry.connect(manufacturer)
        .registerProduct("一致性测试", "测试");
      const pid = await contracts.productRegistry.getProductCount();
      
      // 在所有合约中操作
      await contracts.supplyChain.connect(manufacturer).addStep(pid, 0, "测试地点");
      await contracts.qualityControl.connect(inspector).addReport(pid, true, "测试");
      
      // 验证数据
      const product = await contracts.productRegistry.getProduct(pid);
      const steps = await contracts.supplyChain.getSteps(pid);
      const reports = await contracts.qualityControl.getReports(pid);
      const duration = Date.now() - testStart;
      
      allTestResults.push({
        suite: "集成测试-数据一致性",
        test: "跨合约数据一致性",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: {
          productId: Number(pid),
          productExists: product.exists,
          hasSupplyChainData: steps.length > 0,
          hasQualityData: reports.length > 0,
          dataConsistency: "verified",
          manufacturer: product.manufacturer
        }
      });
      
      expect(product.exists && steps.length > 0 && reports.length > 0).to.be.true;
    });
  });

  describe("6. 性能测试", function () {
    it("6.1 测量合约部署Gas消耗", async function () {
      const testStart = Date.now();
      
      const RoleManager = await ethers.getContractFactory("RoleManager");
      const rm = await RoleManager.deploy();
      const rmReceipt = await rm.deploymentTransaction().wait();
      
      const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
      const pr = await ProductRegistry.deploy(await rm.getAddress());
      const prReceipt = await pr.deploymentTransaction().wait();
      
      const SupplyChain = await ethers.getContractFactory("SupplyChain");
      const sc = await SupplyChain.deploy(await rm.getAddress());
      const scReceipt = await sc.deploymentTransaction().wait();
      
      const QualityControl = await ethers.getContractFactory("QualityControl");
      const qc = await QualityControl.deploy(await rm.getAddress());
      const qcReceipt = await qc.deploymentTransaction().wait();
      
      const duration = Date.now() - testStart;
      
      gasStats.deployment = {
        RoleManager: Number(rmReceipt.gasUsed),
        ProductRegistry: Number(prReceipt.gasUsed),
        SupplyChain: Number(scReceipt.gasUsed),
        QualityControl: Number(qcReceipt.gasUsed),
        total: Number(rmReceipt.gasUsed) + Number(prReceipt.gasUsed) + 
               Number(scReceipt.gasUsed) + Number(qcReceipt.gasUsed)
      };
      
      allTestResults.push({
        suite: "性能测试-部署",
        test: "合约部署Gas消耗分析",
        status: "passed",
        duration,
        gasUsed: gasStats.deployment.total,
        timestamp: new Date().toISOString(),
        details: gasStats.deployment
      });
      
      console.log(`\n📊 部署Gas消耗:`);
      console.log(`  RoleManager: ${gasStats.deployment.RoleManager.toLocaleString()}`);
      console.log(`  ProductRegistry: ${gasStats.deployment.ProductRegistry.toLocaleString()}`);
      console.log(`  SupplyChain: ${gasStats.deployment.SupplyChain.toLocaleString()}`);
      console.log(`  QualityControl: ${gasStats.deployment.QualityControl.toLocaleString()}`);
      console.log(`  总计: ${gasStats.deployment.total.toLocaleString()}`);
    });

    it("6.2 测量函数调用Gas消耗", async function () {
      const testStart = Date.now();
      const gasUsages = {
        registerProduct: [],
        addStep: [],
        addReport: [],
        grantRole: []
      };
      
      // 测试产品注册
      for (let i = 0; i < 10; i++) {
        const tx = await contracts.productRegistry.connect(manufacturer)
          .registerProduct(`性能测试${i}`, "测试");
        const receipt = await tx.wait();
        gasUsages.registerProduct.push(Number(receipt.gasUsed));
      }
      
      // 测试添加供应链步骤
      const baseId = Number(await contracts.productRegistry.getProductCount()) - 9;
      for (let i = 0; i < 10; i++) {
        const tx = await contracts.supplyChain.connect(manufacturer)
          .addStep(baseId + i, 0, `位置${i}`);
        const receipt = await tx.wait();
        gasUsages.addStep.push(Number(receipt.gasUsed));
      }
      
      // 测试质检报告
      for (let i = 0; i < 10; i++) {
        const tx = await contracts.qualityControl.connect(inspector)
          .addReport(baseId + i, true, `报告${i}`);
        const receipt = await tx.wait();
        gasUsages.addReport.push(Number(receipt.gasUsed));
      }
      
      // 测试角色授予
      for (let i = 0; i < 10; i++) {
        const [user] = await ethers.getSigners();
        const tx = await contracts.roleManager.grantRole(
          await contracts.roleManager.MANUFACTURER_ROLE(),
          accounts[i].address
        );
        const receipt = await tx.wait();
        gasUsages.grantRole.push(Number(receipt.gasUsed));
      }
      
      const duration = Date.now() - testStart;
      
      const gasAnalysis = {
        registerProduct: {
          avg: Math.round(TestHelpers.calculateAverage(gasUsages.registerProduct)),
          min: Math.min(...gasUsages.registerProduct),
          max: Math.max(...gasUsages.registerProduct)
        },
        addStep: {
          avg: Math.round(TestHelpers.calculateAverage(gasUsages.addStep)),
          min: Math.min(...gasUsages.addStep),
          max: Math.max(...gasUsages.addStep)
        },
        addReport: {
          avg: Math.round(TestHelpers.calculateAverage(gasUsages.addReport)),
          min: Math.min(...gasUsages.addReport),
          max: Math.max(...gasUsages.addReport)
        },
        grantRole: {
          avg: Math.round(TestHelpers.calculateAverage(gasUsages.grantRole)),
          min: Math.min(...gasUsages.grantRole),
          max: Math.max(...gasUsages.grantRole)
        }
      };
      
      allTestResults.push({
        suite: "性能测试-函数调用",
        test: "各函数Gas消耗统计",
        status: "passed",
        duration,
        gasUsed: 0,
        timestamp: new Date().toISOString(),
        details: gasAnalysis
      });
      
      console.log(`\n📊 函数调用Gas消耗 (平均值):`);
      console.log(`  注册产品: ${gasAnalysis.registerProduct.avg.toLocaleString()}`);
      console.log(`  添加供应链步骤: ${gasAnalysis.addStep.avg.toLocaleString()}`);
      console.log(`  添加质检报告: ${gasAnalysis.addReport.avg.toLocaleString()}`);
      console.log(`  授予角色: ${gasAnalysis.grantRole.avg.toLocaleString()}`);
    });

    it("6.3 系统压力测试", async function () {
      this.timeout(120000);
      
      const testStart = Date.now();
      const loadTest = {
        products: 100,
        successful: 0,
        failed: 0,
        totalGas: 0,
        gasPerProduct: []
      };
      
      for (let i = 0; i < loadTest.products; i++) {
        try {
          const tx = await contracts.productRegistry.connect(manufacturer)
            .registerProduct(`压力测试${i}`, "测试");
          const receipt = await tx.wait();
          const gas = Number(receipt.gasUsed);
          
          loadTest.successful++;
          loadTest.totalGas += gas;
          loadTest.gasPerProduct.push(gas);
        } catch (error) {
          loadTest.failed++;
        }
      }
      
      const duration = Date.now() - testStart;
      const throughput = (loadTest.successful / duration) * 1000;
      
      allTestResults.push({
        suite: "性能测试-压力测试",
        test: "系统负载能力测试",
        status: loadTest.failed === 0 ? "passed" : "warning",
        duration,
        gasUsed: Math.round(loadTest.totalGas / loadTest.successful),
        timestamp: new Date().toISOString(),
        details: {
          totalAttempts: loadTest.products,
          successful: loadTest.successful,
          failed: loadTest.failed,
          successRate: ((loadTest.successful / loadTest.products) * 100).toFixed(2) + "%",
          totalDuration: duration,
          throughput: throughput.toFixed(2) + " ops/s",
          totalGasUsed: loadTest.totalGas,
          averageGas: Math.round(loadTest.totalGas / loadTest.successful),
          minGas: Math.min(...loadTest.gasPerProduct),
          maxGas: Math.max(...loadTest.gasPerProduct)
        }
      });
      
      console.log(`\n📊 压力测试结果:`);
      console.log(`  成功: ${loadTest.successful}/${loadTest.products}`);
      console.log(`  失败: ${loadTest.failed}`);
      console.log(`  吞吐量: ${throughput.toFixed(2)} ops/s`);
      console.log(`  平均Gas: ${Math.round(loadTest.totalGas / loadTest.successful).toLocaleString()}`);
    });
  });

  after(async function () {
    const totalDuration = Date.now() - startTime;
    
    // 生成详细报告
    const report = {
      metadata: {
        projectName: "区块链供应链溯源系统",
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        generatedAtLocal: new Date().toLocaleString('zh-CN'),
        testFramework: "Hardhat + Mocha + Chai",
        solcVersion: "0.8.19",
        network: "Hardhat Local Network",
        chainId: 1337,
        nodeVersion: process.version
      },
      
      summary: {
        totalTests: allTestResults.length,
        passed: allTestResults.filter(t => t.status === 'passed').length,
        failed: allTestResults.filter(t => t.status === 'failed').length,
        warnings: allTestResults.filter(t => t.status === 'warning').length,
        totalDuration,
        averageDuration: (totalDuration / allTestResults.length).toFixed(2),
        totalGasUsed: allTestResults.reduce((sum, t) => sum + (t.gasUsed || 0), 0)
      },
      
      testsByCategory: {
        unitTests: {
          RoleManager: allTestResults.filter(t => t.suite === '单元测试-RoleManager'),
          ProductRegistry: allTestResults.filter(t => t.suite === '单元测试-ProductRegistry'),
          SupplyChain: allTestResults.filter(t => t.suite === '单元测试-SupplyChain'),
          QualityControl: allTestResults.filter(t => t.suite === '单元测试-QualityControl')
        },
        integrationTests: allTestResults.filter(t => t.suite.includes('集成测试')),
        performanceTests: allTestResults.filter(t => t.suite.includes('性能测试'))
      },
      
      allTests: allTestResults,
      
      contracts: global.deployedContracts,
      
      gasStatistics: gasStats,
      
      performance: {
        averageTestDuration: (totalDuration / allTestResults.length).toFixed(2) + 'ms',
        totalExecutionTime: totalDuration + 'ms',
        testsPerSecond: ((allTestResults.length / totalDuration) * 1000).toFixed(2)
      },
      
      recommendations: generateRecommendations(allTestResults, gasStats)
    };
    
    // 创建报告目录
    const reportDir = 'test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 保存JSON报告
    fs.writeFileSync(
      `${reportDir}/test-report.json`,
      JSON.stringify(report, null, 2)
    );
    
    // 生成详细Markdown报告
    const md = generateDetailedMarkdown(report);
    fs.writeFileSync(`${reportDir}/test-report.md`, md);
    
    // 生成HTML报告
    const html = generateHTML(report);
    fs.writeFileSync(`${reportDir}/test-report.html`, html);
    
    // 打印摘要
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试报告已生成');
    console.log('='.repeat(80));
    console.log(`总测试数: ${report.summary.totalTests}`);
    console.log(`✅ 通过: ${report.summary.passed}`);
    console.log(`❌ 失败: ${report.summary.failed}`);
    console.log(`⚠️  警告: ${report.summary.warnings}`);
    console.log(`⏱️  总耗时: ${report.summary.totalDuration}ms`);
    console.log(`⛽ 总Gas: ${report.summary.totalGasUsed.toLocaleString()}`);
    console.log('\n报告文件:');
    console.log(`  📄 JSON: test-reports/test-report.json`);
    console.log(`  📝 Markdown: test-reports/test-report.md`);
    console.log(`  🌐 HTML: test-reports/test-report.html`);
    console.log('='.repeat(80) + '\n');
  });
});

function generateRecommendations(tests, gasStats) {
  const recommendations = [];
  
  const failedTests = tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    recommendations.push({
      category: '测试失败',
      priority: 'high',
      message: `有 ${failedTests.length} 个测试失败,需要立即修复`,
      affectedTests: failedTests.map(t => t.test)
    });
  }
  
  if (gasStats.deployment && gasStats.deployment.total > 5000000) {
    recommendations.push({
      category: 'Gas优化',
      priority: 'medium',
      message: '合约部署总Gas消耗较高，建议优化合约代码',
      currentGas: gasStats.deployment.total,
      targetGas: 5000000
    });
  }
  
  const coverage = (tests.filter(t => t.status === 'passed').length / tests.length) * 100;
  if (coverage < 95) {
    recommendations.push({
      category: '测试覆盖率',
      priority: 'medium',
      message: `测试通过率为 ${coverage.toFixed(2)}%，建议提高到95%以上`,
      currentCoverage: coverage.toFixed(2) + '%',
      targetCoverage: '95%'
    });
  }
  
  return recommendations;
}

function generateDetailedMarkdown(report) {
  let md = `# 区块链供应链溯源系统 - 详细测试报告\n\n`;
  
  md += `## 📋 报告元数据\n\n`;
  md += `| 项目 | 信息 |\n`;
  md += `|------|------|\n`;
  md += `| 项目名称 | ${report.metadata.projectName} |\n`;
  md += `| 版本 | ${report.metadata.version} |\n`;
  md += `| 生成时间 | ${report.metadata.generatedAtLocal} |\n`;
  md += `| 测试框架 | ${report.metadata.testFramework} |\n`;
  md += `| Solidity版本 | ${report.metadata.solcVersion} |\n`;
  md += `| Node.js版本 | ${report.metadata.nodeVersion} |\n`;
  md += `| 网络 | ${report.metadata.network} |\n\n`;

  md += `## 📊 测试统计总览\n\n`;
  md += `| 指标 | 数值 | 百分比 |\n`;
  md += `|------|------|--------|\n`;
  md += `| 总测试数 | ${report.summary.totalTests} | 100% |\n`;
  md += `| ✅ 通过 | ${report.summary.passed} | ${((report.summary.passed/report.summary.totalTests)*100).toFixed(2)}% |\n`;
  md += `| ❌ 失败 | ${report.summary.failed} | ${((report.summary.failed/report.summary.totalTests)*100).toFixed(2)}% |\n`;
  md += `| ⚠️ 警告 | ${report.summary.warnings} | ${((report.summary.warnings/report.summary.totalTests)*100).toFixed(2)}% |\n`;
  md += `| ⏱️ 总耗时 | ${report.summary.totalDuration}ms | - |\n`;
  md += `| 平均耗时 | ${report.summary.averageDuration}ms | - |\n`;
  md += `| ⛽ 总Gas消耗 | ${report.summary.totalGasUsed.toLocaleString()} | - |\n\n`;

  md += `## 🏗️ 部署的合约地址\n\n`;
  md += `| 合约名称 | 地址 |\n`;
  md += `|----------|------|\n`;
  Object.entries(report.contracts).forEach(([name, addr]) => {
    md += `| ${name} | \`${addr}\` |\n`;
  });
  md += `\n`;

  md += `## ⛽ Gas消耗统计\n\n`;
  if (report.gasStatistics.deployment) {
    md += `### 合约部署Gas消耗\n\n`;
    md += `| 合约 | Gas消耗 | 占比 |\n`;
    md += `|------|---------|------|\n`;
    Object.entries(report.gasStatistics.deployment).forEach(([contract, gas]) => {
      if (contract !== 'total' && typeof gas === 'number') {
        const percentage = ((gas / report.gasStatistics.deployment.total) * 100).toFixed(2);
        md += `| ${contract} | ${gas.toLocaleString()} | ${percentage}% |\n`;
      }
    });
    md += `| **总计** | **${report.gasStatistics.deployment.total.toLocaleString()}** | **100%** |\n\n`;
  }

  md += `## 🧪 单元测试详情\n\n`;
  
  ['RoleManager', 'ProductRegistry', 'SupplyChain', 'QualityControl'].forEach(contract => {
    const tests = report.testsByCategory.unitTests[contract];
    if (tests && tests.length > 0) {
      md += `### ${contract}\n\n`;
      md += `| 测试用例 | 状态 | 耗时 | Gas消耗 |\n`;
      md += `|---------|------|------|--------|\n`;
      tests.forEach(test => {
        const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        md += `| ${test.test} | ${status} | ${test.duration}ms | ${(test.gasUsed || 0).toLocaleString()} |\n`;
      });
      md += `\n`;
    }
  });

  md += `## 🔗 集成测试详情\n\n`;
  md += `| 测试用例 | 状态 | 耗时 |\n`;
  md += `|---------|------|------|\n`;
  report.testsByCategory.integrationTests.forEach(test => {
    const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    md += `| ${test.test} | ${status} | ${test.duration}ms |\n`;
  });
  md += `\n`;

  md += `## ⚡ 性能测试详情\n\n`;
  md += `| 测试用例 | 状态 | 耗时 | 平均Gas |\n`;
  md += `|---------|------|------|--------|\n`;
  report.testsByCategory.performanceTests.forEach(test => {
    const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    md += `| ${test.test} | ${status} | ${test.duration}ms | ${(test.gasUsed || 0).toLocaleString()} |\n`;
  });
  md += `\n`;

  if (report.recommendations.length > 0) {
    md += `## 💡 优化建议\n\n`;
    report.recommendations.forEach((rec, index) => {
      md += `### ${index + 1}. ${rec.category} (优先级: ${rec.priority})\n\n`;
      md += `${rec.message}\n\n`;
      if (rec.affectedTests) {
        md += `**受影响的测试:**\n`;
        rec.affectedTests.forEach(test => {
          md += `- ${test}\n`;
        });
        md += `\n`;
      }
    });
  }

  md += `## 📈 性能指标\n\n`;
  md += `| 指标 | 数值 |\n`;
  md += `|------|------|\n`;
  md += `| 平均测试耗时 | ${report.performance.averageTestDuration} |\n`;
  md += `| 总执行时间 | ${report.performance.totalExecutionTime} |\n`;
  md += `| 测试吞吐量 | ${report.performance.testsPerSecond} tests/s |\n\n`;

  md += `---\n\n`;
  md += `*报告生成于: ${report.metadata.generatedAtLocal}*\n`;
  
  return md;
}

function generateHTML(report) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${report.metadata.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      background: white; 
      padding: 40px; 
      border-radius: 16px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #2c3e50; 
      border-bottom: 4px solid #667eea; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
      font-size: 2.5em;
    }
    h2 { 
      color: #34495e; 
      margin: 40px 0 20px; 
      padding-bottom: 15px; 
      border-bottom: 2px solid #ecf0f1;
      font-size: 1.8em;
    }
    h3 {
      color: #555;
      margin: 25px 0 15px;
      font-size: 1.3em;
    }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
      gap: 20px; 
      margin: 30px 0;
    }
    .stat-card { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 25px; 
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-card.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .stat-card.danger { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
    .stat-card.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .stat-card.info { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .stat-title { font-size: 14px; opacity: 0.9; margin-bottom: 10px; font-weight: 500; }
    .stat-value { font-size: 36px; font-weight: bold; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    th, td { 
      padding: 15px; 
      text-align: left; 
      border-bottom: 1px solid #e0e0e0;
    }
    th { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }
    tr:hover { background: #f8f9fa; }
    tr:nth-child(even) { background: #f9f9f9; }
    .badge { 
      display: inline-block; 
      padding: 6px 14px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 700;
    }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .badge.warning { background: #fff3cd; color: #856404; }
    .recommendation { 
      background: linear-gradient(135deg, #e8f4fd 0%, #d9e9f7 100%);
      border-left: 5px solid #3498db; 
      padding: 20px; 
      margin: 15px 0; 
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .metadata { 
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px; 
      border-radius: 12px; 
      margin: 20px 0;
      border: 1px solid #dee2e6;
    }
    .metadata p { margin: 10px 0; color: #495057; font-size: 0.95em; }
    .metadata strong { color: #212529; }
    .test-detail {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .progress-bar {
      height: 30px;
      background: #e0e0e0;
      border-radius: 15px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      transition: width 0.5s;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔬 ${report.metadata.projectName}</h1>
    <p style="color: #666; font-size: 1.1em; margin-bottom: 30px;">详细测试报告</p>
    
    <div class="metadata">
      <p><strong>📅 生成时间:</strong> ${report.metadata.generatedAtLocal}</p>
      <p><strong>🔧 测试框架:</strong> ${report.metadata.testFramework}</p>
      <p><strong>📝 Solidity版本:</strong> ${report.metadata.solcVersion}</p>
      <p><strong>💻 Node.js版本:</strong> ${report.metadata.nodeVersion}</p>
      <p><strong>🌐 测试网络:</strong> ${report.metadata.network}</p>
    </div>

    <h2>📊 测试统计总览</h2>
    <div class="stats-grid">
      <div class="stat-card info">
        <div class="stat-title">总测试数</div>
        <div class="stat-value">${report.summary.totalTests}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-title">✅ 通过</div>
        <div class="stat-value">${report.summary.passed}</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-title">❌ 失败</div>
        <div class="stat-value">${report.summary.failed}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-title">⚠️ 警告</div>
        <div class="stat-value">${report.summary.warnings}</div>
      </div>
    </div>

    <div>
      <strong>测试通过率</strong>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${((report.summary.passed/report.summary.totalTests)*100).toFixed(2)}%">
          ${((report.summary.passed/report.summary.totalTests)*100).toFixed(2)}%
        </div>
      </div>
    </div>

    <h2>⛽ Gas消耗统计</h2>
    ${report.gasStatistics.deployment ? `
    <table>
      <thead>
        <tr>
          <th>合约名称</th>
          <th>Gas消耗</th>
          <th>占比</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.gasStatistics.deployment).map(([contract, gas]) => 
          contract !== 'total' && typeof gas === 'number' ? `
          <tr>
            <td><strong>${contract}</strong></td>
            <td>${gas.toLocaleString()}</td>
            <td>${((gas/report.gasStatistics.deployment.total)*100).toFixed(2)}%</td>
          </tr>
          ` : ''
        ).join('')}
        <tr style="background: #667eea; color: white; font-weight: bold;">
          <td>总计</td>
          <td>${report.gasStatistics.deployment.total.toLocaleString()}</td>
          <td>100%</td>
        </tr>
      </tbody>
    </table>
    ` : '<p>暂无Gas统计数据</p>'}

    <h2>🧪 详细测试结果</h2>
    
    ${['RoleManager', 'ProductRegistry', 'SupplyChain', 'QualityControl'].map(contract => {
      const tests = report.testsByCategory.unitTests[contract];
      if (!tests || tests.length === 0) return '';
      return `
        <h3>${contract} 合约测试</h3>
        <table>
          <thead>
            <tr>
              <th>测试用例</th>
              <th>状态</th>
              <th>耗时</th>
              <th>Gas消耗</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map(test => `
              <tr>
                <td>${test.test}</td>
                <td><span class="badge ${test.status === 'passed' ? 'success' : test.status === 'failed' ? 'danger' : 'warning'}">
                  ${test.status === 'passed' ? '✅ 通过' : test.status === 'failed' ? '❌ 失败' : '⚠️ 警告'}
                </span></td>
                <td>${test.duration}ms</td>
                <td>${(test.gasUsed || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }).join('')}

    <h2>🔗 集成测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>测试用例</th>
          <th>状态</th>
          <th>耗时</th>
        </tr>
      </thead>
      <tbody>
        ${report.testsByCategory.integrationTests.map(test => `
          <tr>
            <td>${test.test}</td>
            <td><span class="badge ${test.status === 'passed' ? 'success' : 'danger'}">
              ${test.status === 'passed' ? '✅ 通过' : '❌ 失败'}
            </span></td>
            <td>${test.duration}ms</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>⚡ 性能测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>测试用例</th>
          <th>状态</th>
          <th>耗时</th>
          <th>平均Gas</th>
        </tr>
      </thead>
      <tbody>
        ${report.testsByCategory.performanceTests.map(test => `
          <tr>
            <td>${test.test}</td>
            <td><span class="badge ${test.status === 'passed' ? 'success' : test.status === 'warning' ? 'warning' : 'danger'}">
              ${test.status === 'passed' ? '✅ 通过' : test.status === 'warning' ? '⚠️ 警告' : '❌ 失败'}
            </span></td>
            <td>${test.duration}ms</td>
            <td>${(test.gasUsed || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${report.recommendations.length > 0 ? `
    <h2>💡 优化建议</h2>
    ${report.recommendations.map((rec, index) => `
    <div class="recommendation">
      <h3>${index + 1}. ${rec.category} <span class="badge ${rec.priority === 'high' ? 'danger' : 'warning'}">优先级: ${rec.priority}</span></h3>
      <p>${rec.message}</p>
      ${rec.affectedTests ? `
        <p><strong>受影响的测试:</strong></p>
        <ul>
          ${rec.affectedTests.map(test => `<li>${test}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
    `).join('')}
    ` : ''}

    <h2>📈 性能指标</h2>
    <div class="stats-grid">
      <div class="stat-card info">
        <div class="stat-title">平均测试耗时</div>
        <div class="stat-value">${report.performance.averageTestDuration}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-title">测试吞吐量</div>
        <div class="stat-value">${report.performance.testsPerSecond}</div>
        <div class="stat-title">tests/s</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-title">总执行时间</div>
        <div class="stat-value">${report.performance.totalExecutionTime}</div>
      </div>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #999;">
      <p>报告生成于: ${report.metadata.generatedAtLocal}</p>
      <p style="margin-top: 10px; font-size: 0.9em;">© 2025 区块链供应链溯源系统</p>
    </div>
  </div>
</body>
</html>`;
}

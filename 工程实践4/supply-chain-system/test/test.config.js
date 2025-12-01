module.exports = {
  testEnvironment: {
    network: "hardhat",
    chainId: 1337,
    blockGasLimit: 30000000,
    accounts: 10,
    initialBalance: "10000000000000000000000"
  },
  performanceThresholds: {
    gasLimits: {
      deployment: {
        RoleManager: 1000000,
        ProductRegistry: 2000000,
        SupplyChain: 2000000,
        QualityControl: 2000000
      },
      functions: {
        grantRole: 100000,
        registerProduct: 200000,
        addStep: 150000,
        addReport: 150000
      }
    },
    executionTime: {
      deployment: 5000,
      transaction: 1000
    }
  },
  testData: {
    products: [
      { name: "有机苹果", category: "水果" },
      { name: "新鲜牛奶", category: "乳制品" },
      { name: "野生三文鱼", category: "海鲜" },
      { name: "有机蔬菜", category: "蔬菜" },
      { name: "天然蜂蜜", category: "调味品" }
    ],
    locations: ["北京工厂", "上海仓库", "广州配送中心", "深圳零售店"],
    qualityComments: ["质量优秀", "符合标准", "需要改进", "不合格"]
  }
};

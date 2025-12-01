
供应链溯源系统使用指南
目录
系统启动
用户操作指南
常见问题
故障排除
系统启动
第一步: 启动本地区块链
打开终端，运行:

bash
npm run node

重要: 保持此终端运行，不要关闭！

你会看到类似输出:

apache
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...

第二步: 部署智能合约
打开新终端，运行:

bash
npm run deploy

成功后会显示:

✅ 部署完成!
📜 合约地址:
   RoleManager: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   ...

第三步: 导出 ABI
继续在同一终端运行:

bash
npm run export-abi

成功后会显示:

✅ ABI 导出完成!

第四步: 启动前端
bash
cd frontend
npm install  # 首次运行需要安装依赖
npm run dev

浏览器会自动打开 http://localhost:3000

用户操作指南
1. 切换账户
点击右上角的账户地址，选择不同的测试账户：

账户 0 (管理员): 拥有所有权限
账户 1 (制造商): 可以注册产品
账户 2 (分销商): 可以添加运输步骤
账户 3 (零售商): 可以添加销售信息
账户 4 (质检员): 可以添加质检报告
2. 注册产品
切换到制造商账户 (账户 1)
点击顶部导航的"产品注册"
点击"注册新产品"按钮
填写产品信息:
产品名称: 例如 "有机苹果"
产品类别: 例如 "水果"
点击"确认注册"
等待交易确认（约 1-2 秒）
3. 添加供应链步骤
点击顶部导航的"供应链"
点击"添加供应链步骤"
选择产品
选择阶段:
🏭 生产 (制造商)
🚚 运输 (分销商)
📦 配送 (分销商)
🏪 销售 (零售商)
输入位置信息
点击"确认添加"
注意: 不同阶段需要相应的角色权限！

4. 添加质检报告
切换到质检员账户 (账户 4)
点击顶部导航的"质量检测"
点击"添加质检报告"
选择产品
选择检测结果（合格/不合格）
填写备注说明
点击"提交报告"
5. 管理角色
切换到管理员账户 (账户 0)
点击顶部导航的"角色管理"
点击"授予角色"
输入用户地址（或使用测试账户地址）
选择要授予的角色
点击"确认授予"
6. 运行测试
点击顶部导航的"系统测试"
点击"运行所有测试"
等待测试完成（约 30-60 秒）
查看详细的测试结果和性能数据
常见问题
Q1: 前端无法连接到合约？
A: 检查以下几点:

确保 Hardhat 节点正在运行 (npm run node)
确保合约已部署 (npm run deploy)
确保 ABI 已导出 (npm run export-abi)
刷新浏览器页面
Q2: 交易失败提示权限不足？
A: 检查当前账户是否有相应权限:

注册产品需要制造商权限
添加供应链步骤需要相应角色权限
添加质检报告需要质检员权限
管理角色需要管理员权限
Q3: 如何查看账户地址？
A: 在 Hardhat 节点终端中，启动时会显示所有测试账户地址。

Q4: 测试数据如何重置？
A:

停止 Hardhat 节点 (Ctrl+C)
重新运行 npm run node
重新部署合约 npm run deploy
重新导出 ABI npm run export-abi
刷新前端页面
故障排除
问题: 端口已被占用
subunit
Error: listen EADDRINUSE: address already in use :::8545

解决方案:

bash
# 查找占用端口的进程
lsof -i :8545

# 杀掉进程
kill -9 <PID>

问题: 前端启动失败
subunit
Error: Cannot find module 'vite'

解决方案:

bash
cd frontend
rm -rf node_modules
npm install

问题: 合约编译失败
subunit
Error: Cannot find module '@openzeppelin/contracts'

解决方案:

bash
npm install

问题: ABI 导出失败
❌ 找不到 RoleManager artifact

解决方案:

bash
# 重新编译合约
npx hardhat compile

# 重新导出 ABI
npm run export-abi

开发技巧
1. 快速设置脚本
创建 quick-start.sh:

bash
#!/bin/bash
echo "🚀 启动供应链系统..."

# 启动节点（后台运行）
npm run node &
NODE_PID=$!
echo "✅ Hardhat 节点已启动 (PID: $NODE_PID)"

# 等待节点启动
sleep 3

# 部署合约
npm run deploy

# 导出 ABI
npm run export-abi

# 启动前端
cd frontend
npm run dev

# 清理
trap "kill $NODE_PID" EXIT

2. 查看合约事件
在浏览器控制台中:

javascript
// 监听产品注册事件
contracts.ProductRegistry.on("ProductRegistered", (productId, name, manufacturer) => {
  console.log("新产品注册:", productId, name, manufacturer);
});

3. 直接调用合约
javascript
// 在浏览器控制台中
const tx = await contracts.ProductRegistry.registerProduct("测试", "测试");
const receipt = await tx.wait();
console.log("Gas 消耗:", receipt.gasUsed.toString());

性能优化建议
批量操作: 注册多个产品时，考虑批量处理
缓存数据: 前端可以缓存已查询的产品信息
Gas 优化: 使用 Hardhat Gas Reporter 分析 Gas 消耗
安全注意事项
⚠️ 重要提示:

这是演示项目，不要用于生产环境
私钥和助记词永远不要泄露
生产环境使用前需要完整的安全审计
建议使用多签钱包管理管理员权限
更多资源
Hardhat 文档
Ethers.js 文档
React 文档
Solidity 文档
如有其他问题，请查看 README.md 或提交 Issue。

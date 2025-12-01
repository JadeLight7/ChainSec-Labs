#!/bin/bash

echo "🚀 启动区块链供应链溯源系统"
echo "================================"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在安装依赖..."
  npm install
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 安装前端依赖..."
  cd frontend
  npm install
  cd ..
fi

# 启动 Hardhat 节点
echo ""
echo "1️⃣  启动本地区块链节点..."
npm run node > hardhat.log 2>&1 &
NODE_PID=$!
echo "   ✅ Hardhat 节点已启动 (PID: $NODE_PID)"
echo "   📝 日志文件: hardhat.log"

# 等待节点启动
echo ""
echo "⏳ 等待节点启动..."
sleep 5

# 部署合约
echo ""
echo "2️⃣  部署智能合约..."
npm run deploy

if [ $? -ne 0 ]; then
  echo "❌ 合约部署失败"
  kill $NODE_PID
  exit 1
fi

# 导出 ABI
echo ""
echo "3️⃣  导出合约 ABI..."
npm run export-abi

if [ $? -ne 0 ]; then
  echo "❌ ABI 导出失败"
  kill $NODE_PID
  exit 1
fi

# 启动前端
echo ""
echo "4️⃣  启动前端应用..."
echo ""
echo "================================"
echo "✅ 系统启动成功!"
echo "================================"
echo ""
echo "📱 访问地址: http://localhost:5173"
echo "⛓️  区块链节点: http://127.0.0.1:8545"
echo ""
echo "⚠️  按 Ctrl+C 停止系统"
echo ""

cd frontend
npm run dev

# 清理
trap "echo ''; echo '🛑 正在停止系统...'; kill $NODE_PID; echo '✅ 系统已停止'; exit 0" INT TERM

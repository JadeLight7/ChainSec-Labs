#!/bin/bash

echo "🛑 停止区块链供应链溯源系统..."

# 停止 Hardhat 节点
pkill -f "hardhat node"

# 停止 Vite 开发服务器
pkill -f "vite"

echo "✅ 系统已停止"

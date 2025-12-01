#!/bin/bash

echo "🔍 验证项目设置"
echo "================================"
echo ""

errors=0

# 检查文件
echo "📁 检查必需文件..."
files=(
  "hardhat.config.js"
  "package.json"
  "contracts/RoleManager.sol"
  "contracts/ProductRegistry.sol"
  "contracts/SupplyChain.sol"
  "contracts/QualityControl.sol"
  "scripts/deploy.js"
  "scripts/exportABI.js"
  "test/SupplyChain.test.js"
  "frontend/package.json"
  "frontend/index.html"
  "frontend/src/App.jsx"
  "frontend/src/main.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ 缺少: $file"
    ((errors++))
  fi
done

# 检查目录
echo ""
echo "📂 检查必需目录..."
dirs=(
  "contracts"
  "scripts"
  "test"
  "frontend/src/components"
)

for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ✅ $dir"
  else
    echo "   ❌ 缺少: $dir"
    ((errors++))
  fi
done

# 检查依赖
echo ""
echo "📦 检查依赖安装..."

if [ -d "node_modules" ]; then
  echo "   ✅ 后端依赖已安装"
else
  echo "   ⚠️  后端依赖未安装，运行: npm install"
  ((errors++))
fi

if [ -d "frontend/node_modules" ]; then
  echo "   ✅ 前端依赖已安装"
else
  echo "   ⚠️  前端依赖未安装，运行: cd frontend && npm install"
fi

# 检查脚本权限
echo ""
echo "🔐 检查脚本权限..."
scripts=("start.sh" "stop.sh")

for script in "${scripts[@]}"; do
  if [ -x "$script" ]; then
    echo "   ✅ $script 可执行"
  else
    echo "   ⚠️  $script 不可执行，运行: chmod +x $script"
  fi
done

echo ""
echo "================================"
if [ $errors -eq 0 ]; then
  echo "✅ 项目设置验证通过!"
  echo ""
  echo "📝 下一步:"
  echo "   1. 运行: ./start.sh"
  echo "   2. 访问: http://localhost:5173"
else
  echo "⚠️  发现 $errors 个问题，请修复后重试"
fi
echo "================================"

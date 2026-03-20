# 💧 多链水龙头 (Multi-Chain Faucet)

一个支持多测试网的 Web3 水龙头应用，用户可以通过签名验证领取测试代币。基于 React + RainbowKit + wagmi + viem 构建。

![React](https://img.shields.io/badge/React-19.2.1-blue)
![RainbowKit](https://img.shields.io/badge/RainbowKit-2.2.8-purple)
![wagmi](https://img.shields.io/badge/wagmi-2.16.2-green)
![viem](https://img.shields.io/badge/viem-2.43.1-orange)

---

## 📋 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [使用流程](#使用流程)
- [安装部署](#安装部署)
- [配置说明](#配置说明)
- [安全注意事项](#安全注意事项)

---

## ✨ 功能特性

### 多链支持
| 网络 | 链ID | 原生代币 | 支持的ERC20代币 |
|------|------|----------|-----------------|
| 🔷 Arbitrum Sepolia | 421614 | ETH | BASA-USDC, CC-USDC, CCAT |
| 🔵 Base Sepolia | 84532 | ETH | USDC |
| 🔺 Avalanche Fuji | 43113 | AVAX | USDC |

### 核心功能
- 🔗 **钱包连接**：集成 RainbowKit，支持 OKX、Zerion、Rabby 等钱包
- ✍️ **签名验证**：用户需对消息进行签名以验证身份（无 Gas 消耗）
- 💰 **代币领取**：支持原生代币和 ERC20 代币转账
- 📊 **余额显示**：实时显示水龙头地址的代币余额
- 🔍 **交易追踪**：提供区块浏览器链接查看交易详情

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  RainbowKit │  │   wagmi     │  │      viem           │  │
│  │  (钱包UI)   │  │  (状态管理)  │  │  (区块链交互)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      区块链网络层                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │Arbitrum Sepolia│ │ Base Sepolia │ │  Avalanche Fuji  │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | ^19.2.1 | 前端框架 |
| [RainbowKit](https://www.rainbowkit.com/) | ^2.2.8 | Web3 钱包连接 UI |
| [wagmi](https://wagmi.sh/) | ^2.16.2 | Web3 React Hooks |
| [viem](https://viem.sh/) | ^2.43.1 | 以太坊交互库 |
| [@tanstack/react-query](https://tanstack.com/query) | ^5.90.12 | 数据获取与缓存 |

---

## 📁 项目结构

```
Faucet_Font/
├── public/                  # 静态资源
├── src/
│   ├── json/
│   │   └── ERC20.json       # ERC20 合约 ABI
│   ├── App.js               # 主应用组件
│   ├── App.css              # 应用样式（玻璃拟态设计）
│   ├── index.js             # 应用入口（RainbowKit配置）
│   └── ...
├── .env                     # 环境变量配置
├── package.json             # 依赖配置
└── README.md                # 项目说明
```

### 关键文件说明

| 文件 | 说明 |
|------|------|
| `src/index.js` | RainbowKit + wagmi 配置，定义支持的链和钱包 |
| `src/App.js` | 核心逻辑：网络选择、签名验证、代币转账 |
| `src/json/ERC20.json` | ERC20 合约标准 ABI（balanceOf, transfer, decimals） |
| `.env` | 水龙头私钥和 WalletConnect Project ID |

---

## 🚀 使用流程

### 用户使用步骤

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. 连接钱包 │ → │ 2. 选择网络 │ → │ 3. 填写信息 │ → │ 4. 签名验证 │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              ↓
┌─────────────┐    ┌─────────────┐
│ 6. 完成领取 │ ← │ 5. 领取代币 │
└─────────────┘    └─────────────┘
```

1. **连接钱包**：点击右上角 "Connect Wallet" 按钮，选择支持的钱包（OKX、Zerion、Rabby 等）

2. **选择网络**：从下拉菜单选择目标测试网（Arbitrum Sepolia / Base Sepolia / Avalanche Fuji）

3. **选择代币**：选择要领取的代币（原生代币或 ERC20）

4. **填写接收地址**：输入您的钱包地址（必须与连接的钱包地址一致）

5. **输入数量**：填写要领取的代币数量

6. **签名验证**：点击"签名验证"按钮，在钱包中对消息进行签名（不消耗 Gas）

7. **领取代币**：签名成功后，点击"领取代币"按钮完成转账

8. **查看交易**：交易完成后，点击交易哈希在区块浏览器中查看详情

---

## 🛠️ 安装部署

### 环境要求
- Node.js >= 16
- npm >= 8

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd Faucet_Font

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置以下变量：
# REACT_APP_WALLET_CONNECT_PROJECT_ID=your_project_id

# 4. 启动开发服务器
npm start
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产构建

```bash
npm run build
```

构建产物将输出到 `build/` 目录。

---

## ⚙️ 配置说明

### 环境变量 (.env)

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `REACT_APP_WALLET_CONNECT_PROJECT_ID` | ✅ | WalletConnect Project ID，从 [WalletConnect Cloud](https://cloud.walletconnect.com/) 获取 |
| `REACT_APP_PRIVATE_KEY` | ✅ | 水龙头账户私钥，用于执行转账交易 |

### 网络配置 (src/App.js)

网络配置定义在 `NETWORKS` 对象中，包含以下信息：

```javascript
const NETWORKS = {
  arbitrumSepolia: {
    id: 421614,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeToken: { symbol: "ETH", decimals: 18 },
    tokens: { /* ... */ }
  },
  // ...
}
```

### 添加新代币

在对应网络的 `tokens` 对象中添加：

```javascript
tokens: {
  "NEW-TOKEN": {
    symbol: "NEW-TOKEN",
    address: "0x...",  // 合约地址
    decimals: 18,
    isNative: false,
  }
}
```

---

## 🔒 安全注意事项

⚠️ **重要警告**：

1. **私钥安全**
   - **切勿**将包含真实私钥的 `.env` 文件提交到代码仓库
   - 建议仅使用测试网的测试资金

2. **权限控制**
   - 当前实现中，接收地址必须与连接的钱包地址一致
   - 每次领取都需要重新签名验证

3. **资金限制**
   - 建议在水龙头账户中仅存放有限的测试资金
   - 可考虑添加领取频率限制和单次最大领取金额限制

---

## 📝 开发说明

### 签名消息格式

```
Faucet Claim Request

Receiver: {receiver_address}
Token: {token_symbol}
Amount: {amount}
Timestamp: {timestamp}

Please sign this message to verify your identity and claim test tokens.
This signature does not spend any gas fees.
```

### 交易流程

1. 用户签名消息后，前端验证签名有效性
2. 使用水龙头私钥创建 `WalletClient`
3. 根据代币类型执行不同转账：
   - 原生代币：`sendTransaction({ to, value })`
   - ERC20：`writeContract({ address, abi, functionName: "transfer", args })`
4. 等待交易确认后刷新余额显示

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：本项目仅用于测试网测试代币分发，请勿在主网使用。

import "./App.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  parseUnits,
  formatUnits,
  isAddress,
  zeroAddress,
  createPublicClient,
  createWalletClient,
  http,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, baseSepolia, avalancheFuji } from "viem/chains";

import ERC20ABI from "./json/ERC20.json";

// ============ 网络配置 ============
const NETWORKS = {
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeToken: {
      symbol: "ETH",
      decimals: 18,
      address: zeroAddress,
    },
    tokens: {
      ETH: {
        symbol: "ETH",
        address: zeroAddress,
        decimals: 18,
        isNative: true,
      },
      "BASA-USDC": {
        symbol: "BASA-USDC",
        address: "0x9f2895e19E3d73183aa620D7C8d481781f25Ec41",
        decimals: 6,
        isNative: false,
      },
      "CC-USDC": {
        symbol: "CC-USDC",
        address: "0x8D0B88bFb96bbE0747924765F0328acb1a9b9EfE",
        decimals: 6,
        isNative: false,
      },
      CCAT: {
        symbol: "CCAT",
        address: "0x3EEE0ebB098C077884F62A984f400a8690819563",
        decimals: 18,
        isNative: false,
      },
    },
  },
  baseSepolia: {
    id: baseSepolia.id,
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    nativeToken: {
      symbol: "ETH",
      decimals: 18,
      address: zeroAddress,
    },
    tokens: {
      ETH: {
        symbol: "ETH",
        address: zeroAddress,
        decimals: 18,
        isNative: true,
      },
      USDC: {
        symbol: "USDC",
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        decimals: 6,
        isNative: false,
      },
    },
  },
  avalancheFuji: {
    id: avalancheFuji.id,
    name: "Avalanche Fuji",
    chain: avalancheFuji,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    explorerUrl: "https://testnet.snowtrace.io",
    nativeToken: {
      symbol: "AVAX",
      decimals: 18,
      address: zeroAddress,
    },
    tokens: {
      AVAX: {
        symbol: "AVAX",
        address: zeroAddress,
        decimals: 18,
        isNative: true,
      },
      USDC: {
        symbol: "USDC",
        address: "0x5425890298aed601595a70AB815c96711a31Bc65",
        decimals: 6,
        isNative: false,
      },
    },
  },
};

// 从环境变量读取水龙头私钥
const FAUCET_PRIVATE_KEY = process.env.REACT_APP_PRIVATE_KEY;

// ============ 辅助函数 ============
const formatTxHash = (hash) => {
  if (!hash || typeof hash !== "string") return "";
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const getExplorerUrl = (explorerUrl, hash) => {
  if (!hash) return "";
  return `${explorerUrl}/tx/${hash}`;
};

// 生成签名消息
const generateSignMessage = (receiver, tokenSymbol, amount, timestamp) => {
  return `Faucet Claim Request

Receiver: ${receiver}
Token: ${tokenSymbol}
Amount: ${amount}
Timestamp: ${timestamp}

Please sign this message to verify your identity and claim test tokens.
This signature does not spend any gas fees.`;
};

function App() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // 状态
  const [selectedNetwork, setSelectedNetwork] = useState("arbitrumSepolia");
  const [selectedToken, setSelectedToken] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [faucetBalance, setFaucetBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [faucetAddress, setFaucetAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [signData, setSignData] = useState(null);

  const debounceTimerRef = useRef(null);

  // 获取当前网络配置
  const currentNetwork = NETWORKS[selectedNetwork];
  
  // 获取当前代币配置
  const currentToken = selectedToken ? currentNetwork.tokens[selectedToken] : null;

  // 创建水龙头账户
  const getFaucetAccount = useCallback(() => {
    if (!FAUCET_PRIVATE_KEY) {
      throw new Error("Faucet private key not configured");
    }
    return privateKeyToAccount(FAUCET_PRIVATE_KEY);
  }, []);

  // 创建 Public Client
  const getPublicClient = useCallback(() => {
    return createPublicClient({
      chain: currentNetwork.chain,
      transport: http(currentNetwork.rpcUrl),
    });
  }, [currentNetwork]);

  // 创建 Wallet Client
  const getWalletClient = useCallback(() => {
    const account = getFaucetAccount();
    return createWalletClient({
      account,
      chain: currentNetwork.chain,
      transport: http(currentNetwork.rpcUrl),
    });
  }, [currentNetwork, getFaucetAccount]);

  // 获取水龙头地址
  useEffect(() => {
    try {
      const account = getFaucetAccount();
      setFaucetAddress(account.address);
    } catch (e) {
      console.error("Failed to get faucet address:", e);
      setError("水龙头配置错误，请联系管理员");
    }
  }, [getFaucetAccount]);

  // 获取水龙头余额
  const fetchFaucetBalance = useCallback(async () => {
    if (!currentToken) {
      setFaucetBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const publicClient = getPublicClient();
      const account = getFaucetAccount();

      if (currentToken.isNative) {
        // 获取原生代币余额
        const balance = await publicClient.getBalance({
          address: account.address,
        });
        setFaucetBalance(balance);
      } else {
        // 获取 ERC20 代币余额
        const balance = await publicClient.readContract({
          address: currentToken.address,
          abi: ERC20ABI,
          functionName: "balanceOf",
          args: [account.address],
        });
        setFaucetBalance(balance);
      }
    } catch (e) {
      console.error("Failed to fetch balance:", e);
      setFaucetBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [currentToken, getPublicClient, getFaucetAccount]);

  // 防抖获取余额
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!currentToken) {
      setFaucetBalance(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchFaucetBalance();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentToken, fetchFaucetBalance]);

  // 网络切换时重置代币选择
  useEffect(() => {
    const tokens = Object.keys(currentNetwork.tokens);
    setSelectedToken(tokens[0] || "");
    // 清除之前的签名
    setSignature("");
    setSignData(null);
  }, [selectedNetwork, currentNetwork]);

  // 当接收地址改变时，清除签名
  useEffect(() => {
    setSignature("");
    setSignData(null);
  }, [receiverAddress, amount, selectedToken]);

  // 验证输入
  const validateInputs = () => {
    if (!isConnected) {
      setError("请先连接钱包");
      return false;
    }
    if (!selectedToken) {
      setError("请选择代币");
      return false;
    }
    if (!receiverAddress || !isAddress(receiverAddress)) {
      setError("请输入有效的接收地址");
      return false;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("请输入有效的数量");
      return false;
    }
    // 检查接收地址是否与连接的钱包地址匹配
    if (connectedAddress && receiverAddress.toLowerCase() !== connectedAddress.toLowerCase()) {
      setError("接收地址必须与连接的钱包地址一致");
      return false;
    }
    setError("");
    return true;
  };

  // 请求签名
  const handleRequestSignature = async () => {
    setSuccess("");
    setError("");
    setTxHash("");
    setSignature("");
    setSignData(null);

    if (!validateInputs()) return;

    setIsSigning(true);
    try {
      const timestamp = Date.now();
      const message = generateSignMessage(
        receiverAddress,
        currentToken.symbol,
        amount,
        timestamp
      );

      const sig = await signMessageAsync({ message });
      
      // 验证签名
      const isValid = await verifyMessage({
        address: receiverAddress,
        message,
        signature: sig,
      });

      if (!isValid) {
        setError("签名验证失败，请重试");
        setIsSigning(false);
        return;
      }

      setSignature(sig);
      setSignData({ message, timestamp });
      setSuccess("签名验证成功！现在可以领取代币了");
    } catch (e) {
      if (e.message?.includes("rejected") || e.message?.includes("denied")) {
        setError("您取消了签名请求");
      } else {
        setError("签名失败: " + (e.message || "未知错误"));
      }
      console.error("Signing failed:", e);
    } finally {
      setIsSigning(false);
    }
  };

  // 转账函数
  const handleTransfer = async () => {
    if (!signature || !signData) {
      setError("请先完成签名验证");
      return;
    }

    setSuccess("");
    setError("");
    setTxHash("");
    setIsTransferring(true);

    try {
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      const amountInWei = parseUnits(amount, currentToken.decimals);

      let hash;

      if (currentToken.isNative) {
        // 转账原生代币 (ETH/AVAX)
        hash = await walletClient.sendTransaction({
          to: receiverAddress,
          value: amountInWei,
        });
      } else {
        // 转账 ERC20 代币
        hash = await walletClient.writeContract({
          address: currentToken.address,
          abi: ERC20ABI,
          functionName: "transfer",
          args: [receiverAddress, amountInWei],
        });
      }

      setTxHash(hash);
      setSuccess(`转账成功！已发送 ${amount} ${currentToken.symbol}`);
      console.log("Transfer hash:", hash);

      // 等待交易确认后刷新余额
      await publicClient.waitForTransactionReceipt({ hash });
      await fetchFaucetBalance();
      
      // 清除签名，下次需要重新签名
      setSignature("");
      setSignData(null);
    } catch (e) {
      setError("转账失败: " + (e.message || "未知错误"));
      console.error("Transfer failed:", e);
    } finally {
      setIsTransferring(false);
    }
  };

  // 填充当前连接地址
  const fillConnectedAddress = () => {
    if (connectedAddress) {
      setReceiverAddress(connectedAddress);
      // 清除之前的签名，因为地址变了
      setSignature("");
      setSignData(null);
    }
  };

  // 网络选项
  const networkOptions = [
    { value: "arbitrumSepolia", label: "🔷 Arbitrum Sepolia" },
    { value: "baseSepolia", label: "🔵 Base Sepolia" },
    { value: "avalancheFuji", label: "🔺 Avalanche Fuji" },
  ];

  // 代币选项
  const tokenOptions = Object.entries(currentNetwork.tokens).map(([key, token]) => ({
    value: key,
    label: `${token.isNative ? "⛽" : "🪙"} ${token.symbol}`,
  }));

  return (
    <div className="App">
      <div className="background-gradient"></div>
      <header className="App-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">💧</span>
            多链水龙头
          </h1>
          <p className="app-subtitle">Arbitrum Sepolia · Base Sepolia · Avalanche Fuji</p>
          <div className="connect-button-wrapper">
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="App-body">
        <div className="faucet-card">
          <div className="card-header">
            <h2>🎯 Claim Test Tokens</h2>
            <div className="card-divider"></div>
          </div>

          <div className="form-container">
            {/* 网络选择 */}
            <div className="input-group">
              <label htmlFor="network">
                <span className="label-icon">🌐</span>
                Network
              </label>
              <select
                id="network"
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="input-field select-field"
              >
                {networkOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 代币选择 */}
            <div className="input-group">
              <label htmlFor="token">
                <span className="label-icon">🪙</span>
                Token
              </label>
              <select
                id="token"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="input-field select-field"
              >
                {tokenOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* 水龙头余额显示 */}
              {currentToken && (
                <div className="balance-display faucet-balance">
                  {isLoadingBalance ? (
                    <span className="balance-loading">
                      <span className="spinner small"></span>
                      读取余额中...
                    </span>
                  ) : faucetBalance !== null ? (
                    <span className="balance-value">
                      <span className="balance-label">Faucet Balance</span>
                      <span className="balance-amount">
                        {formatUnits(faucetBalance, currentToken.decimals)} {currentToken.symbol}
                      </span>
                    </span>
                  ) : (
                    <span className="balance-error">无法读取余额</span>
                  )}
                </div>
              )}
              
              {/* 代币地址显示 */}
              {currentToken && (
                <div className="token-address-display">
                  <span className="token-address-label">Contract</span>
                  <code className="token-address-code">{currentToken.address}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentToken.address);
                      setSuccess("Token address copied!");
                      setTimeout(() => setSuccess(""), 2000);
                    }}
                    className="copy-button small"
                    title="复制地址"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>

            {/* 接收地址 */}
            <div className="input-group">
              <label htmlFor="receiverAddress">
                <span className="label-icon">📍</span>
                Receiver
                {connectedAddress && (
                  <span className="address-hint">Must match connected wallet</span>
                )}
              </label>
              <div className="input-with-button">
                <input
                  id="receiverAddress"
                  type="text"
                  placeholder="0x..."
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="input-field"
                />
                {connectedAddress && (
                  <button
                    type="button"
                    onClick={fillConnectedAddress}
                    className="fill-button"
                    title="Use connected wallet address"
                  >
                    Use Current
                  </button>
                )}
              </div>
            </div>

            {/* 数量 */}
            <div className="input-group">
              <label htmlFor="amount">
                <span className="label-icon">💰</span>
                Amount
                {currentToken && (
                  <span className="decimals-hint">
                    Decimals: {currentToken.decimals}
                  </span>
                )}
              </label>
              <input
                id="amount"
                type="number"
                placeholder={`e.g. ${currentToken?.isNative ? "0.1" : "100"}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                step="0.000000000000000001"
                min="0"
              />
              {amount && currentToken && (
                <div className="amount-preview">
                  <span className="amount-preview-label">Raw Amount</span>
                  <span className="amount-preview-value">
                    {(() => {
                      try {
                        return parseUnits(amount, currentToken.decimals).toString();
                      } catch (e) {
                        return "无效数量";
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* 签名状态 */}
            {signature && (
              <div className="message success-message">
                <span className="message-icon">✍️</span>
                <span>签名验证成功</span>
              </div>
            )}

            {/* 错误和成功消息 */}
            {error && (
              <div className="message error-message">
                <span className="message-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && !signature && (
              <div className="message success-message">
                <span className="message-icon">✅</span>
                <span>{success}</span>
              </div>
            )}

            {txHash && (
              <div className="message info-message">
                <span className="message-icon">🔗</span>
                <a
                  href={getExplorerUrl(currentNetwork.explorerUrl, txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-hash-link"
                  title="在区块浏览器中查看"
                >
                  查看交易: {formatTxHash(txHash)}
                </a>
              </div>
            )}

            {/* 按钮组 */}
            <div className="button-group">
              {!signature ? (
                <button
                  onClick={handleRequestSignature}
                  disabled={isSigning || !isConnected}
                  className="action-button sign-button"
                >
                  {isSigning ? (
                    <>
                      <span className="spinner"></span>
                      等待签名...
                    </>
                  ) : (
                    <>
                      <span>✍️</span>
                      签名验证
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="action-button transfer-button"
                >
                  {isTransferring ? (
                    <>
                      <span className="spinner"></span>
                      转账中...
                    </>
                  ) : (
                    <>
                      <span>🎁</span>
                      领取 {currentToken?.symbol || "代币"}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 说明文字 */}
            <div className="info-text">
              <p>💡 Connect Wallet → Fill Details → Sign → Claim</p>
              <p>⚠️ Signing is gas-free, used for verification only</p>
            </div>

            {/* 水龙头信息 */}
            <div className="faucet-info">
              <div className="info-divider"></div>
              <p className="faucet-address">
                <span className="info-label">Faucet:</span>
                <code className="info-code">{faucetAddress || "Loading..."}</code>
                {faucetAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(faucetAddress);
                      setSuccess("Faucet address copied!");
                      setTimeout(() => setSuccess(""), 2000);
                    }}
                    className="copy-button tiny"
                    title="Copy address"
                  >
                    📋
                  </button>
                )}
              </p>
              <p className="network-info">
                <span className="info-label">Network:</span>
                <span className="info-value">{currentNetwork.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

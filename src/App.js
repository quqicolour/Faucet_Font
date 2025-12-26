import "./App.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  parseUnits,
  parseGwei,
  formatUnits,
  isAddress,
  zeroAddress,
} from "viem";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

import FaucetABI from "./json/Faucet.json";
import ERC20ABI from "./json/ERC20.json";

const faucetAddress = "0x8A3832136896229C281Dd0760FEF8E4CE4718587";

// 格式化交易哈希：显示前6位和后4位
const formatTxHash = (hash) => {
  if (!hash || typeof hash !== "string") return "";
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

// 获取区块浏览器链接
const getExplorerUrl = (hash) => {
  if (!hash) return "";
  return `https://sepolia.arbiscan.io/tx/${hash}`;
};

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

function App() {
  const { address: connectedAddress } = useAccount();
  const [tokenAddress, setTokenAddress] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState(""); // 存储交易哈希
  const [txType, setTxType] = useState(""); // 存储交易类型（mint/claim）
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState(18); // 默认18位（ETH）

  // 检查是否为零地址
  const isZeroAddress =
    tokenAddress &&
    isAddress(tokenAddress) &&
    tokenAddress.toLowerCase() === zeroAddress.toLowerCase();

  // 用于防抖的 ref
  const debounceTimerRef = useRef(null);

  // 获取 ERC20 token 的 decimals
  const fetchTokenDecimals = useCallback(
    async (tokenAddr) => {
      if (!publicClient || !tokenAddr || !isAddress(tokenAddr)) {
        setTokenDecimals(18);
        return 18;
      }

      // 如果是零地址，直接返回 18
      if (tokenAddr.toLowerCase() === zeroAddress.toLowerCase()) {
        setTokenDecimals(18);
        return 18;
      }

      try {
        const decimals = await publicClient.readContract({
          address: tokenAddr,
          abi: ERC20ABI,
          functionName: "decimals",
        });
        const decimalsNum = Number(decimals);
        setTokenDecimals(decimalsNum);
        return decimalsNum;
      } catch (e) {
        console.warn("Failed to fetch token decimals, using default 18:", e);
        setTokenDecimals(18);
        return 18;
      }
    },
    [publicClient]
  );

  // 获取余额的统一函数
  const fetchBalance = useCallback(
    async (tokenAddr) => {
      if (!publicClient) {
        return;
      }

      // 如果地址无效，清空余额
      if (!tokenAddr || !isAddress(tokenAddr)) {
        setBalance(null);
        setIsLoadingBalance(false);
        return;
      }

      setIsLoadingBalance(true);

      try {
        // 如果是零地址，获取 ETH 余额
        if (tokenAddr.toLowerCase() === zeroAddress.toLowerCase()) {
          const ethBalance = await publicClient.getBalance({
            address: faucetAddress,
          });
          setBalance(ethBalance);
          setTokenDecimals(18);
        } else {
          // 获取 ERC20 token 余额
          // 先获取 decimals
          const decimals = await fetchTokenDecimals(tokenAddr);

          // 调用 Faucet 合约的 getTokenBalance 函数
          const tokenBalance = await publicClient.readContract({
            address: faucetAddress,
            abi: FaucetABI.abi,
            functionName: "getTokenBalance",
            args: [tokenAddr, faucetAddress],
          });
          setBalance(tokenBalance);
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [publicClient, fetchTokenDecimals]
  );

  // 实时获取余额（带防抖）
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 如果地址为空，清空余额
    if (!tokenAddress || !isAddress(tokenAddress)) {
      setBalance(null);
      setIsLoadingBalance(false);
      return;
    }

    // 设置防抖，500ms 后执行
    debounceTimerRef.current = setTimeout(() => {
      fetchBalance(tokenAddress);
    }, 500);

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tokenAddress, fetchBalance]);

  const validateInputs = () => {
    if (!tokenAddress || !isAddress(tokenAddress)) {
      setError("请输入有效的代币地址");
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

    const walletClient = createWalletClient({
      chain: arbitrumSepolia,
      transport: custom(window.ethereum),
    });
    if (!walletClient) {
      setError("请先连接钱包");
      return false;
    }
    setError("");
    return true;
  };

  const handleMint = async () => {
    setSuccess("");
    setError("");
    setTxHash("");
    setTxType("");
    if (!validateInputs()) return;

    setIsMinting(true);
    try {
      // 使用正确的decimals：ETH固定18位，ERC20使用代币的decimals
      const decimals = isZeroAddress ? 18 : tokenDecimals;
      const amountIn = parseUnits(amount, decimals);

      


      const walletClient = createWalletClient({
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });
      
      const hash = await walletClient.writeContract({
        address: faucetAddress,
        abi: FaucetABI.abi,
        functionName: "mint",
        args: [tokenAddress, receiverAddress, amountIn],
        maxFeePerGas: parseGwei("50"),
        account: connectedAddress,
      });
      
      setTxHash(hash);
      setTxType("mint");
      setSuccess("Mint成功！");
      console.log("mint:", hash);

      // 等待交易确认后刷新余额
      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        // 刷新余额
        await fetchBalance(tokenAddress);
      }
    } catch (e) {
      setError("Transaction fail");
      console.error("Mint fail:", e);
    } finally {
      setIsMinting(false);
    }
  };

  const handleClaim = async () => {
    setSuccess("");
    setError("");
    setTxHash("");
    setTxType("");
    if (!validateInputs()) return;

    setIsClaiming(true);
    try {
      // 使用正确的decimals：ETH固定18位，ERC20使用代币的decimals
      const decimals = isZeroAddress ? 18 : tokenDecimals;
      const amountInWei = parseUnits(amount, decimals);

      const walletClient = createWalletClient({
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });
      const hash = await walletClient.writeContract({
        address: faucetAddress,
        abi: FaucetABI.abi,
        functionName: "claim",
        args: [tokenAddress, receiverAddress, amountInWei],
        account: connectedAddress,
      });
      
      setTxHash(hash);
      setTxType("claim");
      setSuccess("Claim成功！");
      console.log("claim:", hash);

      // 等待交易确认后刷新余额
      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        // 刷新余额
        await fetchBalance(tokenAddress);
      }
    } catch (e) {
      setError("Transaction fail");
      console.error("Claim fail:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const fillConnectedAddress = () => {
    if (connectedAddress) {
      setReceiverAddress(connectedAddress);
    }
  };

  return (
    <div className="App">
      <div className="background-gradient"></div>
      <header className="App-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">💧</span>
            Faucet 水龙头
          </h1>
          <p className="app-subtitle">轻松获取测试代币</p>
          <div className="connect-button-wrapper">
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="App-body">
        <div className="faucet-card">
          <div className="card-header">
            <h2>代币操作</h2>
            <div className="card-divider"></div>
          </div>

          <div className="form-container">
            <div className="input-group">
              <label htmlFor="tokenAddress">
                <span className="label-icon">🪙</span>
                代币地址
                {isZeroAddress && (
                  <span className="zero-address-badge">(零地址 = ETH)</span>
                )}
              </label>
              <div className="input-with-button">
                <input
                  id="tokenAddress"
                  type="text"
                  placeholder="0x... (输入零地址表示ETH)"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setTokenAddress(zeroAddress)}
                  className="fill-button zero-address-button"
                  title="使用零地址（ETH）"
                >
                  使用零地址
                </button>
              </div>
              <div className="zero-address-display">
                <span className="zero-address-label">零地址 (ETH):</span>
                <code className="zero-address-code">{zeroAddress}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(zeroAddress);
                    // 如果当前没有交易哈希，才显示复制成功消息
                    if (!txHash) {
                      setSuccess("零地址已复制到剪贴板");
                      setTimeout(() => setSuccess(""), 2000);
                    }
                  }}
                  className="copy-button"
                  title="复制零地址"
                >
                  📋 复制
                </button>
              </div>
              {tokenAddress && isAddress(tokenAddress) && (
                <div className="balance-display">
                  {isLoadingBalance ? (
                    <span className="balance-loading">
                      <span className="spinner small"></span>
                      读取余额中...
                    </span>
                  ) : balance !== null ? (
                    <span className="balance-value">
                      <span className="balance-label">
                        {isZeroAddress ? "ETH余额" : "代币余额"}:
                      </span>
                      <span className="balance-amount">
                        {formatUnits(balance, tokenDecimals)}
                      </span>
                    </span>
                  ) : (
                    <span className="balance-error">无法读取余额</span>
                  )}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="receiverAddress">
                <span className="label-icon">📍</span>
                接收地址
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
                    title="使用当前连接的钱包地址"
                  >
                    使用当前地址
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="amount">
                <span className="label-icon">💰</span>
                数量
                {tokenAddress && isAddress(tokenAddress) && (
                  <span className="decimals-hint">
                    ({isZeroAddress ? "ETH" : "代币"} 小数位数: {tokenDecimals})
                  </span>
                )}
              </label>
              <input
                id="amount"
                type="number"
                placeholder="例如: 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                step="0.000000000000000001"
                min="0"
              />
              {amount && tokenAddress && isAddress(tokenAddress) && (
                <div className="amount-preview">
                  <span className="amount-preview-label">实际数量:</span>
                  <span className="amount-preview-value">
                    {(() => {
                      try {
                        const decimals = isZeroAddress ? 18 : tokenDecimals;
                        return parseUnits(amount, decimals).toString();
                      } catch (e) {
                        return "无效数量";
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="message error-message">
                <span className="message-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && txHash && (
              <div className="message success-message">
                <span className="message-icon">✅</span>
                <span>{success}</span>
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-hash-link"
                  title="在区块浏览器中查看"
                >
                  交易哈希: {formatTxHash(txHash)}
                </a>
              </div>
            )}

            <div className="button-group">
              <button
                onClick={handleMint}
                disabled={isMinting || isClaiming}
                className="action-button mint-button"
              >
                {isMinting ? (
                  <>
                    <span className="spinner"></span>
                    处理中...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Mint
                  </>
                )}
              </button>
              <button
                onClick={handleClaim}
                disabled={isMinting || isClaiming}
                className="action-button claim-button"
              >
                {isClaiming ? (
                  <>
                    <span className="spinner"></span>
                    处理中...
                  </>
                ) : (
                  <>
                    <span>🎁</span>
                    Claim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

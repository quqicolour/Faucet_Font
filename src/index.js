import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// RainbowKit
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { http } from 'wagmi';
import {
  arbitrumSepolia,
  baseSepolia,
  avalancheFuji,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { okxWallet, zerionWallet, rabbyWallet } from '@rainbow-me/rainbowkit/wallets';

const config = getDefaultConfig({
  appName: 'Multi-Chain Faucet',
  wallets: [
    {
      groupName: 'Preferred',
      wallets: [okxWallet, zerionWallet, rabbyWallet],
    },
  ],
  projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || 'demo',
  chains: [arbitrumSepolia, baseSepolia, avalancheFuji],
  transports: {
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [avalancheFuji.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider coolMode={true}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

reportWebVitals();

"use client";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bscTestnet, bsc } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

// NB: walletConnect is intentionally NOT included — it requires a valid
// reown/WalletConnect Cloud projectId. Passing a stub crashes wagmi at
// config time and the entire provider tree fails to mount, which makes
// ConnectButton invisible. Plain `injected` covers MetaMask + most
// extension wallets without any external dependency.
const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
    [bsc.id]: http("https://bsc-dataseed1.binance.org/"),
  },
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
});

export function Web3Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#0047cc", borderRadius: "medium" })}
          initialChain={bscTestnet}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

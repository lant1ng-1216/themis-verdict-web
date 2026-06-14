"use client";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bscTestnet, bsc } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "themis-default-wc-id";

const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
    [bsc.id]: http("https://bsc-dataseed1.binance.org/"),
  },
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask(),
    walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true }),
  ],
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

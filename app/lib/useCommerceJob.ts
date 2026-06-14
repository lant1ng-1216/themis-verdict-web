"use client";
import { useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, usePublicClient } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { decodeEventLog, parseEventLogs, maxUint256 } from "viem";
import { COMMERCE_ABI, ERC20_ABI } from "./commerceAbi";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

export type CommerceStep =
  | "idle"
  | "switching_chain"
  | "preparing"
  | "approving"
  | "creating_job"
  | "funding"
  | "executing"
  | "done"
  | "error";

export interface PrepareParams {
  kind: "verdict" | "skill";
  skill_id?: string;
  user_id: string;
  symbol: string;
  question: string;
  budget_bnb?: number;
  lang: string;
}

export interface CommerceResult {
  job_id: number;
  ticket_id: string;
  tx_approve?: `0x${string}`;
  tx_create?: `0x${string}`;
  tx_fund?: `0x${string}`;
  tx_submit_url?: string;
  analysis?: string;
  verdict?: any;
}

export function useCommerceJob() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<CommerceStep>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<CommerceResult | null>(null);

  const reset = useCallback(() => {
    setStep("idle"); setError(""); setResult(null);
  }, []);

  const run = useCallback(async (params: PrepareParams) => {
    if (!isConnected || !address) { setError("Please connect your wallet first"); setStep("error"); return; }
    if (!publicClient) { setError("RPC unavailable"); setStep("error"); return; }
    setError(""); setResult(null);

    try {
      // 1. Make sure we're on BSC testnet
      if (chainId !== bscTestnet.id) {
        setStep("switching_chain");
        await switchChainAsync({ chainId: bscTestnet.id });
      }

      // 2. Ask backend for tx params (creates a ticket)
      setStep("preparing");
      const prepUrl = params.kind === "verdict"
        ? `${AGENT_API}/api/commerce/verdict/prepare`
        : `${AGENT_API}/api/commerce/skill/${params.skill_id}/prepare`;
      const prepBody = params.kind === "verdict"
        ? { user_id: params.user_id, symbol: params.symbol, question: params.question, budget_bnb: params.budget_bnb }
        : { user_id: params.user_id, symbol: params.symbol, question: params.question };
      const prepRes = await fetch(prepUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepBody),
      });
      const prep = await prepRes.json();
      if (!prepRes.ok) throw new Error(prep.detail || "Prepare failed");

      const COMMERCE = prep.commerce_contract as `0x${string}`;
      const TOKEN    = prep.payment_token as `0x${string}`;
      const budget   = BigInt(prep.budget_units);

      // 3. Check current allowance, approve max if needed
      const allowance = await publicClient.readContract({
        address: TOKEN, abi: ERC20_ABI,
        functionName: "allowance", args: [address, COMMERCE],
      }) as bigint;

      let tx_approve: `0x${string}` | undefined;
      if (allowance < budget) {
        setStep("approving");
        tx_approve = await writeContractAsync({
          address: TOKEN, abi: ERC20_ABI,
          functionName: "approve", args: [COMMERCE, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: tx_approve });
      }

      // 4. createJob
      setStep("creating_job");
      const args = prep.create_job_args;
      const tx_create = await writeContractAsync({
        address: COMMERCE, abi: COMMERCE_ABI,
        functionName: "createJob",
        args: [args.provider, args.evaluator, BigInt(args.expiredAt), args.description, args.hook],
      });
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: tx_create });

      // Extract jobId from JobCreated event
      const logs = parseEventLogs({
        abi: COMMERCE_ABI, logs: createReceipt.logs, eventName: "JobCreated",
      });
      const jobLog = logs.find((l: any) => l.args?.client?.toLowerCase() === address.toLowerCase());
      const jobId = Number(jobLog?.args?.jobId ?? logs[0]?.args?.jobId);
      if (!jobId) throw new Error("Could not extract job ID from receipt");

      // 5. fund(jobId, budget)
      setStep("funding");
      const tx_fund = await writeContractAsync({
        address: COMMERCE, abi: COMMERCE_ABI,
        functionName: "fund",
        args: [BigInt(jobId), budget, "0x"],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx_fund });

      // 6. Backend executes — runs verdict + submits on-chain
      setStep("executing");
      const execUrl = params.kind === "verdict"
        ? `${AGENT_API}/api/commerce/verdict/execute`
        : `${AGENT_API}/api/commerce/skill/execute`;
      const execRes = await fetch(execUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: params.user_id,
          ticket_id: prep.ticket_id,
          job_id: jobId,
          lang: params.lang,
          tx_create, tx_fund,
        }),
      });
      const exec = await execRes.json();
      if (!execRes.ok) throw new Error(exec.detail || "Execute failed");

      setStep("done");
      const out: CommerceResult = {
        job_id: jobId,
        ticket_id: prep.ticket_id,
        tx_approve, tx_create, tx_fund,
        tx_submit_url: exec.submit?.tx_submit_url,
        analysis: exec.analysis,
        verdict: exec.verdict,
      };
      setResult(out);
      return out;
    } catch (e: any) {
      console.error("[commerce]", e);
      setError(e?.shortMessage || e?.message || String(e));
      setStep("error");
    }
  }, [address, isConnected, chainId, switchChainAsync, writeContractAsync, publicClient]);

  return { step, error, result, run, reset, isConnected, address };
}

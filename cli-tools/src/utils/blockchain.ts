import { ethers } from 'ethers';
import { getNetworkConfig } from './config';

export function getProvider(networkName: string): ethers.Provider {
  const networkConfig = getNetworkConfig(networkName);
  return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
}

export function getSigner(networkName: string, provider?: ethers.Provider): ethers.Wallet {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('No private key found. Set DEPLOYER_PRIVATE_KEY or RELAYER_PRIVATE_KEY environment variable.');
  }

  if (!provider) {
    provider = getProvider(networkName);
  }

  return new ethers.Wallet(privateKey, provider);
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export function formatEther(wei: string | bigint): string {
  return ethers.formatEther(wei);
}

export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}

export function formatGwei(wei: string | bigint): string {
  return ethers.formatUnits(wei, 'gwei');
}

export function parseGwei(gwei: string): bigint {
  return ethers.parseUnits(gwei, 'gwei');
}

export async function getBlockNumber(networkName: string): Promise<number> {
  const provider = getProvider(networkName);
  return await provider.getBlockNumber();
}

export async function getGasPrice(networkName: string): Promise<bigint> {
  const provider = getProvider(networkName);
  const feeData = await provider.getFeeData();
  return feeData.gasPrice || BigInt(0);
}

export async function getBalance(address: string, networkName: string): Promise<bigint> {
  const provider = getProvider(networkName);
  return await provider.getBalance(address);
}

export async function getTransactionReceipt(txHash: string, networkName: string): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider(networkName);
  return await provider.getTransactionReceipt(txHash);
}

export async function waitForTransaction(txHash: string, networkName: string, confirmations = 1): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider(networkName);
  return await provider.waitForTransaction(txHash, confirmations);
}

export function getExplorerUrl(networkName: string, txHash?: string, address?: string): string {
  const explorers: { [key: string]: string } = {
    ethereum: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    localhost: 'http://localhost:8545' // No explorer for localhost
  };

  const baseUrl = explorers[networkName];
  if (!baseUrl || networkName === 'localhost') {
    return 'N/A';
  }

  if (txHash) {
    return `${baseUrl}/tx/${txHash}`;
  }
  
  if (address) {
    return `${baseUrl}/address/${address}`;
  }

  return baseUrl;
}

export function getNetworkDisplayName(networkName: string): string {
  const displayNames: { [key: string]: string } = {
    ethereum: 'Ethereum Mainnet',
    bsc: 'Binance Smart Chain',
    polygon: 'Polygon',
    localhost: 'Local Network'
  };

  return displayNames[networkName] || networkName;
}

export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

export function truncateHash(hash: string, startChars = 8, endChars = 6): string {
  if (hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
}


import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getRelayerConfig } from './config';

let relayerClient: AxiosInstance | null = null;

export function getRelayerClient(): AxiosInstance {
  if (!relayerClient) {
    const config = getRelayerConfig();
    
    relayerClient = axios.create({
      baseURL: config.url,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'relayer-cli/1.0.0'
      }
    });

    // Request interceptor
    relayerClient.interceptors.request.use(
      (config) => {
        // Add any authentication headers here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    relayerClient.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Handle common errors
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to relayer backend. Is it running?');
        }
        
        if (error.code === 'ENOTFOUND') {
          throw new Error('Relayer backend URL not found. Check your configuration.');
        }
        
        if (error.response) {
          // Server responded with error status
          const status = error.response.status;
          const message = error.response.data?.error || error.response.data?.message || error.message;
          
          switch (status) {
            case 400:
              throw new Error(`Bad Request: ${message}`);
            case 401:
              throw new Error(`Unauthorized: ${message}`);
            case 403:
              throw new Error(`Forbidden: ${message}`);
            case 404:
              throw new Error(`Not Found: ${message}`);
            case 429:
              throw new Error(`Rate Limited: ${message}`);
            case 500:
              throw new Error(`Server Error: ${message}`);
            default:
              throw new Error(`HTTP ${status}: ${message}`);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  return relayerClient;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getRelayerClient();
    const response = await client.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function getRelayerHealth(): Promise<any> {
  const client = getRelayerClient();
  const response = await client.get('/health');
  return response.data;
}

export async function getRelayerMetrics(): Promise<any> {
  const client = getRelayerClient();
  const response = await client.get('/api/v1/metrics');
  return response.data;
}

export async function submitMetaTransaction(request: any): Promise<any> {
  const client = getRelayerClient();
  const response = await client.post('/api/v1/relay', request);
  return response.data;
}

export async function getTransactionStatus(txHash: string): Promise<any> {
  const client = getRelayerClient();
  const response = await client.get(`/api/v1/transaction/${txHash}`);
  return response.data;
}

export async function getTransactionsByAddress(address: string, limit?: number): Promise<any> {
  const client = getRelayerClient();
  const params: any = {};
  if (limit) params.limit = limit;
  
  const response = await client.get(`/api/v1/transactions/${address}`, { params });
  return response.data;
}

export async function getSupportedNetworks(): Promise<any> {
  const client = getRelayerClient();
  const response = await client.get('/api/v1/networks');
  return response.data;
}

export async function getGasPrice(network: string): Promise<any> {
  const client = getRelayerClient();
  const response = await client.get(`/api/v1/gas-price/${network}`);
  return response.data;
}

export async function estimateGas(request: any): Promise<any> {
  const client = getRelayerClient();
  const response = await client.post('/api/v1/estimate-gas', request);
  return response.data;
}

// Policy API functions
export async function getPolicyRules(type?: string): Promise<any> {
  const client = getRelayerClient();
  const params: any = {};
  if (type) params.type = type;
  
  const response = await client.get('/api/v1/policy/rules', { params });
  return response.data;
}

export async function addPolicyRule(rule: any): Promise<any> {
  const client = getRelayerClient();
  const response = await client.post('/api/v1/policy/rules', rule);
  return response.data;
}

export async function updatePolicyRule(id: number, updates: any): Promise<any> {
  const client = getRelayerClient();
  const response = await client.put(`/api/v1/policy/rules/${id}`, updates);
  return response.data;
}

export async function deletePolicyRule(id: number): Promise<any> {
  const client = getRelayerClient();
  const response = await client.delete(`/api/v1/policy/rules/${id}`);
  return response.data;
}

// Utility function to handle API errors gracefully
export function handleApiError(error: any): string {
  if (error.response) {
    return error.response.data?.error || error.response.data?.message || error.message;
  }
  
  if (error.code === 'ECONNREFUSED') {
    return 'Cannot connect to relayer backend. Is it running?';
  }
  
  if (error.code === 'ENOTFOUND') {
    return 'Relayer backend URL not found. Check your configuration.';
  }
  
  return error.message || 'Unknown API error';
}

// Function to check if relayer backend is available
export async function checkRelayerAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    await testConnection();
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      error: handleApiError(error)
    };
  }
}


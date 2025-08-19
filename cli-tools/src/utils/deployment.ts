import fs from 'fs';
import path from 'path';

export interface DeploymentInfo {
  network: string;
  deployer: string;
  contracts: {
    [contractName: string]: string;
  };
  timestamp: string;
}

export function getDeploymentDir(): string {
  // Look for deployments directory in current working directory first
  const cwd = process.cwd();
  const cwdDeployments = path.join(cwd, 'deployments');
  
  if (fs.existsSync(cwdDeployments)) {
    return cwdDeployments;
  }
  
  // Look for deployments directory in contracts folder
  const contractsDeployments = path.join(cwd, 'contracts', 'deployments');
  
  if (fs.existsSync(contractsDeployments)) {
    return contractsDeployments;
  }
  
  // Look for deployments directory relative to CLI tools
  const relativeDeployments = path.join(__dirname, '..', '..', '..', 'contracts', 'deployments');
  
  if (fs.existsSync(relativeDeployments)) {
    return relativeDeployments;
  }
  
  // Create deployments directory in current working directory
  if (!fs.existsSync(cwdDeployments)) {
    fs.mkdirSync(cwdDeployments, { recursive: true });
  }
  
  return cwdDeployments;
}

export function saveDeployment(network: string, deploymentInfo: DeploymentInfo): void {
  const deploymentDir = getDeploymentDir();
  
  // Save with timestamp
  const timestampFilename = `deployment-${network}-${Date.now()}.json`;
  const timestampPath = path.join(deploymentDir, timestampFilename);
  fs.writeFileSync(timestampPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Save as latest for the network
  const latestFilename = `${network}-latest.json`;
  const latestPath = path.join(deploymentDir, latestFilename);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Save as overall latest if it's the most recent
  const overallLatestPath = path.join(deploymentDir, 'latest.json');
  fs.writeFileSync(overallLatestPath, JSON.stringify(deploymentInfo, null, 2));
}

export function loadDeployment(network: string): DeploymentInfo | null {
  const deploymentDir = getDeploymentDir();
  const latestPath = path.join(deploymentDir, `${network}-latest.json`);
  
  if (!fs.existsSync(latestPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(latestPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Could not parse deployment file for ${network}`);
    return null;
  }
}

export function loadLatestDeployment(): DeploymentInfo | null {
  const deploymentDir = getDeploymentDir();
  const latestPath = path.join(deploymentDir, 'latest.json');
  
  if (!fs.existsSync(latestPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(latestPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Warning: Could not parse latest deployment file');
    return null;
  }
}

export function listDeployments(): { network: string; timestamp: string; deployer: string }[] {
  const deploymentDir = getDeploymentDir();
  
  if (!fs.existsSync(deploymentDir)) {
    return [];
  }
  
  const deployments: { network: string; timestamp: string; deployer: string }[] = [];
  
  try {
    const files = fs.readdirSync(deploymentDir);
    
    for (const file of files) {
      if (file.endsWith('-latest.json')) {
        const network = file.replace('-latest.json', '');
        const filePath = path.join(deploymentDir, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const deployment = JSON.parse(content);
          
          deployments.push({
            network,
            timestamp: deployment.timestamp,
            deployer: deployment.deployer
          });
        } catch (error) {
          // Skip invalid files
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return deployments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getContractAddress(network: string, contractName: string): string | null {
  const deployment = loadDeployment(network);
  
  if (!deployment || !deployment.contracts[contractName]) {
    return null;
  }
  
  return deployment.contracts[contractName];
}

export function getAllContractAddresses(network: string): { [contractName: string]: string } | null {
  const deployment = loadDeployment(network);
  
  if (!deployment) {
    return null;
  }
  
  return deployment.contracts;
}

export function deleteDeployment(network: string): boolean {
  const deploymentDir = getDeploymentDir();
  const latestPath = path.join(deploymentDir, `${network}-latest.json`);
  
  if (!fs.existsSync(latestPath)) {
    return false;
  }
  
  try {
    fs.unlinkSync(latestPath);
    
    // Also try to delete timestamped files for this network
    const files = fs.readdirSync(deploymentDir);
    for (const file of files) {
      if (file.startsWith(`deployment-${network}-`) && file.endsWith('.json')) {
        const filePath = path.join(deploymentDir, file);
        fs.unlinkSync(filePath);
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export function exportDeployment(network: string, outputPath: string): boolean {
  const deployment = loadDeployment(network);
  
  if (!deployment) {
    return false;
  }
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

export function importDeployment(inputPath: string): boolean {
  if (!fs.existsSync(inputPath)) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(inputPath, 'utf8');
    const deployment = JSON.parse(content);
    
    // Validate deployment structure
    if (!deployment.network || !deployment.contracts || !deployment.timestamp) {
      return false;
    }
    
    saveDeployment(deployment.network, deployment);
    return true;
  } catch (error) {
    return false;
  }
}

export function generateEnvFile(network: string, outputPath?: string): boolean {
  const deployment = loadDeployment(network);
  
  if (!deployment) {
    return false;
  }
  
  const envPath = outputPath || `.env.${network}`;
  
  try {
    let envContent = `# Contract addresses for ${network}\n`;
    envContent += `# Generated on ${new Date().toISOString()}\n\n`;
    
    for (const [contractName, address] of Object.entries(deployment.contracts)) {
      const envVarName = `${network.toUpperCase()}_${contractName.toUpperCase()}_ADDRESS`;
      envContent += `${envVarName}=${address}\n`;
    }
    
    envContent += `\n# Deployment info\n`;
    envContent += `${network.toUpperCase()}_DEPLOYER_ADDRESS=${deployment.deployer}\n`;
    envContent += `${network.toUpperCase()}_DEPLOYMENT_TIMESTAMP=${deployment.timestamp}\n`;
    
    fs.writeFileSync(envPath, envContent);
    return true;
  } catch (error) {
    return false;
  }
}


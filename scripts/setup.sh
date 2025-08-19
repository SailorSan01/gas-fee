#!/bin/bash

# Gas-Fee Sponsor Relayer Bot Setup Script
# This script sets up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo $node_version | cut -d'.' -f1)
        
        if [ "$major_version" -ge 16 ]; then
            print_success "Node.js version $node_version is compatible"
            return 0
        else
            print_error "Node.js version $node_version is too old. Please install Node.js 16 or later."
            return 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 16 or later."
        return 1
    fi
}

# Function to install dependencies for a directory
install_dependencies() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        print_step "Installing $name dependencies"
        cd "$dir"
        
        if [ -f "package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
        
        print_success "$name dependencies installed"
        cd ..
    else
        print_warning "$name directory or package.json not found, skipping"
    fi
}

# Function to create environment files
create_env_files() {
    print_step "Creating Environment Files"
    
    # Copy environment examples if they don't exist
    if [ -f "relayer-backend/.env.example" ] && [ ! -f "relayer-backend/.env" ]; then
        cp relayer-backend/.env.example relayer-backend/.env
        print_success "Created relayer-backend/.env from example"
    fi
    
    if [ -f "cli-tools/.env.example" ] && [ ! -f "cli-tools/.env" ]; then
        cp cli-tools/.env.example cli-tools/.env
        print_success "Created cli-tools/.env from example"
    fi
    
    if [ -f "contracts/.env.example" ] && [ ! -f "contracts/.env" ]; then
        cp contracts/.env.example contracts/.env
        print_success "Created contracts/.env from example"
    fi
    
    # Create root .env if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Gas-Fee Sponsor Relayer Bot Environment Configuration
# Copy this file and customize for your environment

# Development/Production mode
NODE_ENV=development

# Relayer Backend Configuration
RELAYER_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=relayer_db
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain Networks
LOCALHOST_RPC_URL=http://localhost:8545
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/

# Private Keys (CHANGE THESE IN PRODUCTION!)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
EOF
        print_success "Created root .env file"
    fi
}

# Function to create necessary directories
create_directories() {
    print_step "Creating Directories"
    
    local dirs=(
        "deployments"
        "logs"
        "data"
        "monitoring/grafana/dashboards"
        "monitoring/grafana/datasources"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
}

# Function to create monitoring configuration
create_monitoring_config() {
    print_step "Creating Monitoring Configuration"
    
    # Create Prometheus configuration
    if [ ! -f "monitoring/prometheus.yml" ]; then
        cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'relayer-backend'
    static_configs:
      - targets: ['relayer:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF
        print_success "Created Prometheus configuration"
    fi
    
    # Create Grafana datasource configuration
    if [ ! -f "monitoring/grafana/datasources/prometheus.yml" ]; then
        cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
        print_success "Created Grafana datasource configuration"
    fi
}

# Function to build projects
build_projects() {
    print_step "Building Projects"
    
    # Build contracts
    if [ -d "contracts" ] && [ -f "contracts/package.json" ]; then
        cd contracts
        if command_exists npx; then
            npx hardhat compile
            print_success "Contracts compiled"
        else
            print_warning "npx not available, skipping contract compilation"
        fi
        cd ..
    fi
    
    # Build relayer backend
    if [ -d "relayer-backend" ] && [ -f "relayer-backend/package.json" ]; then
        cd relayer-backend
        if npm run build > /dev/null 2>&1; then
            print_success "Relayer backend built"
        else
            print_warning "Relayer backend build failed or no build script"
        fi
        cd ..
    fi
    
    # Build CLI tools
    if [ -d "cli-tools" ] && [ -f "cli-tools/package.json" ]; then
        cd cli-tools
        if npm run build > /dev/null 2>&1; then
            print_success "CLI tools built"
        else
            print_warning "CLI tools build failed or no build script"
        fi
        cd ..
    fi
}

# Function to run tests
run_tests() {
    print_step "Running Tests"
    
    # Test contracts
    if [ -d "contracts" ] && [ -f "contracts/package.json" ]; then
        cd contracts
        if npm test > /dev/null 2>&1; then
            print_success "Contract tests passed"
        else
            print_warning "Contract tests failed or no test script"
        fi
        cd ..
    fi
    
    # Test relayer backend
    if [ -d "relayer-backend" ] && [ -f "relayer-backend/package.json" ]; then
        cd relayer-backend
        if npm test > /dev/null 2>&1; then
            print_success "Relayer backend tests passed"
        else
            print_warning "Relayer backend tests failed or no test script"
        fi
        cd ..
    fi
    
    # Test CLI tools
    if [ -d "cli-tools" ] && [ -f "cli-tools/package.json" ]; then
        cd cli-tools
        if npm test > /dev/null 2>&1; then
            print_success "CLI tools tests passed"
        else
            print_warning "CLI tools tests failed or no test script"
        fi
        cd ..
    fi
}

# Main setup function
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              Gas-Fee Sponsor Relayer Bot Setup               ║"
    echo "║                  Development Environment                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Check prerequisites
    print_step "Checking Prerequisites"
    
    if ! check_node_version; then
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js with npm."
        exit 1
    fi
    print_success "npm is available"
    
    if ! command_exists git; then
        print_warning "git is not installed. Some features may not work."
    else
        print_success "git is available"
    fi
    
    # Create necessary directories
    create_directories
    
    # Create environment files
    create_env_files
    
    # Install dependencies
    install_dependencies "contracts" "Smart Contracts"
    install_dependencies "relayer-backend" "Relayer Backend"
    install_dependencies "cli-tools" "CLI Tools"
    
    # Create monitoring configuration
    create_monitoring_config
    
    # Build projects
    if [ "$1" != "--skip-build" ]; then
        build_projects
    else
        print_warning "Skipping build step"
    fi
    
    # Run tests
    if [ "$1" = "--with-tests" ]; then
        run_tests
    fi
    
    # Final instructions
    print_step "Setup Complete!"
    echo ""
    echo "🎉 Gas-Fee Sponsor Relayer Bot development environment is ready!"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Review and update environment variables in .env files"
    echo "   2. Start services: ./scripts/demo.sh"
    echo "   3. Or start individual components:"
    echo "      - Database: docker-compose up -d postgres redis"
    echo "      - Blockchain: cd contracts && npx hardhat node"
    echo "      - Backend: cd relayer-backend && npm start"
    echo "      - CLI: cd cli-tools && node dist/index.js --help"
    echo ""
    echo "🔧 Development Commands:"
    echo "   - Run demo: ./scripts/demo.sh"
    echo "   - Deploy contracts: cd contracts && npx hardhat run scripts/deploy.js --network localhost"
    echo "   - Start monitoring: docker-compose --profile monitoring up -d"
    echo ""
    echo "📚 Documentation:"
    echo "   - README.md for overview"
    echo "   - docs/ directory for detailed guides"
    echo "   - Each component has its own README"
    
    if [ -f ".env" ]; then
        echo ""
        print_warning "Remember to update the private keys and RPC URLs in .env files before production use!"
    fi
}

# Handle script interruption
cleanup() {
    echo ""
    print_warning "Setup interrupted."
    exit 1
}

trap cleanup INT

# Run the setup
main "$@"


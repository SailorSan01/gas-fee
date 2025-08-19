#!/bin/bash

# Gas-Fee Sponsor Relayer Bot Demo Script
# This script demonstrates a complete local workflow

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

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    print_step "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose > /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    print_success "Docker Compose is available: $DOCKER_COMPOSE_CMD"
}

# Main demo function
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              Gas-Fee Sponsor Relayer Bot Demo                ║"
    echo "║                     Local Workflow                           ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Check prerequisites
    print_step "Checking Prerequisites"
    check_docker
    check_docker_compose
    
    # Start services
    print_step "Starting Services with Docker Compose"
    $DOCKER_COMPOSE_CMD up -d
    
    # Wait for services to be ready
    wait_for_service "Hardhat Network" "http://localhost:8545"
    wait_for_service "PostgreSQL" "http://localhost:5432" || true  # PostgreSQL doesn't respond to HTTP
    wait_for_service "Redis" "http://localhost:6379" || true       # Redis doesn't respond to HTTP
    wait_for_service "Relayer Backend" "http://localhost:3000/health"
    
    # Deploy contracts
    print_step "Deploying Smart Contracts"
    if [ -d "contracts" ]; then
        cd contracts
        if [ -f "package.json" ]; then
            npm install > /dev/null 2>&1 || print_warning "Failed to install contract dependencies"
            npx hardhat run scripts/deploy.js --network localhost || print_error "Contract deployment failed"
            cd ..
        else
            print_warning "No package.json found in contracts directory"
            cd ..
        fi
    else
        print_warning "Contracts directory not found, skipping deployment"
    fi
    
    # Install CLI tools
    print_step "Setting up CLI Tools"
    if [ -d "cli-tools" ]; then
        cd cli-tools
        if [ -f "package.json" ]; then
            npm install > /dev/null 2>&1 || print_warning "Failed to install CLI dependencies"
            npm run build > /dev/null 2>&1 || print_warning "Failed to build CLI tools"
            cd ..
        else
            print_warning "No package.json found in cli-tools directory"
            cd ..
        fi
    else
        print_warning "CLI tools directory not found"
    fi
    
    # Test relayer health
    print_step "Testing Relayer Health"
    if curl -s -f "http://localhost:3000/health" > /dev/null; then
        print_success "Relayer backend is healthy"
        
        # Show health status
        echo "Health Status:"
        curl -s "http://localhost:3000/health" | python3 -m json.tool 2>/dev/null || echo "Health check response received"
    else
        print_error "Relayer backend health check failed"
    fi
    
    # Test API endpoints
    print_step "Testing API Endpoints"
    
    # Test networks endpoint
    if curl -s -f "http://localhost:3000/api/v1/networks" > /dev/null; then
        print_success "Networks endpoint is working"
    else
        print_warning "Networks endpoint test failed"
    fi
    
    # Test metrics endpoint
    if curl -s -f "http://localhost:3000/metrics" > /dev/null; then
        print_success "Metrics endpoint is working"
    else
        print_warning "Metrics endpoint test failed"
    fi
    
    # Show running services
    print_step "Service Status"
    echo "Running Docker containers:"
    docker ps --filter "name=relayer-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show access URLs
    print_step "Access Information"
    echo "🌐 Service URLs:"
    echo "   Relayer Backend:    http://localhost:3000"
    echo "   Health Check:       http://localhost:3000/health"
    echo "   Metrics:           http://localhost:3000/metrics"
    echo "   Hardhat Network:   http://localhost:8545"
    echo "   PostgreSQL:        localhost:5432"
    echo "   Redis:             localhost:6379"
    echo ""
    echo "📊 Optional Monitoring (use --profile monitoring):"
    echo "   Prometheus:        http://localhost:9090"
    echo "   Grafana:          http://localhost:3001 (admin/admin)"
    
    # Demo transaction simulation
    print_step "Demo Transaction Simulation"
    
    # Create a simple test transaction payload
    cat > /tmp/demo_transaction.json << EOF
{
  "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "value": "1000000000000000000",
  "gas": "21000",
  "nonce": "0",
  "data": "0x",
  "signature": "0x${'0' * 130}",
  "network": "localhost"
}
EOF
    
    echo "Simulating meta-transaction submission..."
    if curl -s -X POST \
        -H "Content-Type: application/json" \
        -d @/tmp/demo_transaction.json \
        "http://localhost:3000/api/v1/relay" > /tmp/demo_response.json 2>/dev/null; then
        
        if grep -q '"success":true' /tmp/demo_response.json; then
            print_success "Demo transaction simulation successful"
            echo "Response:"
            cat /tmp/demo_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/demo_response.json
        else
            print_warning "Demo transaction simulation returned an error (expected for invalid signature)"
            echo "Response:"
            cat /tmp/demo_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/demo_response.json
        fi
    else
        print_warning "Demo transaction simulation failed"
    fi
    
    # Cleanup temp files
    rm -f /tmp/demo_transaction.json /tmp/demo_response.json
    
    # Final instructions
    print_step "Demo Complete!"
    echo ""
    echo "🎉 The Gas-Fee Sponsor Relayer Bot is now running locally!"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Deploy contracts: cd contracts && npx hardhat run scripts/deploy.js --network localhost"
    echo "   2. Configure CLI: cd cli-tools && npm run build && node dist/index.js config init"
    echo "   3. Test sponsoring: node dist/index.js sponsor withdraw --interactive"
    echo "   4. Monitor system: node dist/index.js watch transactions"
    echo "   5. Check status: node dist/index.js status system"
    echo ""
    echo "🛑 To stop all services:"
    echo "   $DOCKER_COMPOSE_CMD down"
    echo ""
    echo "🔧 To view logs:"
    echo "   $DOCKER_COMPOSE_CMD logs -f relayer"
    echo ""
    echo "📚 For more information, check the README.md and docs/ directory"
}

# Handle script interruption
cleanup() {
    echo ""
    print_warning "Demo interrupted. Services are still running."
    echo "Use '$DOCKER_COMPOSE_CMD down' to stop all services."
    exit 1
}

trap cleanup INT

# Run the demo
main "$@"


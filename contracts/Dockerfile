FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Compile contracts
RUN npx hardhat compile

# Expose port
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8545 || exit 1

# Default command
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]


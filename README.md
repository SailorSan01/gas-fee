# Gas-Fee Sponsor Relayer Bot

This project provides a comprehensive solution for sponsoring gas fees on Ethereum, BSC, and Polygon for ERC-20, ERC-721, and ERC-1155 token withdrawals. It includes smart contracts, a relayer backend, CLI tools, and Docker Compose configurations for local development.

## Quickstart (Local Development)

To get started with local development, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SailorSan1/gas-fee-sponsor-relayer-bot.git
    cd gas-fee-sponsor-relayer-bot
    ```

2.  **Install Dependencies:**
    ```bash
    # Install Node.js dependencies for relayer and CLI
    npm install --prefix relayer-backend
    npm install --prefix cli-tools

    # Install Hardhat dependencies for contracts
    cd contracts
    npm install
    cd ..
    ```

3.  **Start Local Development Environment:**
    ```bash
    docker-compose up --build
    ```
    This will start the following services:
    -   `hardhat`: A local Hardhat network for contract deployment and testing.
    -   `postgres`: PostgreSQL database for the relayer backend.
    -   `redis`: Redis for nonce management in the relayer backend.
    -   `relayer`: The gas-fee sponsor relayer backend.

4.  **Run the Demo Script:**
    Once all services are up and running, you can execute the demo script to see a full local workflow:
    ```bash
    ./scripts/demo.sh
    ```
    This script will:
    -   Deploy contracts locally.
    -   Mint sample tokens/NFTs.
    -   Create a signed meta-transaction.
    -   The relayer will sponsor the withdrawal.
    -   Confirm balances are updated.

## Project Structure

-   `contracts/`: Smart contracts (Solidity) for the cross-chain bridge, built with Hardhat.
-   `relayer-backend/`: Node.js/TypeScript relayer backend service.
-   `cli-tools/`: Node.js CLI tools for interacting with the relayer and contracts.
-   `docs/`: Documentation and runbooks.
-   `scripts/`: Utility scripts, including the local demo script.
-   `docker-compose.yml`: Docker Compose configuration for local development.
-   `TODO.md`: Instructions for manual setup and configuration for production environments.

## Manual Setup (TODO.md)

For anything that cannot be fully automated or requires external service configuration (e.g., AWS KMS, Flashbots mainnet integration), please refer to the `TODO.md` file for detailed step-by-step instructions.

## Security Notes

[Placeholder for security notes, threat model, and audit checklist. Refer to `docs/security_notes.md` for details.]

## Admin Guide

[Placeholder for admin guide. Refer to `docs/admin_guide.md` for details.]

## User Guide

[Placeholder for user guide. Refer to `docs/user_guide.md` for details.]



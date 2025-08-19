require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Configuration for local Hardhat network
      // You can fork a mainnet here for testing against real contracts
      // forking: {
      //   url: "YOUR_MAINNET_RPC_URL",
      //   blockNumber: 12345678 // Optional: fork from a specific block
      // }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Add configurations for Ethereum, BSC, Polygon testnets/mainnets here
    // goerli: {
    //   url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   accounts: [process.env.PRIVATE_KEY]
    // },
    // bscTestnet: {
    //   url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //   chainId: 97,
    //   accounts: [process.env.PRIVATE_KEY]
    // },
    // polygonMumbai: {
    //   url: "https://rpc-mumbai.maticvigil.com",
    //   chainId: 80001,
    //   accounts: [process.env.PRIVATE_KEY]
    // }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};



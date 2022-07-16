const path = require('path');
const fs = require("fs");
const env_path = path.join(__dirname, '.', '.env');
require('dotenv').config({
  path: fs.existsSync(env_path) ? env_path : path.join(__dirname, '.', '.local.env')
});

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("hardhat-deploy");
require("hardhat-deploy-ethers");

const privateKeys = [
  process.env.ADMIN_KEY,
  process.env.SIGNER_KEY,
  /* accounts below for test */
  ...(process.env.ACCOUNTS === undefined ? []:process.env.ACCOUNTS.split(","))
].filter(a => !!a);

// default path (i.e.  `m/44'/60'/0'/0/0`
const mnemonic = process.env.MNEMONIC;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  mocha: {
    timeout: false
  },
  solidity: {
    compilers: [{
      version: "0.8.7",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }]
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    admin: 0
  },
  networks: {
    hardhat: {
      saveDeployments: true,
      accounts: mnemonic !== undefined ?
        { mnemonic: mnemonic }
        : privateKeys.map((privateKey) => {
          return {privateKey: privateKey, balance: "1000000000000000000000000"}
        }),
      allowUnlimitedContractSize: true
    },
    binancetestnet: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545",
      accounts: privateKeys,
      chainId: 97,
      gasPrice: 10000000000,
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true,
      timeout: 120000
    },
    binance: {
      url: "https://bsc-dataseed.binance.org",
      accounts: privateKeys,
      chainId: 56,
      // gasPrice: 8000000000,
      gasPrice: "auto",
      blockGasLimit: 79196578,
      allowUnlimitedContractSize: true,
      timeout: 120000
    },
    kovan: {
      url: "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: privateKeys,
      chainId: 42,
      gasPrice: "auto",
      blockGasLimit: 12500000,
      allowUnlimitedContractSize: true,
      timeout: 120000
    }
  },
  paths: {
    sources: "contracts",
    tests: "tests",
    cache: "cache",
    artifacts: "artifacts",
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports'
  }
}

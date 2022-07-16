const { toBN } = require("../scripts/utils");

module.exports = async (hre) => {
  const accounts = await hre.getNamedAccounts();
  const deployer = accounts.admin;

  const {address} = await hre.deployments.deploy("LUSAIL", {
    from: deployer,
    log: true,
  });
};

module.exports.tags = ['LUSAIL'];

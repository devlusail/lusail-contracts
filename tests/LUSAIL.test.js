const { expect } = require("chai");
const hre = require("hardhat");
const { toBN } = require("../scripts/utils");

describe("LUSAIL", function () {
  async function deploy(hre) {
    const signers = await hre.ethers.getSigners();
    const admin = signers[0];
    const taxers = signers.slice(1,4);
    const users = signers.slice(4,);

    // setup
    const WBNB = await hre.ethers.getContractFactory("WETH");
    const wbnb = await WBNB.deploy();
    await wbnb.deployed();

    const Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    const factory = await Factory.deploy();
    await factory.deployed();
    const Router = await hre.ethers.getContractFactory("UniswapV2Router02");
    const router = await Router.deploy(factory.address, wbnb.address);

    // deploy
    const LUSAIL = await hre.ethers.getContractFactory("LUSAIL");
    const lusail = await LUSAIL.deploy();
    await lusail.deployed();

    await (await factory.createPair(wbnb.address, lusail.address)).wait();
    const pairAddress = await factory.getPair(wbnb.address, lusail.address);
    expect(pairAddress).to.not.equal(hre.ethers.constants.AddressZero);
    await(await lusail.setPair(pairAddress)).wait();

    await(await lusail.setTaxReceivers(taxers[0].address, taxers[1].address, taxers[2].address)).wait();

    return {signers, admin, users, taxers, wbnb, factory, router, lusail};
  }

  it("setTax", async function() {
    const {lusail} = await deploy(hre);
    await (await lusail.setTax(10, 10)).wait();
    await expect(lusail.setTax(11, 11)).to.be.revertedWith("tax got limited");
  });

  it("check tax", async function () {
    const {admin, taxers, users: otherSigners, wbnb, router, lusail} = await deploy(hre);

    const lps = otherSigners.slice(0,4);
    const users = otherSigners.slice(4,);

    const totalSupply = await lusail.totalSupply();
    const decimals = await lusail.decimals();
    expect(await lusail.balanceOf(admin.address)).to.equal(totalSupply);

    let initAmount = totalSupply.div(lps.length).div(10);
    for (let i=0; i<lps.length; i++) {
      await (await lusail.setExcludeTax(lps[i].address, true)).wait();

      await (await lusail.transfer(lps[i].address, initAmount)).wait();
      expect(await lusail.balanceOf(lps[i].address)).to.equal(initAmount);
      await (await lusail.connect(lps[i]).approve(
        router.address, hre.ethers.constants.MaxUint256
      )).wait();

      const lusailInput = toBN(500000).mul(toBN(10).pow(decimals));
      const bnbInput = toBN(1).mul(toBN(10).pow(18));
      expect(await lusail.balanceOf(lps[i].address)).to.gt(lusailInput);
      expect(await hre.ethers.provider.getBalance(lps[i].address)).to.gt(bnbInput);
      await (await router.connect(lps[i]).addLiquidityETH(
        lusail.address,
        lusailInput,
        0, 0,
        lps[i].address,
        Math.floor(new Date().getTime()/1000)+3600,
        {value: bnbInput}
      )).wait();
    }

    // swap - buy
    for (let i=0; i<users.length; i++) {
      await (await lusail.connect(users[i]).approve(router.address, hre.ethers.constants.MaxUint256)).wait();
    }
    let swapAmount;
    const threshold = totalSupply.div(5000);
    const oldBalances = [];
    oldBalances.push(await lusail.balanceOf(taxers[0].address));
    oldBalances.push(await lusail.balanceOf(taxers[1].address));
    oldBalances.push(await lusail.balanceOf(taxers[2].address));
    for (let k=0; k<40; k++) {
      let oldLusailAmount = await lusail.balanceOf(lusail.address);
      for (let i=0; i<users.length; i++) {
        console.log("k", k, "i", i);
        // await hre.ethers.provider.send("evm_mine");
        let bnbAmount = toBN(25).mul(toBN(10).pow(17));
        const oldLusailBalance = await lusail.balanceOf(users[i].address);
        await (await router.connect(users[i]).swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          [wbnb.address, lusail.address],
          users[i].address,
          Math.floor(new Date().getTime()/1000)+3600,
          {value: bnbAmount}
        )).wait();
        const newLusailBalance = await lusail.balanceOf(users[i].address);
        swapAmount = newLusailBalance.sub(oldLusailBalance);

        let check = false;

        if (oldLusailAmount.gt(await lusail.balanceOf(lusail.address))) {
          console.log("break");
          // break;
          check = true;
        }

        // await hre.ethers.provider.send("evm_mine");
        await (await router.connect(users[i]).swapExactTokensForETHSupportingFeeOnTransferTokens(
          swapAmount, 0,
          [lusail.address, wbnb.address],
          users[i].address,
          Math.floor(new Date().getTime()/1000)+3600,
        )).wait();
        if (check) {

          const diff = [];
          // console.log(
          //   oldBalances[0].toString(),
          //   (await hre.ethers.provider.getBalance(team.address)).toString()
          // );
          diff.push((await lusail.balanceOf(taxers[0].address)).sub(oldBalances[0]));
          diff.push((await lusail.balanceOf(taxers[1].address)).sub(oldBalances[1]));
          diff.push((await lusail.balanceOf(taxers[2].address)).sub(oldBalances[2]));
          console.log(
            "diff", diff.map(d=>d.toString())
          );
          return;
        }
      }
    }
  });
});
var bridge = artifacts.require('./MuonBridge.sol')
var muon = artifacts.require('./MuonV01.sol')

module.exports = function (deployer) {
	deployer.then(async () => {
		let deployedMuon = await deployer.deploy(muon);
		let deployedBridge = await deployer.deploy(bridge, deployedMuon.address)
	})
}

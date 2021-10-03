var schnorrLib = artifacts.require('./SchnorrSECP256K1.sol')
var bridge = artifacts.require('./MuonBridge.sol')
var muon = artifacts.require('./MuonV01.sol')

const pubKeyAddress = process.env.MUON_MASTER_WALLET_PUB_ADDRESS;
const pubKeyX = process.env.MUON_MASTER_WALLET_PUB_X;
const pubKeyYParity = process.env.MUON_MASTER_WALLET_PUB_Y_PARITY;

function parseArgv(){
	let args = process.argv.slice(2);
	let params = args.filter(arg => arg.startsWith('--'))
	let result = {}
	params.map(p => {
		let [key, value] = p.split('=');
		result[key.slice(2)] = value === undefined ? true : value
	})
	return result;
}

module.exports = function (deployer) {
	deployer.then(async () => {
		let params = parseArgv()

		let muonAddress = null;

		if(!!params['muonAddress']){
			muonAddress = params['muonAddress'];
		}
		else{
			let schnorrLibAddress = null;
			if(!!params['libAddress']){
				schnorrLibAddress = params['libAddress'];
			}
			else{
				let deployedSchnorrLib = await await deployer.deploy(schnorrLib);
				schnorrLibAddress = deployedSchnorrLib.address;
			}
			let deployedMuon = await await deployer.deploy(muon, schnorrLibAddress, pubKeyAddress, pubKeyX, pubKeyYParity);
			muonAddress = deployedMuon.address;
		}
		let deployedBridge = await deployer.deploy(bridge, muonAddress)
	})
}

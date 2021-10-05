const timeController = require('./time-controller')
const muonNode = require('./muon-node');
const wait = require('./wait')
const expect = require('./expect');
const utils = require('./utils')

function getProcessArg(name){
	let idx = process.argv.findIndex(arg => arg===name)
	return idx >= 0 ? process.argv[idx + 1] : null;
}

module.exports = {
	getProcessArg,
	timeController,
	wait,
	expect,
	muonNode,
	... utils,
}
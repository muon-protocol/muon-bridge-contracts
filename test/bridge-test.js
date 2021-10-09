var SchnorrLib = artifacts.require('SchnorrSECP256K1')
const MuonV02 = artifacts.require('MuonV02');
const MuonBridge = artifacts.require('MuonBridge');
const ERT = artifacts.require('ERT');
const BridgeToken = artifacts.require('BridgeToken');
const truffleAssert = require('truffle-assertions');
const {expect, muonNode, getProcessArg} = require('./helpers')

const pubKeyAddress = process.env.MUON_MASTER_WALLET_PUB_ADDRESS;
const pubKeyX = process.env.MUON_MASTER_WALLET_PUB_X;
const pubKeyYParity = process.env.MUON_MASTER_WALLET_PUB_Y_PARITY;




contract("MuonBridge", (accounts) => {
    let owner=accounts[9], muon, bridge1, bridge2, token, bridgeToken;
    let network = getProcessArg('--network') || 'ganache'
    network = network === 'development' ? 'ganache' : network;
    console.log(`=============== Running test on the [${network}] network ==============`)

    before(async () => {
        // let lib = await SchnorrLib.new({from: owner})
        // console.log(`schnorr-lib deployed successfully at ${lib.address}`)
        // muon = await MuonV02.new(lib.address, pubKeyAddress, pubKeyX, pubKeyYParity, {from: owner});
        // console.log(`MuonV02 deployed successfully at ${muon.address}`)

        lib = await SchnorrLib.at('0x0F097a96372147Bf1D788f4E11331E5006F90d0a');
        muon = await SchnorrLib.at('0xFf195FC389897BD3694848B554AdF643F5dD5149');

        token = await ERT.new({from: owner});
        console.log(`ERT deployed successfully at ${token.address}`)
        await token.mint(accounts[0], web3.utils.toWei('25000'))
        console.log(`mint done successfully`)

        bridge1 = await MuonBridge.new(muon.address, {from: owner});
        console.log(`bridge-1 deployed successfully at ${bridge1.address}`)
        bridge2 = await MuonBridge.new(muon.address, {from: owner});
        console.log(`bridge-2 deployed successfully at ${bridge2.address}`)

        await bridge1.ownerSetNetworkID(1, {from: owner});
        console.log(`bridge-1 ownership transfered successfully`)
        await bridge2.ownerSetNetworkID(2, {from: owner});
        console.log(`bridge-2 ownership transfered successfully`)

        await bridge1.ownerSetSideContract(2, bridge2.address, {from: owner})
        console.log(`bridge-1 side-contract set successfully`)
        await bridge2.ownerSetSideContract(1, bridge1.address, {from: owner})
        console.log(`bridge-2 side-contract set successfully`)

        // muon = await MuonV02.at('0x7459E5d04a097Ed99869CBa4091C1024af493567')
        // token = await ERT.at('0x8FF4849CCc5000C07Cb65F139a9A56282c46Eb49')
        // bridge1 = await MuonBridge.at('0x50752Dd1a9fcb00d31bCaFbbFC06F76A81fb031B')
        // bridge2 = await MuonBridge.at('0xb30f62Ff1e7bEf210AD149fFCF6df5807EC31269')

    });

    describe("Test add token", async () => {
        it("should not be able to add non ERC20 address as main token.", async () => {
            expect.revert(bridge1.addMainToken(accounts[0]))
        });

        it("should be able to add ERC20 address as main token.", async () => {
            await bridge1.addMainToken(token.address);
        });

        it("should not be able to add bridge token without correct data", async () => {
            // let muonResponse = await muonNode.ethAddBridgeToken(
            //     "0xb9B5FFC3e1404E3Bb7352e656316D6C5ce6940A1",
            //     "rinkeby",
            //     "bsctest"
            // )
            let muonResponse = await muonNode.request({
                app: "bridge",
                method: "addBridgeToken",
                params: {
                    mainTokenAddress: "0xb9B5FFC3e1404E3Bb7352e656316D6C5ce6940A1",
                    mainNetwork: "rinkeby",
                    targetNetwork: "bsctest"
                }
            })
            // console.dir(muonResponse, {depth: null})
            let {success, result: {data: {init: {nonceAddress: nonce}, result: {token, tokenId}}, signatures, cid}} = muonResponse;
            assert(muonResponse.success === true, 'Muon response failed')
            let sigs = signatures.map(({signature, owner}) => ({signature, owner, nonce}))
            expect.error(
                bridge2.addBridgeToken(
                    '125',
                    token.name,
                    token.symbol,
                    token.decimals,
                    `0x${cid.substr(1)}`,
                    sigs, {from: owner}
                ),
                '!verified'
            )
            expect.error(
                bridge2.addBridgeToken(
                    tokenId,
                    "incorrect name",
                    token.symbol,
                    token.decimals,
                    `0x${cid.substr(1)}`,
                    sigs, {from: owner}
                ),
                '!verified'
            )
            expect.error(
                bridge2.addBridgeToken(
                    tokenId,
                    token.name,
                    'INCORRECT_SYM',
                    token.decimals,
                    `0x${cid.substr(1)}`,
                    sigs, {from: owner}
                ),
                '!verified'
            )
            expect.error(
                bridge2.addBridgeToken(
                    tokenId,
                    token.name,
                    token.symbol,
                    '8',
                    `0x${cid.substr(1)}`,
                    sigs, {from: owner}
                ),
                '!verified'
            )
        })

        it("should be able to add bridge token", async () => {
            let muonResponse = await muonNode.request({
                app: "bridge",
                method: "addBridgeToken",
                params: {
                    mainTokenAddress: token.address,
                    mainNetwork: network,
                    targetNetwork: network
                }
            })
            // console.dir(muonResponse, {depth: null})
            // let {success, result: {data: {result: {token as t, tokenId as tid}}, signatures}} = muonResponse;
            assert(muonResponse.success === true, 'Muon response failed')
            let nonce = muonResponse.result.data.init.nonceAddress
            let sigs = muonResponse.result.signatures.map(({signature, owner}) => ({signature, owner, nonce}))
            console.log('calling bridge2.addBridgeToken ...', {
                tokenId: muonResponse.result.data.result.tokenId,
                name: muonResponse.result.data.result.token.name,
                symbol: muonResponse.result.data.result.token.symbol,
                decimals: muonResponse.result.data.result.token.decimals,
                cid: `0x${muonResponse.result.cid.substr(1)}`,
                sigs
            })
            await bridge2.addBridgeToken(
                muonResponse.result.data.result.tokenId,
                muonResponse.result.data.result.token.name,
                muonResponse.result.data.result.token.symbol,
                muonResponse.result.data.result.token.decimals,
                `0x${muonResponse.result.cid.substr(1)}`,
                sigs
            )
            let bridgeTokenAddress = await bridge2.tokens.call(muonResponse.result.data.result.tokenId);
            bridgeToken = await BridgeToken.at(bridgeTokenAddress);
        })
    })

    describe("Test deposit and claim", async () => {
        it("should be able to deposit and claim", async () => {
            let amount = web3.utils.toWei('100'),
                toChain = 2,
                tokenId = token.address;
            await token.approve(bridge1.address, amount);
            let result = await bridge1.deposit(amount, toChain, tokenId)
            expect.eventEmitted(result, 'Deposit', (ev) => {
                return (
                    ev.user == accounts[0]
                    && ev.amount.toString() == amount.toString()
                    && ev.toChain.eq(web3.utils.toBN(2))
                );
            })
            let depositEvent = result.logs.find(ev => (ev.event === 'Deposit'))
            let depositTxId = depositEvent.args.txId.toString();

            // let muonResult = await muonNode.ethCallContract(
            //     bridge1.address, 
            //     'getTx', 
            //     [depositTxId], 
            //     bridge1.abi,
            //     null,
            //     network
            // );
            let muonResult = await muonNode.request({
                app: 'bridge',
                method: 'claim',
                params: {
                    depositAddress: bridge1.address, 
                    depositTxId, 
                    depositNetwork: network
                }
            });
            assert(muonResult.success, 'muon node failed')
            let nonce = muonResult.result.data.init.nonceAddress;
            let sigs = muonResult.result.signatures.map(({owner, signature}) => ({owner, signature, nonce}))
            console.log({
                user: accounts[0],
                amount: amount.toString(),
                fromChain: '1',
                toChain: '2',
                tokenId,
                depositTxId,
                sigs
            })

            let result2 = await bridge2.claim(
              accounts[0],
              amount,
              '1',
              '2',
              tokenId,
              depositTxId,
              `0x${muonResult.result.cid.substr(1)}`,
              sigs
            );
            expect.eventEmitted(result2, 'Claim', (ev) => {
                return (
                    ev.user == accounts[0]
                    && ev.amount.toString() == amount.toString()
                    && ev.fromChain.eq(web3.utils.toBN(1))
                    && ev.txId.toString() === depositTxId.toString()
                );
            })
        })
    })
});

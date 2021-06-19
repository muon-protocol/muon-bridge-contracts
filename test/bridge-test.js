const MuonV01 = artifacts.require('MuonV01');
const MuonBridge = artifacts.require('MuonBridge');
const ERT = artifacts.require('ERT');
const BridgeToken = artifacts.require('BridgeToken');
const truffleAssert = require('truffle-assertions');
const {expect, muonNode} = require('./helpers')

MUON_NODE_1 = '0x06A85356DCb5b307096726FB86A78c59D38e08ee'
MUON_NODE_2 = '0x4513218Ce2e31004348Fd374856152e1a026283C'
MUON_NODE_3 = '0xe4f507b6D5492491f4B57f0f235B158C4C862fea'


contract("MuonBridge", (accounts) => {
    let owner=accounts[9], muon, bridge1, bridge2, token, bridgeToken;

    before(async () => {
        muon = await MuonV01.new({from: owner});

        await muon.ownerAddSigner(MUON_NODE_1, {from: owner})
        await muon.ownerAddSigner(MUON_NODE_2, {from: owner})
        await muon.ownerAddSigner(MUON_NODE_3, {from: owner})

        token = await ERT.new({from: owner});
        await token.mint(accounts[0], web3.utils.toWei('25000'))

        bridge1 = await MuonBridge.new(muon.address, {from: owner});
        bridge2 = await MuonBridge.new(muon.address, {from: owner});

        await bridge1.ownerSetNetworkID(1, {from: owner});
        await bridge2.ownerSetNetworkID(2, {from: owner});

        await bridge1.ownerSetSideContract(2, bridge2.address, {from: owner})
        await bridge2.ownerSetSideContract(1, bridge1.address, {from: owner})
    });

    describe("Test add token", async () => {
        it("should not be able to add non ERC20 address as main token.", async () => {
            expect.revert(bridge1.addMainToken(accounts[0]))
        });

        it("should be able to add ERC20 address as main token.", async () => {
            await bridge1.addMainToken(token.address);
        });

        it("should not be able to add bridge token without correct data", async () => {
            let muonResponse = await muonNode.ethAddBridgeToken(
                "0xb9B5FFC3e1404E3Bb7352e656316D6C5ce6940A1",
                "rinkeby",
                "bsctest"
            )
            // console.dir(muonResponse, {depth: null})
            let {success, result: {data: {result: {token, tokenId}}, signatures, cid}} = muonResponse;
            assert(muonResponse.success === true, 'Muon response failed')
            expect.error(
                bridge2.addBridgeToken(
                    '125',
                    token.name,
                    token.symbol,
                    token.decimals,
                    `0x${cid.substr(1)}`,
                    signatures.map(s => s.signature)
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
                    signatures.map(s => s.signature)
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
                    signatures.map(s => s.signature)
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
                    signatures.map(s => s.signature)
                ),
                '!verified'
            )
        })

        it("should be able to add bridge token", async () => {
            let muonResponse = await muonNode.ethAddBridgeToken(
                token.address,
                "ganache",
                "ganache"
            )
            // console.dir(muonResponse, {depth: null})
            // let {success, result: {data: {result: {token as t, tokenId as tid}}, signatures}} = muonResponse;
            assert(muonResponse.success === true, 'Muon response failed')
            await bridge2.addBridgeToken(
                muonResponse.result.data.result.tokenId,
                muonResponse.result.data.result.token.name,
                muonResponse.result.data.result.token.symbol,
                muonResponse.result.data.result.token.decimals,
                `0x${muonResponse.result.cid.substr(1)}`,
                muonResponse.result.signatures.map(s => s.signature)
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

            let muonResult = await muonNode.ethCallContract(bridge1.address, 'getTx', [depositTxId], bridge1.abi);
            assert(muonResult.success, 'muon node failed')
            let sigs = muonResult.result.signatures.map(({signature}) => signature)
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

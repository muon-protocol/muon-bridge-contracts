const BridgeToken = artifacts.require('BridgeToken');
const truffleAssert = require('truffle-assertions');


contract("BridgeToken", (accounts) => {
    let token, minterRole, burnerRole;
    let mintAmount = web3.utils.toWei('500');

    before(async () => {
        token = await BridgeToken.new(accounts[1], 'TST', 'Test Token', '18');
        minterRole = await token.MINTER_ROLE.call()
        burnerRole = await token.BURNER_ROLE.call()
    });

    describe("Mint/Burn", async () => {

        it("non-bridge accounts should not able to mint", async () => {
            try{
                await token.mint(accounts[0], mintAmount);
                assert(false, "error expected but mint executed successfully")
            }
            catch (error){
                const unknownToken = error.message.search(`is missing role ${minterRole}`) >= 0;
                assert(unknownToken, "only bridge can mint")
            }
        });

        it('bridge can mint', async () => {
            await token.mint(accounts[0], mintAmount, {from: accounts[1]});

            let balance = await token.balanceOf(accounts[0]);
            assert(mintAmount.toString() === balance.toString(), `balance is expected to be ${mintAmount} but it is ${balance}`)
        })

        it("non-bridge accounts should not able to burn", async () => {
            try{
                await token.burn(accounts[0], mintAmount);
                assert(false, "error expected but burn executed successfully")
            }
            catch (error){
                const unknownToken = error.message.search(`is missing role ${burnerRole}`) >= 0;
                assert(unknownToken, "only bridge can burn")
            }
        });

        it('bridge can burn', async () => {
            await token.burn(accounts[0], mintAmount, {from: accounts[1]});

            let balance = await token.balanceOf(accounts[0]);
            assert('0' === balance.toString(), `balance is expected to be 0 but it is ${balance}`)
        })
    })
});
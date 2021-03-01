import {
  MockPricerInstance,
  MockAddressBookInstance,
  OracleInstance,
  MockOtokenInstance,
  MockERC20Instance,
} from '../../build/types/truffle-types'
import BigNumber from 'bignumber.js'
import {assert} from 'chai'
import {createTokenAmount} from '../utils'

const {expectRevert, expectEvent, time} = require('@openzeppelin/test-helpers')

const MockPricer = artifacts.require('MockPricer.sol')
const MockAddressBook = artifacts.require('MockAddressBook.sol')
const MockERC20 = artifacts.require('MockERC20.sol')
const Otoken = artifacts.require('MockOtoken.sol')
const Oracle = artifacts.require('Oracle.sol')

// address(0)
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

contract('Oracle', ([owner, disputer, random, collateral, strike]) => {
  // const batch = web3.utils.asciiToHex('ETHUSDC/USDC1596218762')
  // mock a pricer
  let wethPricer: MockPricerInstance
  // AddressBook module
  let addressBook: MockAddressBookInstance
  // Oracle module
  let oracle: OracleInstance
  // otoken
  let otoken: MockOtokenInstance
  let usdc: MockERC20Instance
  let weth: MockERC20Instance
  let otokenExpiry: BigNumber

  before('Deployment', async () => {
    // addressbook module
    addressBook = await MockAddressBook.new({from: owner})
    // deploy Oracle module
    oracle = await Oracle.new({from: owner})

    // mock tokens
    usdc = await MockERC20.new('USDC', 'USDC', 6)
    weth = await MockERC20.new('WETH', 'WETH', 18)
    otoken = await Otoken.new()
    otokenExpiry = new BigNumber((await time.latest()).toNumber() + time.duration.days(30).toNumber())
    await otoken.init(addressBook.address, weth.address, strike, collateral, '200', otokenExpiry, true)

    // deply mock pricer
    wethPricer = await MockPricer.new(weth.address, oracle.address)
  })

  describe('getHistoricalPrice', () => {
    it('should revert if the pricer is not set', async () => {
      await expectRevert(oracle.getHistoricalPrice(weth.address, 100), 'Oracle: Pricer for this asset not set')
    })

    it('should get the historical round data', async () => {
      const now = (await time.latest()).toNumber()
      const roundId = 100
      const ethPrice = new BigNumber('1000e8')
      await oracle.setAssetPricer(weth.address, wethPricer.address, {from: owner})
      await wethPricer.setHistoricalPrice(roundId, ethPrice, now)
      const [price, timestamp] = await oracle.getHistoricalPrice(weth.address, roundId)
      assert.equal(price.toString(), ethPrice.toString())
      assert.equal(timestamp.toString(), now.toString())
    })
  })

  describe('dustLimit', () => {
    it('should only allow owner to set the the dust limit', async () => {
      await expectRevert(oracle.setDustLimit(weth.address, 100, {from: random}), 'Ownable: caller is not the owner')
    })

    it('should not get the dust limit for an unset asset', async () => {
      await expectRevert(oracle.getDustLimit(usdc.address), 'Oracle: Dust limit for this asset not set')
    })

    it('should set/get the dust limit for WETH', async () => {
      const expectedDustLimit = new BigNumber('.1e8')
      await oracle.setDustLimit(weth.address, expectedDustLimit, {from: owner})
      const wethDustLimit = await oracle.getDustLimit(weth.address)
      assert.equal(wethDustLimit.toString(), expectedDustLimit.toString())
    })
  })
})

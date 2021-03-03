import {
  MockERC20Instance,
  CalculatorTesterInstance,
  MockAddressBookInstance,
  MockOracleInstance,
  MockOtokenInstance,
} from '../../build/types/truffle-types'
import {createVault, createScaledNumber as scaleNum, createTokenAmount, vault} from '../utils'
import {assert} from 'chai'

import BigNumber from 'bignumber.js'

const {expectRevert, time} = require('@openzeppelin/test-helpers')
const MockAddressBook = artifacts.require('MockAddressBook.sol')
const MockOracle = artifacts.require('MockOracle.sol')

const MockOtoken = artifacts.require('MockOtoken.sol')
const MockERC20 = artifacts.require('MockERC20.sol')
const MarginCalculator = artifacts.require('CalculatorTester.sol')
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
contract('MarginCalculator', () => {
  let expiry: number
  let pastExpiry: number

  let calculator: CalculatorTesterInstance
  let addressBook: MockAddressBookInstance
  let oracle: MockOracleInstance
  // eth puts
  let eth300Put: MockOtokenInstance
  let eth250Put: MockOtokenInstance
  let eth200Put: MockOtokenInstance
  let eth100Put: MockOtokenInstance
  // eth puts cUSDC collateral
  let eth300PutCUSDC: MockOtokenInstance

  let expiredPut: MockOtokenInstance

  // eth calls
  let eth300Call: MockOtokenInstance
  let eth250Call: MockOtokenInstance
  let eth200Call: MockOtokenInstance
  let eth100Call: MockOtokenInstance
  // eth calls cETH collateral
  let eth300CallCETH: MockOtokenInstance

  let usdc: MockERC20Instance
  let dai: MockERC20Instance
  let weth: MockERC20Instance
  let ceth: MockERC20Instance
  let cusdc: MockERC20Instance

  // assume there's a R token that has 22 decimals
  let rusd: MockERC20Instance
  let reth: MockERC20Instance
  // assume there's a T token that has 20 decimals
  let tusd: MockERC20Instance

  const usdcDecimals = 6
  const daiDecimals = 8
  const wethDecimals = 18
  const ctokenDecimals = 8
  // to test decimal conversions
  const ttokenDecimals = 27
  const rtokenDecimals = 29

  const chainlinkDecimals = 8

  before('set up contracts', async () => {
    const now = (await time.latest()).toNumber()
    expiry = now + time.duration.days(1).toNumber()
    pastExpiry = now - time.duration.days(1).toNumber()
    // initiate addressbook first.
    addressBook = await MockAddressBook.new()
    // setup oracle
    oracle = await MockOracle.new()
    await addressBook.setOracle(oracle.address)
    // setup calculator
    calculator = await MarginCalculator.new(oracle.address)
    // setup usdc and weth
    usdc = await MockERC20.new('USDC', 'USDC', usdcDecimals)
    dai = await MockERC20.new('DAI', 'DAI', daiDecimals)
    weth = await MockERC20.new('WETH', 'WETH', wethDecimals)
    cusdc = await MockERC20.new('cUSDC', 'cUSDC', ctokenDecimals)
    ceth = await MockERC20.new('cETH', 'cETH', ctokenDecimals)
    // weird tokens
    rusd = await MockERC20.new('rUSD', 'rUSD', rtokenDecimals)
    reth = await MockERC20.new('rETH', 'rETH', rtokenDecimals)
    tusd = await MockERC20.new('tUSD', 'tUSD', ttokenDecimals)
    // setup put tokens
    eth300Put = await MockOtoken.new()
    eth250Put = await MockOtoken.new()
    eth200Put = await MockOtoken.new()
    eth100Put = await MockOtoken.new()
    eth300PutCUSDC = await MockOtoken.new()
    await eth300Put.init(addressBook.address, weth.address, usdc.address, usdc.address, scaleNum(300), expiry, true)
    await eth250Put.init(addressBook.address, weth.address, usdc.address, usdc.address, scaleNum(250), expiry, true)
    await eth200Put.init(addressBook.address, weth.address, usdc.address, usdc.address, scaleNum(200), expiry, true)
    await eth100Put.init(addressBook.address, weth.address, usdc.address, usdc.address, scaleNum(100), expiry, true)
    await eth300PutCUSDC.init(
      addressBook.address,
      weth.address,
      usdc.address,
      cusdc.address,
      scaleNum(300),
      expiry,
      true,
    )
    // setup call tokens
    eth300Call = await MockOtoken.new()
    eth250Call = await MockOtoken.new()
    eth200Call = await MockOtoken.new()
    eth100Call = await MockOtoken.new()
    eth300CallCETH = await MockOtoken.new()
    await eth300Call.init(addressBook.address, weth.address, usdc.address, weth.address, scaleNum(300), expiry, false)
    await eth250Call.init(addressBook.address, weth.address, usdc.address, weth.address, scaleNum(250), expiry, false)
    await eth200Call.init(addressBook.address, weth.address, usdc.address, weth.address, scaleNum(200), expiry, false)
    await eth100Call.init(addressBook.address, weth.address, usdc.address, weth.address, scaleNum(100), expiry, false)
    await eth300CallCETH.init(
      addressBook.address,
      weth.address,
      usdc.address,
      ceth.address,
      scaleNum(300),
      expiry,
      false,
    )

    expiredPut = await MockOtoken.new()
    await expiredPut.init(
      addressBook.address,
      weth.address,
      usdc.address,
      usdc.address,
      scaleNum(300),
      pastExpiry,
      true,
    )
  })

  describe('check p(t)', async () => {
    const pvalues = [52166761235, 90226787871, 137432041436, 193395770533, 281783870466]
    it('t = 0', async () => {
      const p = await calculator.p(0)
      assert.equal(p.toString(), pvalues[0].toString())
    })

    it('t = 86400', async () => {
      const p = await calculator.p(86400)
      assert.equal(p.toString(), pvalues[0].toString())
    })

    it('t = 86401', async () => {
      const p = await calculator.p(86401)
      assert.equal(p.toString(), pvalues[1].toString())
    })

    it('t = 259200', async () => {
      const p = await calculator.p(259200)
      assert.equal(p.toString(), pvalues[1].toString())
    })

    it('t = 259201', async () => {
      const p = await calculator.p(259201)
      assert.equal(p.toString(), pvalues[2].toString())
    })

    it('t = 604800', async () => {
      const p = await calculator.p(604800)
      assert.equal(p.toString(), pvalues[2].toString())
    })

    it('t = 604801', async () => {
      const p = await calculator.p(604801)
      assert.equal(p.toString(), pvalues[3].toString())
    })

    it('t = 1209600', async () => {
      const p = await calculator.p(1209600)
      assert.equal(p.toString(), pvalues[3].toString())
    })

    it('t = 1209601', async () => {
      const p = await calculator.p(1209601)
      assert.equal(p.toString(), pvalues[4].toString())
    })

    it('t = 2419200', async () => {
      const p = await calculator.p(2419200)
      assert.equal(p.toString(), pvalues[4].toString())
    })

    it('t = 2419201', async () => {
      await expectRevert(calculator.p(2419201), 'MarginCalculator: timeToExpiry out of range')
    })
  })

  describe('check getNakedMarginRequirements, isPut, K < 3/4*S', async () => {
    it('K = 100, S = 200, t = 86400', async () => {
      const marginRequired = await calculator.getNakedMarginRequirements(
        scaleNum(100),
        scaleNum(200),
        '86400',
        true,
        '8',
      )
      assert.equal(marginRequired.toString(), '521667612')
    })
  })

  describe('check getNakedMarginRequirements, isPut, K > 3/4*S', async () => {
    it('K = 200, S = 200, t = 86400', async () => {
      const marginRequired = await calculator.getNakedMarginRequirements(
        scaleNum(200),
        scaleNum(200),
        '86400',
        true,
        '8',
      )
      assert.equal(marginRequired.toString(), '5782501418')
    })
  })

  describe('check getNakedMarginRequirements, !isPut, S > 4/3*K', async () => {
    it('K = 200, S = 200, t = 86400', async () => {
      const K = scaleNum(200)
      const S = scaleNum(300)
      const p = new BigNumber(await calculator.p(86400))
      const one = new BigNumber('1e18')
      const A = one.minus(p.times('1e6'))
      const B = A.times(4)
        .times(K)
        .idiv(new BigNumber(S).times(3))
      const expectedMarginRequired = one.minus(B)

      const marginRequired = await calculator.getNakedMarginRequirements(K, S, '86400', false, '18')
      assert.equal(marginRequired.toString(), expectedMarginRequired.toString())
    })
  })

  describe('check getNakedMarginRequirements, !isPut, S <= 4/3*K', async () => {
    it('K = 400, S = 200, t = 86400', async () => {
      const K = scaleNum(400)
      const S = scaleNum(300)
      const p = new BigNumber(await calculator.p(86400))
      const expectedMarginRequired = p.times('1e6')

      const marginRequired = await calculator.getNakedMarginRequirements(K, S, '86400', false, '18')
      assert.equal(marginRequired.toString(), expectedMarginRequired.toString())
    })
  })

  describe('getHistoricalExcessNakedMargin', async () => {
    let now: number
    let putVault: vault
    let callVault: vault
    let emptyVault: vault
    let roundId: number
    let futureRoundId: number
    let futureTimestamp: number
    let historicalTimestamp: number
    let ethPrice: BigNumber

    before('setup oracle', async () => {
      roundId = 100
      futureRoundId = 300

      ethPrice = new BigNumber('1000e8')

      now = (await time.latest()).toNumber()
      historicalTimestamp = now - time.duration.days(5).toNumber()
      await oracle.setHistoricalPrice(weth.address, roundId, ethPrice, historicalTimestamp)
    })

    before('setup vaults', async () => {
      // putVault = createVault(
      //   eth250Put.address,
      //   undefined,
      //   usdc.address,
      //   scaleNum(1),
      //   undefined,
      //   createTokenAmount(100, usdcDecimals),
      // )
      // callVault = createVault(
      //   eth250Call.address,
      //   undefined,
      //   weth.address,
      //   scaleNum(1),
      //   undefined,
      //   createTokenAmount(1, wethDecimals),
      // )
    })

    it('should revert if there is no short token.', async () => {
      const timestamp = now - time.duration.days(5).toNumber()
      const emptyVault = createVault(
        undefined,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, wethDecimals),
      )
      await expectRevert(
        calculator.getHistoricalExcessNakedMargin(emptyVault, ethPrice, timestamp),
        'MarginCalculator: Vault has no short token',
      )
    })

    it('should revert if the short token was expired at the provided timestamp', async () => {
      const timestamp = now + time.duration.days(2).toNumber()
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, usdcDecimals),
      )
      await expectRevert(
        calculator.getHistoricalExcessNakedMargin(vault, ethPrice, timestamp),
        'MarginCalculator: short token was expired at the timestamp',
      )
    })

    it('should revert if the collateral type is wrong', async () => {
      const timestamp = now - time.duration.hours(5).toNumber()
      // vault has the wrong collateral
      const mismatchedVault = createVault(
        eth250Put.address,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, wethDecimals),
      )
      await expectRevert(
        calculator.getHistoricalExcessNakedMargin(mismatchedVault, ethPrice, timestamp),
        'MarginCalculator: collateral asset not marginable for short asset',
      )
    })

    it('should give excess margin for put', async () => {
      const timestamp = now - time.duration.hours(5).toNumber()
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(250, usdcDecimals),
      )
      const [excessMargin, isExcess] = await calculator.getHistoricalExcessNakedMargin(vault, ethPrice, timestamp)
      assert.equal(isExcess, true)
    })

    it('should be not enough margin for put', async () => {
      const timestamp = now - time.duration.hours(5).toNumber()
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(10, usdcDecimals),
      )
      const [excessMargin, isExcess] = await calculator.getHistoricalExcessNakedMargin(vault, ethPrice, timestamp)
      assert.equal(isExcess, false)
    })

    it('should give excess margin for call', async () => {
      const timestamp = now - time.duration.hours(5).toNumber()
      const vault = createVault(
        eth250Call.address,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(1, wethDecimals),
      )
      const [excessMargin, isExcess] = await calculator.getHistoricalExcessNakedMargin(vault, ethPrice, timestamp)
      assert.equal(isExcess, true)
    })

    it('should not be enough margin for call', async () => {
      const timestamp = now - time.duration.hours(5).toNumber()
      const vault = createVault(
        eth250Call.address,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(0.1, wethDecimals),
      )
      const [excessMargin, isExcess] = await calculator.getHistoricalExcessNakedMargin(vault, ethPrice, timestamp)
      assert.equal(isExcess, false)
    })
  })

  describe('getLiquidationFactor', async () => {
    let now: number
    let vault: vault
    let roundId: number
    let futureRoundId: number
    let futureTimestamp: number
    let historicalTimestamp: number
    let ethPrice: BigNumber

    before('set historical price', async () => {
      vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, usdcDecimals),
      )

      roundId = 100
      futureRoundId = 300

      ethPrice = new BigNumber('1000e8')

      now = (await time.latest()).toNumber()
      futureTimestamp = now + time.duration.days(1).toNumber()
      historicalTimestamp = now - time.duration.hours(5).toNumber()
      await oracle.setHistoricalPrice(weth.address, roundId, ethPrice, historicalTimestamp)
      await oracle.setHistoricalPrice(weth.address, futureRoundId, ethPrice, futureTimestamp)
    })

    it('should revert if there is no short token', async () => {
      const emptyVault = createVault(
        undefined,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, wethDecimals),
      )
      const lastCheckedMargin = now - time.duration.days(1).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(emptyVault, '1', futureRoundId, lastCheckedMargin),
        'MarginCalculator: Vault has no short token',
      )
    })
    // not sure if this could ever be possible
    it('should revert if startTime is in the future', async () => {
      const lastCheckedMargin = now + time.duration.days(1).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(vault, '1', futureRoundId, lastCheckedMargin),
        'MarginCalculator: invalid startTime',
      )
    })

    it('should revert if lastCheckedMargin is after the start time', async () => {
      const lastCheckedMargin = now + time.duration.days(1).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(vault, '1', roundId, lastCheckedMargin),
        'MarginCalculator: vault was adjusted more recently than the timestamp of the historical price',
      )
    })

    it('should revert if the short otoken has expired', async () => {
      const expiredVault = createVault(
        expiredPut.address,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, wethDecimals),
      )

      const lastCheckedMargin = now - time.duration.days(30).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(expiredVault, '1', roundId, lastCheckedMargin),
        'MarginCalculator: short otoken has already expired',
      )
    })

    it('should revert if the short otoken has expired', async () => {
      const expiredVault = createVault(
        expiredPut.address,
        undefined,
        weth.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, wethDecimals),
      )

      const lastCheckedMargin = now - time.duration.days(30).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(expiredVault, '1', roundId, lastCheckedMargin),
        'MarginCalculator: short otoken has already expired',
      )
    })

    it('should revert if the vault was well-collateralized at the timestamp', async () => {
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(100, usdcDecimals),
      )

      // roundId corresponds to 5 hours ago
      const lastCheckedMargin = now - time.duration.hours(6).toNumber()
      await expectRevert(
        calculator.getLiquidationAmount(vault, '1', roundId, lastCheckedMargin),
        'MarginCalculator: vault was not under-collateralized at the roundId',
      )
    })

    it('should be positive if the vault was not well-collateralized at the timestamp', async () => {
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(10, usdcDecimals),
      )

      // roundId corresponds to 5 hours ago
      const lastCheckedMargin = now - time.duration.hours(6).toNumber()
      const liquidationAmount = await calculator.getLiquidationAmount(vault, scaleNum(1), roundId, lastCheckedMargin)
      assert.equal(liquidationAmount.gt(0), true)
    })

    it('should be all the collateral if the entire auction length has elapsed', async () => {
      const vault = createVault(
        eth250Put.address,
        undefined,
        usdc.address,
        scaleNum(1),
        undefined,
        createTokenAmount(10, usdcDecimals),
      )

      // auction length is set to one day
      const lastCheckedMargin = now - time.duration.days(3).toNumber()
      const timestamp = now - time.duration.days(2).toNumber()
      const roundId = 200
      await oracle.setHistoricalPrice(weth.address, roundId, ethPrice, timestamp)
      const liquidationAmount = await calculator.getLiquidationAmount(vault, scaleNum(1), roundId, lastCheckedMargin)
      const expectedLiquidationAmount = new BigNumber(createTokenAmount(10, usdcDecimals))
        .times(10 ** 8)
        .div(scaleNum(1))
      assert.equal(liquidationAmount.toString(), expectedLiquidationAmount.toString())
    })
  })
})

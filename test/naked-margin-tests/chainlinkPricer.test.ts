import BigNumber from 'bignumber.js'
import {
  ChainLinkPricerInstance,
  MockOracleInstance,
  MockChainlinkAggregatorInstance,
  MockERC20Instance,
} from '../../build/types/truffle-types'

import {createTokenAmount} from '../utils'
const {expectRevert, time} = require('@openzeppelin/test-helpers')

const ChainlinkPricer = artifacts.require('ChainLinkPricer.sol')
const MockOracle = artifacts.require('MockOracle.sol')
const MockChainlinkAggregator = artifacts.require('MockChainlinkAggregator.sol')
const MockERC20 = artifacts.require('MockERC20.sol')

// address(0)
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

contract('ChainlinkPricer', ([owner, bot, random]) => {
  let wethAggregator: MockChainlinkAggregatorInstance
  let oracle: MockOracleInstance
  let weth: MockERC20Instance
  // otoken
  let pricer: ChainLinkPricerInstance

  before('Deployment', async () => {
    // deploy mock contracts
    oracle = await MockOracle.new({from: owner})
    wethAggregator = await MockChainlinkAggregator.new()
    weth = await MockERC20.new('WETH', 'WETH', 18)
    // deploy pricer
    pricer = await ChainlinkPricer.new(bot, weth.address, wethAggregator.address, oracle.address)
  })

  describe('getHistoricalPrice', () => {
    // aggregator have price in 1e8
    let ethPrice: string
    let now: number
    before('mock data in weth aggregator', async () => {
      ethPrice = createTokenAmount(300, 8)
      now = (await time.latest()).toNumber()
      await wethAggregator.setRoundTimestamp(100, now)
      await wethAggregator.setRoundAnswer(100, ethPrice)

      await wethAggregator.setRoundTimestamp(101, now)
    })

    it('reverts if there is no round data (round not complete)', async () => {
      await expectRevert(pricer.getHistoricalPrice(99), 'ChainLinkPricer: Round not complete')
    })

    it('reverts if there is not a valid price', async () => {
      await expectRevert(pricer.getHistoricalPrice(101), 'ChainLinkPricer: Price less than or equal to zero')
    })

    it('gets the historicalPrice', async () => {
      const [price, timestamp] = await pricer.getHistoricalPrice(100)
      assert.equal(price.toString(), ethPrice)
      assert.equal(timestamp.toString(), now.toString())
    })
  })
})

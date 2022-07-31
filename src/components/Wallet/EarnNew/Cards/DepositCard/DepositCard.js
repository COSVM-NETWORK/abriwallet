import { useCallback, useEffect, useRef, useState } from 'react'
import Card from 'components/Wallet/EarnNew/Card/Card'
import { Button, Image, AmountInput, Loading } from 'components/common'
import BigNumber from 'bignumber.js'
import './DepositCard.scss'
import { Interface } from 'ethers/lib/utils'
import { ethers } from 'ethers'
import ERC20ABI from 'adex-protocol-eth/abi/ERC20.json'
import { getProvider } from 'lib/provider'
import { fetchGet } from 'lib/fetch'


const DepositCard = ({
   selectedNetwork,
   selectedToken,
   selectedStrategy,
   strategies,
   portfolio,
   addRequest,
   selectedAccount,
   relayerURL,
   inactive
}) => {

  const currentNetwork = useRef()
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState({ human: '', withDecimals: 0 })
  const [isUserDataLoading, setIsUserDataLoading] = useState(false)
  const [userData, setUserData] = useState({})

  const strategy = (strategies && selectedStrategy && selectedToken) ? (strategies[selectedStrategy].find(s => s.baseTokenSymbol === selectedToken.baseTokenSymbol)) : null
  const strategyId = strategy?.strategyId
  const baseTokenDetails = (selectedToken && portfolio) ? portfolio.tokens.find(t => t.address.toLowerCase() === selectedToken.baseTokenAddress.toLowerCase()) : null
  const stakedTokenDetails = (strategy && portfolio) ? portfolio.tokens.find(t => t.address.toLowerCase() === strategy.address.toLowerCase()) : null

  const replaceValue = (value, valuesMap) => {
    if ((value + '').startsWith('$')) {
      if (value.startsWith('$res')) {
        const splitPath = value.split('.')
        let res = valuesMap.results
        for (let s of splitPath.slice(1)) {
          res = res[s]
        }
        return res
      } else {
        return valuesMap[value.substring(1)]
      }
    }
    return value
  }

  const onDepositClick = useCallback(async () => {

    setLoading(true)
    const reqId = Date.now()
    const provider = getProvider(selectedNetwork.id)

    if (!amount.withDecimals || amount.withDecimals <= 0) {
      setError('Amount required')
      setLoading(false)
      return
    }

    let valuesMap = {
      amount: amount.withDecimals,
      tokenAddress: selectedToken.baseTokenAddress,
      vaultAddress: selectedStrategy.address,
      identityAddress: selectedAccount,
      results: []
    }

    let i = 0
    for (let descriptor of strategy.depositTxDescriptor) {
      if (descriptor.requireAllowance) {

        const ercInterface = new ethers.utils.Interface(ERC20ABI)
        const erc20Contract = new ethers.Contract(descriptor.address, ERC20ABI, provider)
        const allowance = await erc20Contract.allowance(selectedAccount, descriptor.spender)

        if (new BigNumber(allowance).lt(amount.withDecimals) || true) {
          await addRequest({
            id: `earn_${reqId}_${i}`,
            type: 'eth_sendTransaction',
            account: selectedAccount,
            chainId: selectedNetwork.chainId,
            txn: {
              to: erc20Contract.address,
              value: '0x0',
              data: ercInterface.encodeFunctionData('approve', [
                descriptor.spender,
                amount.withDecimals
              ])
            }
          })
        }
      } else {
        const ContractInterface = new Interface(descriptor.interface)

        const values = descriptor.args.map(arg => {
          return replaceValue(arg, valuesMap)
        })

        const data = ContractInterface.encodeFunctionData(descriptor.func, values)

        if (descriptor.type === 'write') {
          await addRequest({
            id: `earn_${reqId}_${i}`,
            type: 'eth_sendTransaction',
            account: selectedAccount,
            chainId: selectedNetwork.chainId,
            txn: {
              to: descriptor.address,
              value: '0x0',
              data: data
            }
          })
        } else {
          const caller = new ethers.Contract(descriptor.address, ContractInterface)
          valuesMap.results[i] = await caller[descriptor.func](...values)
        }
      }
      i++
    }

    setLoading(false)
  }, [selectedNetwork, amount, selectedToken, selectedStrategy, selectedAccount, strategy, addRequest])

  const getTotalValue = useCallback((amount, symbol, decimals) => {
    if (isUserDataLoading) return <Loading/>
    if (userData.error) return 'Error: ' + userData.error

    if (amount >= 0) {
      return new BigNumber(amount).div(10 ** decimals)
        + ' ' + symbol
    }
  }, [isUserDataLoading, userData])

  useEffect(() => {
    currentNetwork.current = selectedNetwork.id
  }, [selectedNetwork])

  useEffect(() => {
    if (selectedStrategy && strategyId) {
      setUserData({})
      setIsUserDataLoading(true)
      fetchGet(`${relayerURL}/earn/strategies/${selectedNetwork.id}/${selectedStrategy}/${strategyId}/${selectedAccount}`)
        .then(result => {
          if (result.success) {
            setUserData(result.userData)
          } else {
            setUserData({ error: result.error || true })
          }
          setIsUserDataLoading(false)
        })
        .catch(err => {
          setIsUserDataLoading(false)
          setUserData({
            error: err
          })
        })
    }
  }, [selectedStrategy, strategyId, relayerURL, selectedNetwork.id, selectedAccount])

  let availableBalanceBN = baseTokenDetails ? (new BigNumber(baseTokenDetails.balanceRaw).div(10 ** baseTokenDetails.decimals)) : 0
  let availableStakedBalanceBN = stakedTokenDetails ? (new BigNumber(stakedTokenDetails.balanceRaw).div(10 ** stakedTokenDetails.decimals)) : 0

  return (
    <Card
      large={false}
      header={{ step: 3, title: 'Deposit' }}
      inactive={inactive}
      class
    >

      {
        inactive
          ? (
            <div className='notification-clear'>Please select a staking strategy to continue the process</div>
          )
          : (
            <>
              {
                selectedToken &&
                <div className='tokenDetails'>
                  <div className='tokenDetails-icon'>
                    <Image url={selectedToken.icon} alt={selectedToken.name} size={24}/>
                  </div>
                  <div className='tokenDetails-text'>
                    {selectedToken.baseTokenSymbol}
                  </div>
                </div>
              }

              <h3>Details</h3>

              {
                selectedToken && strategy &&
                <table className='depositDetails'>
                  <tr>
                    <td>Available balance</td>
                    <td>{availableBalanceBN.toFixed(8)} {selectedToken?.baseTokenSymbol}</td>
                  </tr>

                  <tr>
                    <td>Staked balance</td>
                    <td>{availableStakedBalanceBN.toFixed(8)} {strategy.symbol}</td>
                  </tr>

                  <tr>
                    <td>APY</td>
                    <td>{strategy.apy}%</td>
                  </tr>

                  {
                    userData.totalRewards !== undefined &&
                    <tr>
                      <td>All time rewards</td>
                      <td>{getTotalValue(userData.totalRewards, selectedToken?.baseTokenSymbol, selectedToken?.baseTokenDecimals)}</td>
                    </tr>
                  }

                  <tr>
                    <td>Total deposits</td>
                    <td>{getTotalValue(userData.totalDeposits, selectedToken?.baseTokenSymbol, selectedToken?.baseTokenDecimals)}</td>
                  </tr>

                  <tr>
                    <td>Total withdrawals</td>
                    <td>{getTotalValue(userData.totalWithdrawals, selectedToken?.baseTokenSymbol, selectedToken?.baseTokenDecimals)}</td>
                  </tr>

                  <tr>
                    <td>Lock</td>
                    <td>{strategy.lock || 'No lock'}</td>
                  </tr>

                  <tr>
                    <td>Type</td>
                    <td>{strategy.type}</td>
                  </tr>
                </table>
              }

              {
                error && <div className='error-message'>
                  {error}
                </div>
              }

              <AmountInput
                decimals={selectedToken.baseTokenDecimals}
                placeholder={`${selectedToken.baseTokenSymbol} Amount`}
                value={amount.human}
                onChange={(val) => setAmount(val)}
              />

              <Button
                className='earnButton'
                disabled={!selectedToken || !selectedStrategy || isLoading}
                onClick={onDepositClick}
              >Deposit</Button>
            </>
          )
      }

    </Card>
  )
}

export default DepositCard

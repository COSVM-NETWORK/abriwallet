import './Quotes.scss'

import { MdOutlineArrowForward, MdOutlineCheck, MdOutlineClose } from 'react-icons/md';
import { Button, Loading, Radios } from '../../../../common';
import { useState } from 'react';
import networks from '../../../../../consts/networks';
import { approvalBuildTx, checkApprovalAllowance, sendBuildTx } from '../../../../../services/movr';
import { useToasts } from '../../../../../hooks/toasts';

const formatAmount = (amount, asset) => amount / Math.pow(10, asset.decimals)
const getNetwork = id => networks.find(({ chainId }) => chainId === id)

const Quotes = ({ addRequest, selectedAccount, fromTokensItems, quotes, onCancel }) => {
    const { addToast } = useToasts()

    const { toAsset } = quotes;
    const fromAsset = fromTokensItems.find(({ value }) => value === quotes.fromAsset.address)
    const fromNetwork = getNetwork(quotes.fromAsset.chainId)
    const toNetwork = getNetwork(toAsset.chainId)
    const [selectedRoute, setSelectedRoute] = useState(null)
    const [loading, setLoading] = useState(false)

    const routes = quotes.routes.map(({ routePath, fees, middlewareRoute, bridgeRoute }) => ({
        routePath,
        middlewareRoute,
        bridgeRoute,
        middlewareFee: middlewareRoute ? formatAmount(fees.middlewareFee.amount, middlewareRoute.fromAsset) : 0,
        bridgeFee: bridgeRoute ? formatAmount(fees.bridgeFee.amount, bridgeRoute.toAsset) : 0
    }))

    const radios = routes.map(({ routePath, middlewareFee, bridgeFee, middlewareRoute, bridgeRoute }) => ({
        label:
            <div className="route">
                <div className="info">
                    {
                        middlewareRoute ?
                            <div className="middleware">
                                <div className="icon" style={{backgroundImage: `url(${middlewareRoute.middlewareInfo.icon})`}}></div>
                                <div className="name">{ middlewareRoute.middlewareInfo.displayName }</div>
                            </div>
                            :
                            null
                    }
                    <div className="bridge">
                        <div className="icon" style={{backgroundImage: `url(${bridgeRoute.bridgeInfo.icon})`}}></div>
                        <div className="name">{ bridgeRoute.bridgeInfo.displayName }</div>
                    </div>
                </div>
                <div className="summary">
                    <div className="amounts">
                        {
                            middlewareRoute ?
                                <div className="amount">
                                    { formatAmount(middlewareRoute.inputAmount, middlewareRoute.fromAsset) } { middlewareRoute.fromAsset.symbol }
                                </div>
                                :
                                null
                        }   
                        <div className="amount">
                            { formatAmount(bridgeRoute.outputAmount, bridgeRoute.toAsset) } { bridgeRoute.toAsset.symbol }
                        </div>
                    </div>
                    <div className="fees">
                        {
                            middlewareRoute ?
                                <div className="fee">
                                    { middlewareFee ? <>Fee: { middlewareFee } { middlewareRoute.fromAsset.symbol }</> : null }
                                </div>
                                :
                                null
                        }
                        <div className="fee">
                            { bridgeFee ? <>Fee: { bridgeFee } { bridgeRoute.toAsset.symbol }</> : null }
                        </div>
                    </div>
                </div>
            </div>,
        value: routePath
    }))

    const sendTx = (id, chainId, to, data, value = '0x00') => {
        addRequest({
            id,
            chainId,
            account: selectedAccount,
            type: 'eth_sendTransaction',
            txn: {
                to,
                data,
                value
            }
        })
    }

    const onConfirm = async () => {
        setLoading(true)

        try {
            const { middlewareRoute, bridgeRoute, routePath } = routes.find(({ routePath }) => routePath === selectedRoute)

            let fromAsset, inputAmount = null
            if (middlewareRoute) {
                fromAsset = middlewareRoute.fromAsset
                inputAmount = middlewareRoute.inputAmount
            } else {
                fromAsset = bridgeRoute.fromAsset
                inputAmount = bridgeRoute.inputAmount
            }

            const { toAsset, outputAmount } = bridgeRoute
            const { tx } = await sendBuildTx(selectedAccount, fromAsset.address, fromAsset.chainId, toAsset.address, toAsset.chainId, inputAmount, outputAmount, routePath)
            const allowance = await checkApprovalAllowance(fromAsset.chainId, selectedAccount, tx.to, fromAsset.address)

            if (inputAmount > allowance.value) {
                const { to, data } = await approvalBuildTx(fromAsset.chainId, selectedAccount, tx.to, fromAsset.address, inputAmount)
                sendTx(`transfer_approval_crosschain_${Date.now()}`, fromAsset.chainId, to, data)
            } else {
                sendTx(`transfer_send_crosschain_${Date.now()}`, fromAsset.chainId, tx.to, tx.data, tx.value.hex)
            }
        } catch(e) {
            console.error(e);
            addToast(e.message || e, { error: true })
        }

        setLoading(false)
    }

    return (
        <div id="quotes">
            <div id="summary">
                <div className="path">
                    <div className="network">
                        <div className="icon" style={{backgroundImage: `url(${fromNetwork.icon})`}}></div>
                        <div className="name">{ fromNetwork.name }</div>
                    </div>
                    <div className="token">
                        <div className="icon" style={{backgroundImage: `url(${fromAsset.icon})`}}></div>
                        <div className="name">{ fromAsset.label }</div>
                    </div>
                </div>
                <MdOutlineArrowForward/>
                <div className="path">
                    <div className="network">
                        <div className="icon" style={{backgroundImage: `url(${toNetwork.icon})`}}></div>
                        <div className="name">{ toNetwork.name }</div>
                    </div>
                    <div className="token">
                        <div className="icon" style={{backgroundImage: `url(${toAsset.icon})`}}></div>
                        <div className="name">{ toAsset.name } ({ toAsset.symbol })</div>
                    </div>
                </div>
            </div>

            {
                loading ?
                    <Loading/>
                    :
                    <div id="routes">
                        <div className="title">Routes</div>
                        <Radios radios={radios} onChange={value => setSelectedRoute(value)}/>
                    </div>
            }

            <div className="separator"></div>

            <div id="buttons">
                <Button small clear icon={<MdOutlineClose/>} disabled={loading} onClick={onCancel}>Cancel</Button>
                <Button small icon={<MdOutlineCheck/>} disabled={!selectedRoute || loading} onClick={onConfirm}>Confirm</Button>
            </div>
        </div>
    )
}

export default Quotes
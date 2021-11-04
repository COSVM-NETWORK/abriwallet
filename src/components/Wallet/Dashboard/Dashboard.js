import './Dashboard.scss'

import { useLayoutEffect, useState } from 'react'
import { GiToken } from 'react-icons/gi'
import Loading from '../../common/Loading/Loading'

export default function Dashboard({ balances, totalUSD }) {
    const [positiveBalances, setPositivesBalances] = useState([]);

    useLayoutEffect(() => {
        setPositivesBalances(balances.filter(({ products }) => products && products.length));
    }, [balances]);

    return (
        <section id="dashboard">
            <div id="balance" className="panel">
                <div className="title">Balance</div>
                <div className="content">
                    <div id="total">
                        <span className="green-highlight">$</span> { totalUSD.truncated }
                        <span className="green-highlight">.{ totalUSD.decimal }</span>
                    </div>
                </div>
            </div>
            <div id="table" className="panel">
                <div className="title">Assets</div>
                <div className="content">
                    {
                        !positiveBalances.length ?
                            <Loading/>
                            :
                            positiveBalances.map(({ products }) => 
                                products.map(({ label, assets }, i) => (
                                    <div className="category" key={`category-${i}`}>
                                        <div className="title">{ label }</div>
                                        <div className="list">
                                            {
                                                assets.map(({ tokens }) => 
                                                    tokens.map(({ label, collectionName, symbol, img, collectionImg, balance, balanceUSD }, i) => (
                                                        <div className="token" key={`token-${i}`}>
                                                            <div className="icon">
                                                                {
                                                                    img || collectionImg ? 
                                                                        <img src={img || collectionImg} alt="Token Icon"/>
                                                                        :
                                                                        <GiToken size={20}/>
                                                                }
                                                            </div>
                                                            <div className="name">
                                                                { label || collectionName || symbol }
                                                            </div>
                                                            <div className="separator"></div>
                                                            <div className="balance">
                                                                <div className="currency">
                                                                    { balance } <span className="symbol">{ symbol }</span>
                                                                </div>
                                                                <div className="dollar">
                                                                    <span className="symbol">$</span> { balanceUSD }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )
                                            }
                                        </div>
                                    </div>
                                )
                            ))
                    }
                </div>
            </div>
        </section>
    )
}
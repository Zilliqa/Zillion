import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { VaultDataMap } from '../../util/interface';
import Vaults from '../bzil/vaults';


function DashboardMainView(props: any) {
    const vaults = useAppSelector(state => state.user.vaults);
    const vaultsBalances = useAppSelector(state => state.user.vaults_balances);  // vault_address -> { zilBalance, bzilBalance }
    const vaultsDataMap: VaultDataMap = useAppSelector(state => state.user.vaults_data_map);
    
    const [numArray, setNumArray] = useState([] as any);
    const [tab, setTab] = useState('portfolio');

    useEffect(() => {
        let newArray = [];
        for (let i = 0; i < 30; i++) {
            newArray.push(i);
        }
        setNumArray([...newArray]);
    }, []);
    
    return (
        <div className="main container-lg h-100">
            <div className="my-4">
                <button
                    type="button"
                    className={`py-2 btn shadow-none tabs ${ tab === 'portfolio' && 'active-tabs' }`}
                    onClick={() => setTab('portfolio')}>
                    Portfolio
                </button>
                <button
                    type="button"
                    className={`py-2 btn shadow-none tabs ${ tab === 'withdrawals' && 'active-tabs' }`}
                    onClick={() => setTab('withdrawals')}>
                    Withdrawals
                </button>
            </div>
            {
                tab === 'portfolio' &&
                <div className="text-white">
                    <div className="mb-4">
                        <h2>Overview</h2>
                        <div className="container">
                            <div className="row">
                                <div className="col portfolio-item text-center">
                                    <div className="title">Total Value Locked</div>
                                    <div className="amt">$1234.00</div>
                                </div>
                                <div className="col portfolio-item text-center">
                                    <div className="title">Est. APR</div>
                                    <div className="amt">12.95%</div>
                                </div>
                                <div className="col portfolio-item text-center">
                                    <div className="title">Blocks Until Rewards</div>
                                    <div className="amt">19</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h2>Vaults</h2>
                        <Vaults />
                    </div>
                </div>
            }
            {
                tab === 'withdrawals' &&
                <div className="text-white">
                    <h2>Withdrawals</h2>
                    <ul>
                        {
                            numArray.map((items: any) => {
                                return (
                                    <li key={items} className="mb-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam nec tincidunt nisl. Praesent accumsan fringilla purus et faucibus. Aliquam</li>    
                                )
                            })
                        }
                    </ul>
                </div>
            }
        </div>
    )
}

export default DashboardMainView;
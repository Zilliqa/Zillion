import React from 'react';
import { Environment, ContractState } from '../util/enum';


function WarningBanner(props: any) {
    // config.js from public folder
    const { environment_config } = (window as { [key: string]: any })['config'];

    return (
        <div id="banner" className="mb-4 text-center">
            { 
                environment_config === Environment.PROD ? 
                <>
                <div className="px-3 py-3"><strong>Warning</strong>: Zillion is in beta phase. Use this dApp at your own risk.</div>
                {
                    ContractState.IS_PAUSED.toString() === 'true' && 
                    <div className="px-3 pb-3"><strong>Attention</strong>: Staking contract is going to be paused at 20 OCT 4:00 for upgrading. Please refer to the announcement at <a href="https://t.me/zilliqa/493" target="_blank" rel="noopener noreferrer">https://t.me/zilliqa/493</a>.</div>
                }
                </> :
                <div className="p-3"><strong>Warning</strong>: Zillion is still in testnet. You are using this dApp at your own risk. Zilliqa cannot assume any responsibility for any loss of funds.</div>
            }
        </div>
    );
}

export default WarningBanner;
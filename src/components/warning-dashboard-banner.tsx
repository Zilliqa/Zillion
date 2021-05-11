import React from 'react';
import { Environment, ContractState } from '../util/enum';


function WarningDashboardBanner(props: any) {
    // config.js from public folder
    const { environment_config } = (window as { [key: string]: any })['config'];

    return (
        <div id="banner" className="mb-4 text-center">
            { 
                environment_config === Environment.PROD ? 
                <>
                {
                    ContractState.IS_PAUSED.toString() === 'true' && 
                    <div className="px-3 pt-3 py-3"><strong>Attention</strong>: Zilliqa Staking Phase 1 will undergo migration to Phase 1.1 starting from May 11 2020, 04:45 UTC. During the migration, staking contracts will be paused. For more information, please check out <a href="https://blog.zilliqa.com/upcoming-staking-contract-upgrades-to-enhance-user-experience-with-new-functionalities-c7548aab4823">this blog post</a>. </div>
                }
                </> :
                <>
                <div className="px-3 pt-3 pb-3"><strong>Attention</strong>: Testnet staking contract is paused currently. Please check back again later.</div>
                </>
            }
        </div>
    );
}

export default WarningDashboardBanner;
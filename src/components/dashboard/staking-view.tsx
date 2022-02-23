import React from 'react';
import SsnTable from '../ssn-table';

function StakingView(props: any) {

    return (
        <div className="main container-lg h-100 text-white">
            <h2 className="mt-4">Staking Seed Nodes</h2>
            <div id="nodes-table" className="custom-table text-center my-2 mb-4 p-4">
                <SsnTable showStakeBtn={true} />
            </div>
        </div>
    )
}

export default StakingView;
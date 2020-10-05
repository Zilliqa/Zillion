import React, { useState } from 'react';

function DelegatorDropdown(props: any) {
    const [showMenu, setShowMenu] = useState(false);

    // rewards in Qa
    const { 
        setClaimedRewardModalData, 
        ssnName,
        ssnAddress,
        rewards,
    } = props;

    const handleClaimRewards = () => {
        setClaimedRewardModalData((prevData: any) => ({
            ...prevData,
            ssnName: ssnName,
            ssnAddress: ssnAddress,
            rewards: rewards,
        }));
    };

    return (
        <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdown-menu-btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                Test
            </button>
            <div className="dropdown-menu" aria-labelledby="dropdown-menu-btn">
                <button 
                    type="button" 
                    className="btn btn-contract shadow-none" 
                    data-toggle="modal" 
                    data-target="#withdraw-reward-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleClaimRewards}>
                        Claim Rewards
                </button>
            </div>
        </div>
    );
}

export default DelegatorDropdown;
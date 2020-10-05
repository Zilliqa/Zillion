import React, { useState } from 'react';
import { TransferStakeModalData, WithdrawStakeModalData, ClaimedRewardModalData } from '../util/interface';

function DelegatorDropdown(props: any) {
    const [showMenu, setShowMenu] = useState(false);

    // from staking-portfolio
    // modal data is a state variable on dashboard
    // delegAmt, rewards in Qa
    const { 
        setClaimedRewardModalData,
        setTransferStakeModalData, 
        setWithdrawStakeModalData,
        ssnName,
        ssnAddress,
        delegAmt,
        rewards,
    } = props;

    const handleClaimRewards = () => {
        setClaimedRewardModalData((prevData: ClaimedRewardModalData) => ({
            ...prevData,
            ssnName: ssnName,
            ssnAddress: ssnAddress,
            rewards: rewards,
        }));
    };

    const handleTransferStake = () => {
        setTransferStakeModalData((prevData: TransferStakeModalData) => ({
            ...prevData,
            ssnName: ssnName,
            ssnAddress: ssnAddress,
            delegAmt: delegAmt,
        }));
    };

    const handleWithdrawStake = () => {
        setWithdrawStakeModalData((prevData: WithdrawStakeModalData) => ({
            ...prevData,
            ssnName: ssnName,
            ssnAddress: ssnAddress,
            delegAmt: delegAmt,
        }));
    };

    return (
        <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdown-menu-btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                Test
            </button>
            <div className="dropdown-menu dropdown-menu-right" aria-labelledby="dropdown-menu-btn">
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
                <button
                    type="button"
                    className="btn btn-contract shadow-none" 
                    data-toggle="modal" 
                    data-target="#withdraw-stake-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleWithdrawStake}>
                        Initiate Stake Withdrawal
                </button>
                <button 
                    type="button" 
                    className="btn btn-contract shadow-none" 
                    data-toggle="modal" 
                    data-target="#redeleg-stake-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleTransferStake}>
                        Transfer Stake
                </button>
            </div>
        </div>
    );
}

export default DelegatorDropdown;
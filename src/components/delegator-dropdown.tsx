import React from 'react';
import { TransferStakeModalData, WithdrawStakeModalData, ClaimedRewardModalData } from '../util/interface';
import { ButtonText, ContractState } from '../util/enum';


function DelegatorDropdown(props: any) {
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
        <div id="delegator-dropdown" className="dropdown dropright">
            <button 
                className={ContractState.IS_PAUSED.toString() === 'true' ?
                            'btn btn-contract-small-disabled dropdown-toggle shadow-none' :
                            'btn btn-contract-small dropdown-toggle shadow-none'}
                data-display="static" 
                type="button" 
                id="dropdown-menu-btn" 
                data-toggle="dropdown" 
                aria-haspopup="true" 
                aria-expanded="false"
                disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                    {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Manage'}
            </button>
            <div className="dropdown-menu delegator-menu animate__animated animate__fadeIn" aria-labelledby="dropdown-menu-btn">
                <button 
                    type="button" 
                    className="btn btn-deleg-action shadow-none" 
                    data-toggle="modal" 
                    data-target="#withdraw-reward-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleClaimRewards}
                    disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                        {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Claim Rewards'}
                </button>
                <button 
                    type="button" 
                    className="btn btn-deleg-action shadow-none" 
                    data-toggle="modal" 
                    data-target="#redeleg-stake-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleTransferStake}
                    disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                        {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Transfer Stake'}
                </button>
                <button
                    type="button"
                    className="btn btn-deleg-action shadow-none" 
                    data-toggle="modal" 
                    data-target="#withdraw-stake-modal" 
                    data-keyboard="false" 
                    data-backdrop="static"
                    onClick={handleWithdrawStake}
                    disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                        {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Initiate Stake Withdrawal'}
                </button>
            </div>
        </div>
    );
}

export default DelegatorDropdown;
import React from 'react';
import { withRouter } from "react-router-dom";
import { useAppDispatch } from '../store/hooks';
import { UPDATE_STAKING_MODE } from '../store/userSlice';
import { StakingMode } from '../util/enum';

function StakingModeSelection(props: any) {
    const dispatch = useAppDispatch();

    const onSelectStakingMode = (stakingMode: StakingMode) => {
        // set the staking mode in the store
        dispatch(UPDATE_STAKING_MODE(stakingMode));
    }

    return (
        <div id='staking-mode-selection' className="container animate__animated animate__fadeIn">
            <div className="staking-text">
                <p><strong>Select a staking option</strong></p>
            </div>
            <div className="row align-item-center justify-content-center mx-1 mb-4">
                    <div className="item d-block col-4 px-4">
                        <h2 className="mt-4">Normal Staking</h2>
                        <p className="mode">ZIL</p>
                        <p className="description">
                            Generate ZILs by locking ZILs to any nodes.<br/>Our best performing staking option.
                        </p>
                        <div>
                            <button 
                                type="button" 
                                className="btn btn-user-action" 
                                onClick={() => onSelectStakingMode(StakingMode.ZIL)}
                                data-toggle="modal" 
                                data-target="#wallet-selection-modal" 
                                data-keyboard="false">
                                    Select
                            </button>
                        </div>
                    </div>
                    <div className="item d-block col-4 px-4">
                        <h2 className="mt-4">BZIL Staking</h2>
                        <p className="mode">BZIL &amp; ZIL</p>
                        <p className="description">
                            Generate ZILs &amp; BZILs by locking to any nodes.
                        </p>
                        <div>
                            <button 
                                type="button" 
                                className="btn btn-user-action" 
                                onClick={() => onSelectStakingMode(StakingMode.BZIL)}
                                data-toggle="modal"
                                data-target="#wallet-selection-modal" 
                                data-keyboard="false">
                                    Select
                            </button>
                        </div>
                    </div>
            </div>
        </div>
    )
}

export default withRouter(StakingModeSelection);
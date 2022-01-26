import React from 'react';

function StakingModeSelection(props: any) {
    return (
        <div id='staking-mode-selection' className="container animate__animated animate__fadeIn">
            <div className="staking-text">
                <p><strong>Select a staking option</strong></p>
            </div>
            <div className="row align-item-center justify-content-center mx-1 mb-4">
                    <div className="item d-block col-4">
                        <h2 className="mt-4">Normal Staking</h2>
                        <p className="mode">ZIL</p>
                        <p className="description">
                            Our best performing staking option!<br/>Stake to earn ZILs!
                        </p>
                        <div><button type="button" className="btn btn-user-action">Pick Me</button></div>
                    </div>
                    <div className="item d-block col-4">
                        <h2 className="mt-4">BZIL Staking</h2>
                        <p className="mode">BZIL &amp; ZIL</p>
                        <p className="description">
                            Stake to earn BZILs &amp; ZILs!<br/>
                            Invest your BZILs to earn more!<br/>
                            Return BZIL when you withdraw!
                        </p>
                        <div><button type="button" className="btn btn-user-action">Pick Me</button></div>
                    </div>
            </div>
        </div>
    )
}

export default StakingModeSelection;
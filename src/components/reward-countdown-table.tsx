import React, { useState, useRef, useEffect } from 'react';
import AnimatedNumber from "animated-number-react";
import { trackPromise } from 'react-promise-tracker';
import { useAppSelector } from '../store/hooks';
import { OperationStatus } from '../util/enum';
import { logger } from '../util/logger';
import { calculateBlockRewardCountdown } from '../util/utils';
import { ZilSdk } from '../zilliqa-api';


function RewardCountdownTable(props: any) {
    const networkURL = useAppSelector(state => state.blockchain.blockchain);
    const mountedRef = useRef(true);

    // for populating rewards distribution countdown
    const [currentBlockNum, setCurrentBlockNum] = useState('0');
    const [expectedBlockNum, setExpectedBlockNum] = useState('0');
    const [blockCountToReward, setBlockCountToReward] = useState('0');

    useEffect(() => {
        let tempCurrentBlockNum = '0';
        let tempBlockRewardCount = '0';
        let tempExpectedBlockNum = '0';

        trackPromise(ZilSdk.getNumTxBlocks()
            .then((state) => {
                if (state === undefined || state === OperationStatus.ERROR) {
                    return null;
                }
                const currentBlockNum = parseInt(state) - 1;
                const blockCountdown = calculateBlockRewardCountdown(currentBlockNum, networkURL);
                const expectedBlockNum = currentBlockNum + blockCountdown;
                
                tempCurrentBlockNum = currentBlockNum.toString();
                tempBlockRewardCount = blockCountdown.toString();
                tempExpectedBlockNum = expectedBlockNum.toString();
            })
            .catch((err) => {
                console.error(err);
            })
            .finally(() => {
                logger("updating reward countdown table");
                if (mountedRef.current) {
                    setCurrentBlockNum(tempCurrentBlockNum);
                    setBlockCountToReward(tempBlockRewardCount);
                    setExpectedBlockNum(tempExpectedBlockNum);
                }  
            }));
    }, [networkURL]);

    const formatValue = (value: any) => `${Number(value).toFixed(0)}`;

    return (
        <div id="stake-rewards-distribution" className="container">
            <div className="row p-4">
                <h2 className="mb-4">Rewards Distribution</h2>

                <div className="col-12 align-items-center">
                    <div className="row mx-auto justify-content-center">
                        <div className="d-block stake-rewards-card">
                            <h3>Current Block Num.</h3>
                            <div className="d-flex justify-content-center">
                                <AnimatedNumber 
                                    value={currentBlockNum}
                                    formatValue={formatValue}
                                    duration={800}
                                />
                            </div>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Blocks Until Rewards</h3>
                            <div className="test d-flex justify-content-center">
                                <AnimatedNumber 
                                    value={blockCountToReward}
                                    formatValue={formatValue} 
                                    duration={800}
                                />
                            </div>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Est. Reward Block Num.</h3>
                            <div className="d-flex justify-content-center">
                                <AnimatedNumber 
                                    value={expectedBlockNum}
                                    formatValue={formatValue} 
                                    duration={800}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RewardCountdownTable;
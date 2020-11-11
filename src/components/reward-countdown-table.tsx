import { Zilliqa } from '@zilliqa-js/zilliqa';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import AnimatedNumber from "react-animated-numbers"
import * as ZilliqaAccount from '../account';
import { Constants, NetworkURL, WebSocketURL } from '../util/enum';
const { MessageType } = require('@zilliqa-js/subscriptions');


function RewardCountdownTable(props: any) {
    const networkURL = props.network;
    const mountedRef = useRef(true);

    // for populating rewards distribution countdown
    const [currentBlockNum, setCurrentBlockNum] = useState('0');
    const [expectedBlockNum, setExpectedBlockNum] = useState('0');
    const [blockCountToReward, setBlockCountToReward] = useState('0');

    const calculateBlocks = useCallback((blockNum: number) => {
        let sampleRewardBlockNum = 0;
        let rewardBlockCount = 0;
    
        if (networkURL === NetworkURL.MAINNET) {
            sampleRewardBlockNum = Constants.SAMPLE_REWARD_BLOCK_MAINNET;
            rewardBlockCount = Constants.REWARD_BLOCK_COUNT_MAINNET;
        } else {
            sampleRewardBlockNum = Constants.SAMPLE_REWARD_BLOCK_TESTNET;
            rewardBlockCount = Constants.REWARD_BLOCK_COUNT_TESTNET;
        }

        let result = {
            expectedBlockNum : '0',
            blockCountdown : '0'
        }

        const blockDiff = blockNum - sampleRewardBlockNum;
        const blockTraverse = blockDiff % rewardBlockCount;
        const blockCountdown = rewardBlockCount - blockTraverse;
        const expectedBlockNum = blockNum + blockCountdown;

        result.expectedBlockNum = expectedBlockNum.toString();
        result.blockCountdown = blockCountdown.toString();

        return result
    }, [networkURL]);

    useEffect(() => {
        let webSocketURL = (networkURL === NetworkURL.MAINNET) ? WebSocketURL.MAINNET : WebSocketURL.TESTNET;
        const zilliqa = new Zilliqa(networkURL);
        const subscriber = zilliqa.subscriptionBuilder.buildNewBlockSubscriptions(
            webSocketURL,
        );

        // load initial block number and countdown to quickly display on page on load
        // because web subscriber event need time to retrieve data
        async function loadInitialData() {
            const blockNum = parseInt(await ZilliqaAccount.getNumTxBlocksExplorer(networkURL)) - 1;
            const result = calculateBlocks(blockNum);
    
            if (mountedRef.current) {
                setCurrentBlockNum(blockNum.toString());
                setBlockCountToReward(result.blockCountdown);
                setExpectedBlockNum(result.expectedBlockNum);
            }
        }

        async function subscribeTxBlock() {
            subscriber.emitter.on(MessageType.NEW_BLOCK, (event: any) => {
              console.log('blocknum: ', event.value.TxBlock.header.BlockNum);
              console.log('dsblock: ', event.value.TxBlock.header.DSBlockNum);
              const blockNum = parseInt(event.value.TxBlock.header.BlockNum);
              const result = calculateBlocks(blockNum);
      
              if (mountedRef.current) {
                setCurrentBlockNum(blockNum.toString());
                setBlockCountToReward(result.blockCountdown);
                setExpectedBlockNum(result.expectedBlockNum);
              }
            });
      
            subscriber.emitter.on(MessageType.UNSUBSCRIBE, (event) => {
              console.log('get unsubscribe event: ', event);
            });
            await subscriber.start();
          }
      
          async function unsubscribeTxBlock() {
            await subscriber.stop();
          }

          loadInitialData();
          subscribeTxBlock();
      
          return () => {
            mountedRef.current = false;
            unsubscribeTxBlock();
          }
    }, [networkURL, calculateBlocks]);

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
                                    fontStyle={{ fontFamily: "Avenir Next LT Pro", fontSize: 22, fontWeight: 600 }}
                                    animateToNumber={currentBlockNum}
                                    config={{ tension: 120, friction: 17 }} />
                            </div>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Blocks Until Rewards</h3>
                            <div className="test d-flex justify-content-center">
                                <AnimatedNumber
                                    fontStyle={{ fontFamily: "Avenir Next LT Pro", fontSize: 22, fontWeight: 600 }}
                                    animateToNumber={blockCountToReward}
                                    config={{ tension: 120, friction: 17 }} />
                            </div>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Est. Reward Block Num.</h3>
                            <div className="d-flex justify-content-center">
                                <AnimatedNumber
                                    fontStyle={{ fontFamily: "Avenir Next LT Pro", fontSize: 22, fontWeight: 600 }}
                                    animateToNumber={expectedBlockNum}
                                    config={{ tension: 120, friction: 17 }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RewardCountdownTable;
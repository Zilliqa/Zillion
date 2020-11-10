import { Zilliqa } from '@zilliqa-js/zilliqa';
import React, { useState, useRef, useEffect } from 'react';

import * as ZilliqaAccount from '../account';
const { MessageType } = require('@zilliqa-js/subscriptions');


function RewardCountdownTable(props: any) {
    const networkURL = props.network;
    const mountedRef = useRef(true);

    // for populating rewards distribution countdown
    const [currentBlockNum, setCurrentBlockNum] = useState('0');
    const [expectedBlockNum, setExpectedBlockNum] = useState('0');
    const [blockCountToReward, setBlockCountToReward] = useState('1800');

    const calculateBlocks = (blockNum: number) => {
        let sampleRewardBlockNum = 858406;
        let rewardBlockCount = 1800;
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
    }

    useEffect(() => {


        const zilliqa = new Zilliqa(networkURL);
        const subscriber = zilliqa.subscriptionBuilder.buildNewBlockSubscriptions(
            'wss://api-ws.zilliqa.com',
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
    }, [networkURL]);

    return (
        <div id="stake-rewards-distribution" className="container">
            <div className="row p-4">
                <h2 className="mb-4">Stake Rewards Distribution</h2>

                <div className="col-12 align-items-center">
                    <div className="row pb-3 mx-auto justify-content-center">
                        <div className="d-block stake-rewards-card">
                            <h3>Current Block Num.</h3>
                            <span>{currentBlockNum}</span>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Blocks Until Rewards</h3>
                            <span>{blockCountToReward}</span>
                        </div>
                        <div className="d-block stake-rewards-card">
                            <h3>Est. Reward Block Num..</h3>
                            <span>{expectedBlockNum}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RewardCountdownTable;
interface ClaimedRewardModalData {
    ssnName: string,
    ssnAddress: string,
    rewards: string,
}

interface DelegateStakeModalData {
    ssnName: string,
    ssnAddress: string,
    commRate: string,
}

interface DelegStats {
    globalAPY: string,
    zilRewards: string,
    gzilRewards: string,
    gzilBalance: string,
    totalDeposits: string,
}

interface DelegStakingPortfolioStats {
    ssnName: string,
    ssnAddress: string,
    delegAmt: string,
    rewards: string,
}

interface OperatorStats {
    name: string
    stakeAmt: string,
    bufferedDeposits: string,
    commRate: string,
    commReward: string,
    delegNum: string,
    receiver: string,
}

interface SsnStats {
    address: string,
    name: string,
    apiUrl: string,
    stakeAmt: string,
    bufferedDeposits: string,
    commRate: string,
    commReward: string,
    delegNum: string,
    status: string,
}

interface NodeOptions {
    address: string,
    name: string,
    stakeAmt: string,
    delegNum: string,
    commRate: string,
}

interface TransferStakeModalData {
    ssnName: string,
    ssnAddress: string,
    delegAmt: string,
}

interface WithdrawStakeModalData {
    ssnName: string,
    ssnAddress: string,
    delegAmt: string,
}

export type {
    ClaimedRewardModalData,
    DelegateStakeModalData,
    DelegStats,
    DelegStakingPortfolioStats,
    NodeOptions,
    OperatorStats,
    SsnStats,
    TransferStakeModalData,
    WithdrawStakeModalData
}
interface DelegStats {
    lastCycleAPY: string,
    zilRewards: string,
    gzilRewards: string,
    gzilBalance: string,
    totalPendingWithdrawal: string,
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

interface NodeOptions {
    label: string,
    value: string,
}

export type {
    DelegStats,
    DelegStakingPortfolioStats,
    NodeOptions,
    OperatorStats,
}
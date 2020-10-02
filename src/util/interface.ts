interface DelegStats {
    globalAPY: string,
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

export type {
    DelegStats,
    DelegStakingPortfolioStats,
    NodeOptions,
    OperatorStats,
    SsnStats,
}
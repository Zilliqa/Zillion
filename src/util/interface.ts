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

export type {
    DelegStats,
    DelegStakingPortfolioStats
}
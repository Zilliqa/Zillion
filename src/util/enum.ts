export enum AccessMethod {
    PRIVATEKEY = "PRIVATEKEY",
    KEYSTORE = "KEYSTORE",
    MNEMONIC = "MNEMONIC",
    ZILPAY = "ZILPAY",
    MOONLET = "MOONLET",
    LEDGER = "LEDGER"
}


// all other constants
export enum Constants {
    MANUAL_REFRESH_DELAY=5000,
    REFRESH_RATE = 30000,
    DEFAULT_GAS_PRICE = 1000000000,
    MAX_GZIL_SUPPLY = 682550,
    TOTAL_REWARD_SEED_NODES = 1870000,
}

export enum Environment {
    DEV = "dev",
    PROD = "prod",
    STAGE = "stage"
}

export enum Explorer {
    DEVEX = "devex",
    VIEWBLOCK = "viewblock"
}

export enum LedgerIndex {
    DEFAULT = -1,
}

export enum Network {
    TESTNET = "testnet",
    MAINNET = "mainnet",
    ISOLATED_SERVER = "isolated_server",
    PRIVATE = "private"
}

export enum NetworkURL {
    TESTNET = "https://dev-api.zilliqa.com",
    MAINNET = "https://api.zilliqa.com",
    ISOLATED_SERVER = "https://zilliqa-isolated-server.zilliqa.com"
}

export enum OperationStatus {
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
    PENDING = "PENDING",
}

export enum PromiseArea {
    PROMISE_GET_BALANCE = "PROMISE_GET_BALANCE",
    PROMISE_GET_CONTRACT = "PROMISE_GET_CONTRACT",
    PROMISE_GET_DELEG_STATS = "PROMISE_GET_DELEG_STATS",
    PROMISE_GET_OPERATOR_STATS = "PROMISE_GET_OPERATOR_STATS",
    PROMISE_GET_PENDING_WITHDRAWAL = "PROMISE_GET_PENDING_WITHDRAWAL",
    PROMISE_GET_STAKE_PORTFOLIO = 'PROMISE_GET_STAKE_PORTFOLIO',
    PROMISE_GET_SSN_STATS = "PROMISE_GET_SSN_STATS",
    PROMISE_WITHDRAW_COMM = "PROMISE_WITHDRAW_COMM",
    PROMISE_LANDING_STATS = "PROMISE_LANDING_STATS",
}

export enum Role {
    DELEGATOR = "DELEGATOR",
    OPERATOR = "OPERATOR",
    NONE = "",
}

export enum SsnStatus {
    ACTIVE = "Active",
    INACTIVE = "Inactive"
}

export enum ProxyCalls {
    COMPLETE_WITHDRAWAL = "CompleteWithdrawal",
    DELEGATE_STAKE = "DelegateStake",
    REDELEGATE_STAKE = "ReDelegateStake",
    UPDATE_COMM = "UpdateComm",
    UPDATE_RECV_ADDR = "UpdateReceivingAddr",
    WITHDRAW_COMM = "WithdrawComm",
    WITHDRAW_STAKE_AMT = "WithdrawStakeAmt",
    WITHDRAW_STAKE_REWARDS = "WithdrawStakeRewards",
}

export enum TransactionType {
    CLAIM_REWRDS = "Claim Rewards",
    COMPLETE_STAKE_WITHDRAW = "Complete Stake Withdrawal",
    DELEGATE_STAKE = "Delegate Stake",
    INITIATE_STAKE_WITHDRAW = "Initiate Stake Withdrawal",
    TRANSFER_STAKE = "Transfer Stake",
    UPDATE_COMM_RATE = "Update Commission Rate",
    UPDATE_RECV_ADDR = "Update Receiving Address",
    WITHDRAW_COMM = "Withdraw Commission"
}

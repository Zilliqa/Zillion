export enum AccessMethod {
    PRIVATEKEY = "PRIVATEKEY",
    KEYSTORE = "KEYSTORE",
    MNEMONIC = "MNEMONIC",
    ZILPAY = "ZILPAY",
    MOONLET = "MOONLET",
    LEDGER = "LEDGER",
}

export enum Network {
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
    PROMISE_WITHDRAW_COMM = "PROMISE_WITHDRAW_COMM",
}

export enum Role {
    DELEGATOR = "DELEGATOR",
    OPERATOR = "OPERATOR",
    NONE = "",
}
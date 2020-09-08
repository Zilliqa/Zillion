# Zilliqa Staking Wallet App

## Startup

1. yarn

2. Tweak the settings in `public/config.js`
```
    networks_config: {
        testnet: {
            proxy: "<proxy_checksum_address>",
            blockchain: "https://dev-api.zilliqa.com",
        },
        mainnet: {
            proxy: "<proxy_checksum_address>",
            blockchain: "https://api.zilliqa.com",
        },
        isolated_server: {
            proxy: "<proxy_checksum_address>",
            blockchain: "https://zilliqa-isolated-server.zilliqa.com",
        }
    },
    blockchain_explorer_config: "https://devex.zilliqa.com",
    refresh_rate_config: 3000
``` 

3. For development, use `yarn dev` and browse to `https://localhost:3000/` it will enforce HTTPS due to ledger requirements.

4. On the home page, select the network. Next, select _Sign in as Delegators_ or _Sign in as Operators_

5. An operator can see "Staking Performance", "Other Staked Seed Nodes" whereas delegators can only see "Other Staked Seed Nodes"

6. Explore and execute any actions

7. If the contract details doesn't get update, click on the "Dashboard" wordings on the navigation bar to manually refresh


**Note**: The wallet app has no persistency for security concerns.
Do not refresh the browser, all statistics are retrieved at regular intervals configured by the settings.


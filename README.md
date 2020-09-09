# Zilliqa Staking Wallet App

## Getting Started

### Development
1. `yarn`

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

3. (Optional) If you are interested in using the isolated server, create a `.env` file in the parent project folder where `package.json` resides, example `%project_dir%/.env` with the variable:

```
REACT_APP_STAKEZ_ENV=dev
```

This enables the "Isolated Server" option in the network selection menu and disables authentications checks in the dashboard.

4. Execute `yarn dev` and browse to `https://localhost:3000/`. HTTPS is required due to hardware ledger support.

5. On the home page, select the network. Next, select _Sign in as Delegators_ or _Sign in as Operators_

6. An operator can see "Staking Performance", "Other Staked Seed Nodes" whereas delegators can only see "Other Staked Seed Nodes"

7. Explore and execute any actions

8. If the contract details doesn't get updated, click on the "Dashboard" wordings on the navigation bar to manually refresh


### Production

1. Follow Steps (1) and (2) as stated in **Development** section.

2. **DO NOT** set any `.env` file.

3. Assuming the hosted server is running `https`, execute `yarn start`.

4. Done.

## Caveats
The wallet app does not store your private keys or passphrases for privacy and security concerns. The wallet session object is disconnected upon refreshing the browser. We advise you to avoid refreshing the browser; all statistics are retrieved at regular intervals as configured by `config.js`.
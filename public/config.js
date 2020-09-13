/* config file
 *
 * blockchain_explorer_config: [viewblock (default) | devex]
 * - domain link to blockchain explorer
 * 
 * refresh_rate_config: [time in milliseconds]
 * - interval at which contract data and wallet's info are updated
 * 
 * production_config: [false (default) | true]
 *  - when set to false, allows isolated server, 
 *    and disables authentication checks
 * 
*/

window['config'] = {
    networks_config: {
        testnet: {
            proxy: "0x9f34364aa5FCA43a19d6792494F09C541a2a763A",
            blockchain: "https://dev-api.zilliqa.com",
        },
        mainnet: {
            proxy: "",
            blockchain: "https://api.zilliqa.com",
        },
        isolated_server: {
            proxy: "0x0578B8e9D9c2493D4a2E98f364c7ed311F7a0d71",
            blockchain: "https://zilliqa-isolated-server.zilliqa.com",
        }
    },
    blockchain_explorer_config: "viewblock",
    refresh_rate_config: 3000,
    production_config: false,
}

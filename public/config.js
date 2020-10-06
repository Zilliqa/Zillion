/* config file
 *
 * blockchain_explorer_config: [viewblock (default) | devex]
 * - domain link to blockchain explorer
 * 
 * refresh_rate_config: [time in milliseconds]
 * - interval at which contract data and wallet's info are updated
 * 
 * environment_config: [dev (default) | stage | prod]
 *  - when set to dev, allows users to change network on home page
 *    and disables authentication checks
 * 
 *  - when set to stage, blockchain is set to testnet
 * 
 *  - when set to prod, blockchain is set to mainnet
 * 
*/

window['config'] = {
    networks_config: {
        testnet: {
            proxy: "0xeeB4158d111dc9aC900ecd75168596289E0Bda02",
            impl: "0x81dA48797790CcE8A50B1475f372C22eFcDd9AeC",
            blockchain: "https://dev-api.zilliqa.com",
            node_status: "https://testnet-viewer.zilliqa.com",
        },
        mainnet: {
            proxy: "",
            impl: "",
            blockchain: "https://api.zilliqa.com",
            node_status: "https://staking-viewer.zilliqa.com",
        },
        isolated_server: {
            proxy: "0x0578B8e9D9c2493D4a2E98f364c7ed311F7a0d71",
            impl: "",
            blockchain: "https://zilliqa-isolated-server.zilliqa.com",
            node_status: "",
        }
    },
    blockchain_explorer_config: "viewblock",
    refresh_rate_config: 300000,
    environment_config: "stage"
}

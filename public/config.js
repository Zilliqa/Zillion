/* config file
 *
 * blockchain_explorer_config: [viewblock (default) | devex]
 * - domain link to blockchain explorer
 * 
 * node_status
 *  - link to staking viewer
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
 * api_max_retry_attempt
 * - maximum attempt to retry fetching contract data before giving up
 * 
 * api_retry_delay: [time in milliseconds]
 * - interval to wait before retrying to fetch the contract data
*/

window['config'] = {
    networks_config: {
        testnet: {
            proxy: "0x05d7e121E205A84Bf1da2D60aC8A2484800FfFB3",
            impl: "0x05C2DdeC2E4449160436130CB4F9b84dE9f7eE5b",
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
    api_max_retry_attempt: 10,
    api_retry_delay: 100,
    environment_config: "stage"
}

import React from 'react';


function Footer(props:any) {
    const networkLabel = props.networkLabel;

    // config.js from public folder
    const { networks_config } = (window as { [key: string]: any })['config'];
    
    return (
        <footer id="disclaimer" className="align-items-start">
            <div className="p-2 d-block">
                <span className="mx-3 align-middle">&copy; 2020 Zilliqa</span> 
                <button type="button" className="btn shadow-none" data-toggle="modal" data-target="#disclaimer-modal" data-keyboard="false" data-backdrop="static">Disclaimer</button>
                <a className="footer-link mx-3 align-middle" 
                    href={networks_config[networkLabel].node_status ?
                            networks_config[networkLabel].node_status : 
                            "https://zilliqa.com/"} target="_blank" rel="noopener noreferrer">Nodes Status</a>
            </div>
      </footer>
    );
}

export default Footer;


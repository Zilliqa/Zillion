import type Transport from "@ledgerhq/hw-transport";

const CLA = 0xe0;
const INS = {
    getVersion: 0x01,
    getPublicKey: 0x02,
    getPublicAddress: 0x02,
}

const PubKeyByteLen = 33;
const Bech32AddrLen = 'zil'.length + 1 + 32 + 6;


export default class Ledger {
    transport: Transport<any>;

    constructor(transport: Transport<any>, scrambleKey: string = "w0w") {
        this.transport = transport;
        transport.decorateAppAPIMethods(
            this,
            ["getVersion", "getPublicKey", "getPublicAddress"],
            scrambleKey
        );
    }

    getVersion() {
        const P1 = 0x00;
        const P2 = 0x00;

        return this.transport.send(CLA, INS.getVersion, P1, P2).then(response => {
            let version = 'v';
            for (let i = 0; i < 3; ++i) {
                version += parseInt('0x' + response[i]);
                if (i !== 2) {
                    version += ".";
                }
            }
            return { version };
        });
    }

    // index: index indicate by ledger, default: 0
    getPublicKey(index: number) {
        const P1 = 0x00;
        const P2 = 0x00;

        let payload = Buffer.alloc(4);
        payload.writeInt32LE(index, 0);

        return this.transport.send(CLA, INS.getPublicKey, P1, P2, payload).then(response => {
            // The first PubKeyByteLen bytes are the public address
            const publicKey = response.toString("hex").slice(0, PubKeyByteLen * 2);
            return { publicKey };
        });
    }

    // index: index indicate by ledger, default: 0
    getPublicAddress(index: number) {
        const P1 = 0x00;
        const P2 = 0x01;

        let payload = Buffer.alloc(4);
        payload.writeInt32LE(index, 0);

        return this.transport.send(CLA, INS.getPublicAddress, P1, P2, payload).then(response => {
            // After the first PubKeyByteLen bytes, the remaining is the bech32 address string.
            const pubAddr = response.slice(PubKeyByteLen, PubKeyByteLen + Bech32AddrLen).toString('utf-8');
            const pubKey = response.toString('hex').slice(0, PubKeyByteLen * 2);
            return { pubAddr, pubKey };
        });
    }
}
import crypto from 'node:crypto';
import fs from 'node:fs';

const BASE = 'https://api.cloudflareclient.com/v0a4005';
const H = { 'Content-Type': 'application/json; charset=UTF-8', 'User-Agent': 'okhttp/3.12.1', 'CF-Client-Version': 'a-6.30-3596' };

const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
const pub = publicKey.export({ type: 'spki', format: 'der' }).slice(-32).toString('base64');
const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32).toString('base64');

const r = await fetch(BASE + '/reg', {
  method: 'POST', headers: H,
  body: JSON.stringify({ key: pub, install_id: '', fcm_token: '', tos: new Date().toISOString(), model: 'PC', type: 'Windows', locale: 'en_US' }),
});
const j = await r.json();
if (!j.account) { console.log('FAIL ' + JSON.stringify(j)); process.exit(1); }

const peer = j.config.peers[0];
const conf = `[Interface]
PrivateKey = ${priv}
Address = ${j.config.interface.addresses.v4}/32
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = ${peer.public_key}
AllowedIPs = 0.0.0.0/0
Endpoint = ${peer.endpoint.host}
`;
fs.writeFileSync('/tmp/wg0.conf', conf);
console.log('LICENSE=' + j.account.license);
console.log('WARP_PLUS=' + j.account.warp_plus + ' PREMIUM_GB=' + j.account.premium_data);
console.log('ENDPOINT=' + peer.endpoint.host);
console.log('V4=' + j.config.interface.addresses.v4);

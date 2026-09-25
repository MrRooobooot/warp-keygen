import crypto from 'node:crypto';
import fs from 'node:fs';

const BASE = 'https://api.cloudflareclient.com/v0a4005';
const H = { 'Content-Type': 'application/json; charset=UTF-8', 'User-Agent': 'okhttp/3.12.1', 'CF-Client-Version': 'a-6.30-3596' };
const PEER = 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=';

const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
const pub = publicKey.export({ type: 'spki', format: 'der' }).slice(-32).toString('base64');
const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32).toString('base64');

const r = await fetch(BASE + '/reg', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ key: pub, install_id: '', fcm_token: '', tos: new Date().toISOString(), model: 'PC', type: 'Windows', locale: 'en_US' }),
});
const j = await r.json();
if (!j.account) { console.log('FAIL ' + JSON.stringify(j)); process.exit(1); }

const v4 = j.config.interface.addresses.v4;
const host = j.config.peers[0].endpoint.host;
const conf = `[Interface]
PrivateKey = ${priv}
Address = ${v4}/32
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = ${PEER}
AllowedIPs = 0.0.0.0/0
Endpoint = ${host}
`;

const out = {
  generated_at: new Date().toISOString(),
  license: j.account.license,
  warp_plus: j.account.warp_plus,
  premium_data: j.account.premium_data,
  account_type: j.account.account_type,
  expires: j.account.ttl,
  address: v4,
  endpoint: host,
  client_id: j.config.client_id,
  wireguard_conf: conf,
};
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/key.json', JSON.stringify(out, null, 2));
console.log('MINTED ' + out.license + ' warp_plus=' + out.warp_plus + ' expires=' + out.expires);

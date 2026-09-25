import crypto from 'node:crypto';

const BASE = process.env.BASE || 'https://api.cloudflareclient.com/v0a4005';
const H = {
  'Content-Type': 'application/json; charset=UTF-8',
  'User-Agent': 'okhttp/3.12.1',
  'CF-Client-Version': 'a-6.30-3596',
};
const BOOST = +(process.env.BOOST || 5);

function kp() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  return {
    pub: publicKey.export({ type: 'spki', format: 'der' }).slice(-32).toString('base64'),
    priv: privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32).toString('base64'),
  };
}

async function reg(referrer) {
  const { pub, priv } = kp();
  const body = {
    key: pub, install_id: '', fcm_token: '',
    tos: new Date().toISOString(), model: 'PC', type: 'Windows', locale: 'en_US',
  };
  if (referrer) body.referrer = referrer;
  const r = await fetch(BASE + '/reg', { method: 'POST', headers: H, body: JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) return { error: `HTTP ${r.status}`, body: t.slice(0, 400) };
  const j = JSON.parse(t);
  if (!j.result) { console.log('RAW=' + t.slice(0, 800)); return { raw: t.slice(0, 400) }; }
  return {
    id: j.result.id, token: j.result.token, private_key: priv,
    license: j.result.account?.license,
    premium_data: j.result.account?.premium_data,
    warp_plus: j.result.account?.warp_plus,
    account_type: j.result.account?.account_type,
    peer: j.result.config?.peers?.[0],
    addresses: j.result.config?.interface?.addresses,
    client_id: j.result.config?.client_id,
  };
}

async function account(id, token) {
  const r = await fetch(`${BASE}/reg/${id}/account`, { headers: { ...H, Authorization: 'Bearer ' + token } });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const a = (await r.json()).result;
  return {
    license: a.license, premium_data: a.premium_data, warp_plus: a.warp_plus,
    account_type: a.account_type, referral_count: a.referral_count, quota: a.quota, usage: a.usage,
  };
}

// 1) fresh identity
const me = await reg(null);
if (me.error) { console.log('REGISTER FAILED', JSON.stringify(me)); process.exit(1); }
console.log('TARGET_LICENSE=' + me.license);
console.log('BEFORE=' + JSON.stringify(await account(me.id, me.token)));

// 2) referral boost against own license
const results = [];
for (let i = 0; i < BOOST; i++) results.push(await reg(me.license));
console.log('BOOSTS ok=' + results.filter((r) => !r.error).length + '/' + BOOST);
const e = results.find((r) => r.error);
if (e) console.log('BOOST_ERR=' + JSON.stringify(e));

// 3) quota after
console.log('AFTER=' + JSON.stringify(await account(me.id, me.token)));
console.log('CONFIG=' + JSON.stringify({ private_key: me.private_key, peer: me.peer, addresses: me.addresses, client_id: me.client_id }, null, 1));

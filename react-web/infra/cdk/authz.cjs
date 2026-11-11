const https = require('https');
const fs = require('fs');

const BASE = 'https://95sc3qnpxd.execute-api.us-east-2.amazonaws.com';
const adminTok = fs.readFileSync('tadmin.txt', 'utf8').trim();
const collTok = fs.readFileSync('tcoll.txt', 'utf8').trim();

function req(method, path, token, bodyObj) {
  return new Promise((resolve) => {
    const data = bodyObj ? JSON.stringify(bodyObj) : null;
    const r = https.request(
      `${BASE}${path}`,
      { method, headers: { Authorization: token, 'content-type': 'application/json' } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode, body: b }));
      },
    );
    r.on('error', (e) => resolve({ status: 'ERR', body: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const out = [];
  // 1) Cobrador intenta aprobar un pago -> espera 403
  const payList = await req('GET', '/v1/tenants/t-demo/payments', adminTok);
  let anyPay = null;
  try {
    const parsed = JSON.parse(payList.body);
    anyPay = (parsed.data || []).find((p) => p.status === 'PENDING_REVIEW');
  } catch {}
  if (anyPay) {
    const r403 = await req('POST', `/v1/tenants/t-demo/payments/${anyPay.id}/review`, collTok, { approve: true });
    out.push(`COBRADOR review pago -> HTTP ${r403.status} (espera 403)`);
  } else {
    out.push('No hay pago PENDING_REVIEW para probar 403 (ok)');
  }

  // 2) Cobrador crea una gestión de cobranza -> espera 201
  const create = await req('POST', '/v1/tenants/t-demo/collection-activities', collTok, {
    loanId: 'L-2015',
    channel: 'CALL',
    result: 'Sin respuesta',
    notes: 'Reintentar en la tarde',
  });
  out.push(`COBRADOR crear gestion -> HTTP ${create.status} (espera 201)`);

  // 3) Listar gestiones del préstamo -> espera 200 con >=1
  const list = await req('GET', '/v1/tenants/t-demo/collection-activities/L-2015', collTok);
  out.push(`LISTAR gestiones L-2015 -> HTTP ${list.status}`);
  out.push(`body: ${list.body.slice(0, 220)}`);

  fs.writeFileSync('authz.log', out.join('\n') + '\nDONE');
})();

'use strict';

/**
 * API de la plataforma de préstamos sobre DynamoDB single-table.
 * Runtime Node.js 20 (AWS SDK v3 incluido, sin npm install en el paquete).
 *
 * Diseño single-table (ver ADR-0009):
 *   Tenant        PK=TENANT#<t>              SK=META
 *   Cliente       PK=TENANT#<t>              SK=CUSTOMER#<id>
 *   Solicitud     PK=TENANT#<t>              SK=APPLICATION#<id>
 *   Préstamo      PK=TENANT#<t>              SK=LOAN#<id>
 *   Cuota         PK=LOAN#<loanId>           SK=INSTALLMENT#<nnn>
 *   Ledger        PK=LOAN#<loanId>           SK=LEDGER#<ts>#<uuid>   (append-only)
 *   Pago          PK=TENANT#<t>              SK=PAYMENT#<id>   (+ GSI1 por préstamo)
 *   Auditoría     PK=LOAN#<loanId>           SK=AUDIT#<ts>#<uuid>
 *   Idempotencia  PK=IDEMPOTENCY#<key>       SK=IDEMPOTENCY#<key>
 *
 * Nota: iteración sin autenticación (se agrega Cognito authorizer en fase próxima).
 * El tenant se toma de la ruta para la demo.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.TABLE_NAME;
const ENV_NAME = process.env.ENV_NAME || 'dev';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

// ---------------- helpers HTTP ----------------
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Content-Type,Authorization,Idempotency-Key',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};
function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json', ...CORS }, body: JSON.stringify(body) };
}
function problem(status, title, detail) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/problem+json', ...CORS },
    body: JSON.stringify({ type: 'about:blank', title, status, detail }),
  };
}
function uid(p) {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
const nowIso = () => new Date().toISOString();

const ROLE_ORDER = ['PLATFORM_ADMIN', 'LENDER_ADMIN', 'LENDER_OPERATOR', 'COLLECTION_AGENT', 'CUSTOMER'];
function pickRole(groups) {
  return ROLE_ORDER.find((r) => (groups || []).includes(r)) || 'CUSTOMER';
}
// Roles autorizados para operaciones financieras sensibles (aprobar, desembolsar, ajustar, revisar).
const FINANCE_ROLES = ['PLATFORM_ADMIN', 'LENDER_ADMIN', 'LENDER_OPERATOR'];
function canFinance(auth) {
  return FINANCE_ROLES.includes(auth.role);
}

// ---------------- helpers DynamoDB ----------------
async function put(item, ensureNew = false) {
  const params = { TableName: TABLE, Item: item };
  if (ensureNew) params.ConditionExpression = 'attribute_not_exists(PK) AND attribute_not_exists(SK)';
  await ddb.send(new PutCommand(params));
  return item;
}
async function get(pk, sk) {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return res.Item || null;
}
async function queryByPrefix(pk, skPrefix) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': skPrefix },
    }),
  );
  return res.Items || [];
}
/**
 * Escribe varios ítems en una única transacción DynamoDB (TransactWriteItems).
 * Garantiza atomicidad: o se aplican todos los Put, o ninguno. Límite de 100 ítems.
 */
async function transactPut(items) {
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: items.map((Item) => ({ Put: { TableName: TABLE, Item } })),
    }),
  );
}
async function audit(loanId, action, actor, detail) {
  const ts = nowIso();
  await put({
    PK: `LOAN#${loanId}`,
    SK: `AUDIT#${ts}#${uid('a')}`,
    entity: 'audit',
    loanId,
    action,
    actor: actor || 'sistema',
    detail: detail || null,
    at: ts,
  });
}

// ---------------- proyecciones (item -> DTO) ----------------
const toCustomer = (it) => ({ id: it.id, tenantId: it.tenantId, name: it.name, document: it.document, email: it.email, phone: it.phone, status: it.status, activeLoans: it.activeLoans || 0, punctuality: it.punctuality ?? 1 });
const toApplication = (it) => ({ id: it.id, customerName: it.customerName, amount: it.amount, termMonths: it.termMonths, frequency: it.frequency, purpose: it.purpose, status: it.status, submittedAt: it.submittedAt });
const toLoan = (it) => ({ id: it.id, customerName: it.customerName, principal: it.principal, outstanding: it.outstanding, rate: it.rate, frequency: it.frequency, status: it.status, nextDueDate: it.nextDueDate, overdueDays: it.overdueDays || 0 });
const toInstallment = (it) => ({ id: it.id, number: it.number, dueDate: it.dueDate, principal: it.principal, interest: it.interest, fees: it.fees, total: it.total, balance: it.balance, status: it.status, overdueDays: it.overdueDays || 0 });
const toPayment = (it) => ({ id: it.id, loanId: it.loanId, amount: it.amount, channel: it.channel, status: it.status, reference: it.reference, createdAt: it.createdAt, registeredBy: it.registeredBy });
const toLedger = (it) => ({ id: it.id, loanId: it.loanId, date: it.date, concept: it.concept, account: it.account, debit: it.debit || 0, credit: it.credit || 0, balance: it.balance });
const toAudit = (it) => ({ id: it.SK, entity: it.entity, entityId: it.loanId, action: it.action, actor: it.actor, at: it.at, detail: it.detail });
const toActivity = (it) => ({ id: it.id, loanId: it.loanId, installmentId: it.installmentId, channel: it.channel, result: it.result, notes: it.notes, promiseDate: it.promiseDate, nextActionAt: it.nextActionAt, createdAt: it.createdAt, createdBy: it.createdBy });

// ---------------- handler principal ----------------
exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Claims del JWT (cuando la ruta pasa por el authorizer de Cognito).
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const actorEmail = claims.email || claims['cognito:username'] || 'sistema';
  // Los grupos pueden venir como array o como string "[A B]"; normalizamos.
  let groups = claims['cognito:groups'] || [];
  if (typeof groups === 'string') groups = groups.replace(/[[\]]/g, '').split(/[ ,]+/).filter(Boolean);
  const auth = { email: actorEmail, groups, role: pickRole(groups) };

  const rawPath = (event.rawPath || event.path || '').replace(/\/+$/, '');
  const path = rawPath.replace(/^\/v1/, '') || '/';
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return problem(400, 'JSON inválido', 'El cuerpo no es JSON válido.');
  }

  try {
    // Health
    if (method === 'GET' && (path === '/health' || path === '/')) {
      return json(200, { status: 'ok', env: ENV_NAME, service: 'plataforma-api', time: nowIso() });
    }

    // Seed (solo dev)
    if (method === 'POST' && path === '/dev/seed') {
      return await seed(body.tenantId || 't-demo');
    }

    const seg = path.split('/').filter(Boolean); // sin vacíos

    // /tenants/{t}/...
    if (seg[0] === 'tenants' && seg[1]) {
      const tenantId = decodeURIComponent(seg[1]);
      const rest = seg.slice(2);
      return await routeTenant(method, tenantId, rest, body, auth);
    }

    // /admin/dashboard?tenantId=
    if (seg[0] === 'admin' && seg[1] === 'dashboard') {
      const tenantId = event.queryStringParameters?.tenantId || 't-demo';
      return await dashboard(tenantId);
    }

    return problem(404, 'No encontrado', `Ruta no soportada: ${method} ${path}`);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return problem(409, 'Conflicto', 'La operación no cumple una condición (idempotencia o estado).');
    }
    console.error('Error:', err?.message || err);
    return problem(500, 'Error interno', 'Ocurrió un error procesando la solicitud.');
  }
};

// ---------------- router por tenant ----------------
async function routeTenant(method, tenantId, rest, body, auth) {
  const [resource, id, sub, subId] = rest;
  const forbidFinance = () =>
    problem(403, 'Sin permiso', `El rol ${auth.role} no puede ejecutar operaciones financieras.`);

  // ---- customers ----
  if (resource === 'customers') {
    if (!id && method === 'GET') {
      const items = (await queryByPrefix(`TENANT#${tenantId}`, 'CUSTOMER#')).filter((it) => !it.deleted);
      return json(200, { data: items.map(toCustomer), meta: { total: items.length } });
    }
    if (!id && method === 'POST') {
      if (!body.name || !body.document) return problem(400, 'Datos incompletos', 'name y document son obligatorios.');
      const cid = uid('cus');
      const item = {
        PK: `TENANT#${tenantId}`, SK: `CUSTOMER#${cid}`,
        GSI1PK: `CUSTOMER#${cid}`, GSI1SK: `TENANT#${tenantId}`,
        entity: 'customer', id: cid, tenantId,
        name: body.name, document: body.document, email: body.email || null, phone: body.phone || null,
        status: 'PENDING', activeLoans: 0, punctuality: 1, createdAt: nowIso(),
      };
      await put(item, true);
      return json(201, toCustomer(item));
    }
    if (id && method === 'PATCH') {
      const existing = await get(`TENANT#${tenantId}`, `CUSTOMER#${id}`);
      if (!existing) return problem(404, 'No encontrado', 'Cliente no existe.');
      const fields = ['name', 'email', 'phone', 'status'];
      const updates = {};
      for (const f of fields) if (body[f] !== undefined) updates[f] = body[f];
      const merged = { ...existing, ...updates };
      await put(merged);
      return json(200, toCustomer(merged));
    }
    if (id && method === 'DELETE') {
      // Soft-delete: marca deleted=true, no borra el ítem.
      const existing = await get(`TENANT#${tenantId}`, `CUSTOMER#${id}`);
      if (!existing) return problem(404, 'No encontrado', 'Cliente no existe.');
      await put({ ...existing, deleted: true, deletedAt: nowIso() });
      return { statusCode: 204, headers: CORS, body: '' };
    }
  }

  // ---- loan-applications ----
  if (resource === 'loan-applications') {
    if (!id && method === 'GET') {
      const items = await queryByPrefix(`TENANT#${tenantId}`, 'APPLICATION#');
      return json(200, { data: items.map(toApplication), meta: { total: items.length } });
    }
    if (!id && method === 'POST') {
      if (!body.amount || !body.termMonths || !body.frequency) return problem(400, 'Datos incompletos', 'amount, termMonths y frequency son obligatorios.');
      const aid = uid('app');
      const item = {
        PK: `TENANT#${tenantId}`, SK: `APPLICATION#${aid}`, entity: 'application',
        id: aid, tenantId, customerName: body.customerName || 'Cliente',
        amount: body.amount, termMonths: body.termMonths, frequency: body.frequency,
        purpose: body.purpose || null, status: 'SUBMITTED', submittedAt: nowIso(),
      };
      await put(item, true);
      return json(201, toApplication(item));
    }
    if (id && sub === 'approve' && method === 'POST') {
      if (!canFinance(auth)) return forbidFinance();
      const app = await get(`TENANT#${tenantId}`, `APPLICATION#${id}`);
      if (!app) return problem(404, 'No encontrado', 'Solicitud no existe.');
      app.status = 'APPROVED';
      app.monthlyRate = body.monthlyRate ?? null;
      await put(app);
      // Crea el préstamo en PENDING_DISBURSEMENT (snapshot de condiciones).
      const lid = `L-${Date.now().toString().slice(-6)}`;
      const loan = {
        PK: `TENANT#${tenantId}`, SK: `LOAN#${lid}`,
        GSI1PK: `LOAN#${lid}`, GSI1SK: `TENANT#${tenantId}`,
        entity: 'loan', id: lid, tenantId, customerName: app.customerName,
        principal: app.amount, outstanding: app.amount, rate: body.monthlyRate ?? 0.022,
        frequency: app.frequency, status: 'PENDING_DISBURSEMENT',
        nextDueDate: nowIso(), overdueDays: 0, applicationId: id, createdAt: nowIso(),
      };
      await put(loan, true);
      await audit(lid, 'Solicitud aprobada', 'Prestamista', `Tasa ${body.monthlyRate ?? 0.022}`);
      return json(200, { application: toApplication(app), loanId: lid });
    }
    if (id && sub === 'reject' && method === 'POST') {
      if (!canFinance(auth)) return forbidFinance();
      const app = await get(`TENANT#${tenantId}`, `APPLICATION#${id}`);
      if (!app) return problem(404, 'No encontrado', 'Solicitud no existe.');
      app.status = 'REJECTED';
      app.rejectReason = body.reason || null;
      await put(app);
      return json(200, toApplication(app));
    }
  }

  // ---- loans ----
  if (resource === 'loans') {
    if (!id && method === 'GET') {
      const items = await queryByPrefix(`TENANT#${tenantId}`, 'LOAN#');
      return json(200, { data: items.map(toLoan), meta: { total: items.length } });
    }
    if (id && !sub && method === 'GET') {
      const loan = await get(`TENANT#${tenantId}`, `LOAN#${id}`);
      if (!loan) return problem(404, 'No encontrado', 'Préstamo no existe.');
      return json(200, toLoan(loan));
    }
    if (id && sub === 'installments' && method === 'GET') {
      const items = await queryByPrefix(`LOAN#${id}`, 'INSTALLMENT#');
      return json(200, items.map(toInstallment));
    }
    if (id && sub === 'ledger' && method === 'GET') {
      const items = await queryByPrefix(`LOAN#${id}`, 'LEDGER#');
      return json(200, items.map(toLedger));
    }
    if (id && sub === 'audit' && method === 'GET') {
      const items = await queryByPrefix(`LOAN#${id}`, 'AUDIT#');
      return json(200, items.map(toAudit));
    }
    if (id && sub === 'disburse' && method === 'POST') {
      if (!canFinance(auth)) return forbidFinance();
      const loan = await get(`TENANT#${tenantId}`, `LOAN#${id}`);
      if (!loan) return problem(404, 'No encontrado', 'Préstamo no existe.');
      if (loan.status !== 'PENDING_DISBURSEMENT') {
        return problem(409, 'Estado inválido', 'El préstamo no está pendiente de desembolso.');
      }
      loan.status = 'ACTIVE';
      const ts = nowIso();
      // Atómico: estado del préstamo + movimiento de ledger + auditoría en una transacción.
      await transactPut([
        loan,
        {
          PK: `LOAN#${id}`, SK: `LEDGER#${ts}#${uid('le')}`, entity: 'ledger', id: uid('le'),
          loanId: id, date: ts, concept: 'Desembolso', account: 'CAPITAL',
          debit: loan.principal, credit: 0, balance: loan.principal,
        },
        {
          PK: `LOAN#${id}`, SK: `AUDIT#${ts}#${uid('a')}`, entity: 'audit', loanId: id,
          action: 'Desembolso registrado', actor: 'Prestamista',
          detail: `${body.method || 'TRANSFER'} · ${body.reference || 's/ref'}`, at: ts,
        },
      ]);
      return json(200, toLoan(loan));
    }
    if (id && sub === 'payments' && subId === 'manual' && method === 'POST') {
      return await registerManual(tenantId, id, body, body.registeredBy || 'Prestamista');
    }
    if (id && sub === 'adjustments' && method === 'POST') {
      if (!canFinance(auth)) return forbidFinance();
      if (!body.concept || body.amount === undefined || !body.reason) return problem(400, 'Datos incompletos', 'concept, amount y reason son obligatorios.');
      const ts = nowIso();
      const prev = (await queryByPrefix(`LOAN#${id}`, 'LEDGER#')).slice(-1)[0];
      const prevBalance = prev ? prev.balance : 0;
      await put({
        PK: `LOAN#${id}`, SK: `LEDGER#${ts}#${uid('le')}`, entity: 'ledger', id: uid('le'),
        loanId: id, date: ts, concept: `Ajuste: ${body.concept}`, account: 'CARGOS',
        debit: body.amount > 0 ? body.amount : 0, credit: body.amount < 0 ? -body.amount : 0,
        balance: prevBalance + body.amount,
      });
      await audit(id, 'Ajuste de ledger', 'Prestamista', `${body.concept} · ${body.reason}`);
      return json(201, { ok: true });
    }
  }

  // ---- payments (nivel tenant) ----
  if (resource === 'payments') {
    if (!id && method === 'GET') {
      const items = await queryByPrefix(`TENANT#${tenantId}`, 'PAYMENT#');
      return json(200, { data: items.map(toPayment), meta: { total: items.length } });
    }
    if (id && sub === 'review' && method === 'POST') {
      if (!canFinance(auth)) return forbidFinance();
      const pay = await get(`TENANT#${tenantId}`, `PAYMENT#${id}`);
      if (!pay) return problem(404, 'No encontrado', 'Pago no existe.');
      if (pay.status !== 'PENDING_REVIEW') {
        return problem(409, 'Estado inválido', 'El pago ya fue resuelto.');
      }
      const ts = nowIso();
      pay.status = body.approve ? 'APPROVED' : 'DECLINED';

      if (body.approve) {
        // Aprobar impacta el ledger: pago + movimiento + auditoría en una transacción atómica.
        const prev = (await queryByPrefix(`LOAN#${pay.loanId}`, 'LEDGER#')).slice(-1)[0];
        const prevBalance = prev ? prev.balance : 0;
        await transactPut([
          pay,
          {
            PK: `LOAN#${pay.loanId}`, SK: `LEDGER#${ts}#${uid('le')}`, entity: 'ledger', id: uid('le'),
            loanId: pay.loanId, date: ts, concept: `Pago ${pay.channel} ${pay.reference}`, account: 'CAPITAL',
            debit: 0, credit: pay.amount, balance: Math.max(0, prevBalance - pay.amount),
          },
          {
            PK: `LOAN#${pay.loanId}`, SK: `AUDIT#${ts}#${uid('a')}`, entity: 'audit', loanId: pay.loanId,
            action: 'Pago aprobado y aplicado al ledger', actor: 'Prestamista',
            detail: `${pay.channel} · ${pay.reference}`, at: ts,
          },
        ]);
      } else {
        await transactPut([
          pay,
          {
            PK: `LOAN#${pay.loanId}`, SK: `AUDIT#${ts}#${uid('a')}`, entity: 'audit', loanId: pay.loanId,
            action: 'Pago rechazado', actor: 'Prestamista', detail: `${pay.channel} · ${pay.reference}`, at: ts,
          },
        ]);
      }
      return json(200, toPayment(pay));
    }
  }

  // ---- collection-activities (gestiones de cobranza, append-only) ----
  if (resource === 'collection-activities') {
    if (method === 'GET') {
      // Lista por préstamo (query ?loanId= viene en el id posicional de la demo:
      // /tenants/{t}/collection-activities/{loanId}) o todas si no se especifica.
      if (id) {
        const items = await queryByPrefix(`LOAN#${id}`, 'ACTIVITY#');
        return json(200, items.map(toActivity));
      }
      return json(200, []);
    }
    if (method === 'POST') {
      if (!body.loanId || !body.channel || !body.result) {
        return problem(400, 'Datos incompletos', 'loanId, channel y result son obligatorios.');
      }
      const ts = nowIso();
      const item = {
        PK: `LOAN#${body.loanId}`, SK: `ACTIVITY#${ts}#${uid('ca')}`,
        entity: 'activity', id: uid('ca'), tenantId, loanId: body.loanId,
        installmentId: body.installmentId || null, channel: body.channel, result: body.result,
        notes: body.notes || null, promiseDate: body.promiseDate || null,
        nextActionAt: body.nextActionAt || null, createdAt: ts, createdBy: auth.email,
      };
      await put(item, true);
      return json(201, toActivity(item));
    }
  }

  return problem(404, 'No encontrado', `Ruta de tenant no soportada: ${method} /${rest.join('/')}`);
}

// Registrar pago manual (PENDING_REVIEW, no impacta ledger hasta aprobar).
async function registerManual(tenantId, loanId, body, registeredBy) {
  if (!body.amount || body.amount <= 0) return problem(400, 'Monto inválido', 'amount debe ser mayor a cero.');
  const pid = uid('pay');
  const item = {
    PK: `TENANT#${tenantId}`, SK: `PAYMENT#${pid}`,
    GSI1PK: `LOAN#${loanId}`, GSI1SK: `PAYMENT#${pid}`,
    entity: 'payment', id: pid, tenantId, loanId,
    amount: body.amount, channel: body.channel || 'CASH', status: 'PENDING_REVIEW',
    reference: body.reference || `${(body.channel || 'CASH') === 'CASH' ? 'CAJA' : 'TRF'}-${Date.now().toString().slice(-4)}`,
    createdAt: nowIso(), registeredBy,
  };
  await put(item, true);
  await audit(loanId, 'Pago manual registrado (en revisión)', registeredBy, `${item.channel} · ${item.reference}`);
  return json(201, toPayment(item));
}

// ---------------- dashboard ----------------
async function dashboard(tenantId) {
  const loans = (await queryByPrefix(`TENANT#${tenantId}`, 'LOAN#')).map(toLoan);
  const payments = (await queryByPrefix(`TENANT#${tenantId}`, 'PAYMENT#')).map(toPayment);
  const colocado = loans.reduce((s, l) => s + (l.status !== 'PENDING_DISBURSEMENT' ? l.outstanding : 0), 0);
  const recuperado = payments.filter((p) => p.status === 'APPROVED').reduce((s, p) => s + p.amount, 0);
  const vencida = loans.filter((l) => l.overdueDays > 0).reduce((s, l) => s + l.outstanding, 0);
  return json(200, {
    capitalColocado: colocado,
    capitalRecuperado: recuperado,
    carteraPorCobrar: loans.reduce((s, l) => s + l.outstanding, 0),
    carteraVencida: vencida,
    prestamosActivos: loans.filter((l) => l.status === 'ACTIVE').length,
    prestamosLiquidados: loans.filter((l) => l.status === 'PAID_OFF').length,
    prestamosEnMora: loans.filter((l) => l.status === 'DEFAULTED' || l.overdueDays > 0).length,
  });
}

// ---------------- seed de datos demo ----------------
async function seed(tenantId) {
  await put({ PK: `TENANT#${tenantId}`, SK: 'META', entity: 'tenant', id: tenantId, name: 'Prestamista Demo', createdAt: nowIso() });

  const customers = [
    { name: 'María Fernanda López', document: 'CC 1.012.345.678', email: 'maria.lopez@mail.com', phone: '+57 310 555 1201', status: 'ACTIVE', activeLoans: 1, punctuality: 0.97 },
    { name: 'Carlos Andrés Ruiz', document: 'CC 79.845.112', email: 'carlos.ruiz@mail.com', phone: '+57 320 555 8842', status: 'ACTIVE', activeLoans: 1, punctuality: 0.81 },
    { name: 'Luisa Gómez Peña', document: 'CC 52.233.991', email: 'luisa.gomez@mail.com', phone: '+57 315 555 3390', status: 'PENDING', activeLoans: 0, punctuality: 1 },
    { name: 'Jorge Mendoza', document: 'CC 80.112.667', email: 'jorge.m@mail.com', phone: '+57 301 555 7712', status: 'ACTIVE', activeLoans: 1, punctuality: 0.62 },
  ];
  for (const c of customers) {
    const cid = uid('cus');
    await put({ PK: `TENANT#${tenantId}`, SK: `CUSTOMER#${cid}`, GSI1PK: `CUSTOMER#${cid}`, GSI1SK: `TENANT#${tenantId}`, entity: 'customer', id: cid, tenantId, ...c, createdAt: nowIso() });
  }

  const apps = [
    { customerName: 'Luisa Gómez Peña', amount: 3000000, termMonths: 12, frequency: 'MONTHLY', purpose: 'Capital de trabajo', status: 'IN_REVIEW' },
    { customerName: 'Carlos Andrés Ruiz', amount: 1500000, termMonths: 6, frequency: 'BIWEEKLY', status: 'SUBMITTED' },
  ];
  for (const a of apps) {
    const aid = uid('app');
    await put({ PK: `TENANT#${tenantId}`, SK: `APPLICATION#${aid}`, entity: 'application', id: aid, tenantId, ...a, submittedAt: nowIso() });
  }

  const loans = [
    { id: 'L-2041', customerName: 'María Fernanda López', principal: 5000000, outstanding: 4202000, rate: 0.022, frequency: 'MONTHLY', status: 'ACTIVE', overdueDays: 0 },
    { id: 'L-2015', customerName: 'Jorge Mendoza', principal: 800000, outstanding: 640000, rate: 0.03, frequency: 'WEEKLY', status: 'DEFAULTED', overdueDays: 8 },
    { id: 'L-2050', customerName: 'Andrés Felipe Soto', principal: 3500000, outstanding: 3500000, rate: 0.024, frequency: 'MONTHLY', status: 'PENDING_DISBURSEMENT', overdueDays: 0 },
  ];
  for (const l of loans) {
    await put({ PK: `TENANT#${tenantId}`, SK: `LOAN#${l.id}`, GSI1PK: `LOAN#${l.id}`, GSI1SK: `TENANT#${tenantId}`, entity: 'loan', tenantId, nextDueDate: nowIso(), ...l, createdAt: nowIso() });
  }

  // Cuotas e historial para L-2041
  const inst = [
    { number: 1, principal: 260000, interest: 110000, fees: 0, total: 370000, balance: 4740000, status: 'PAID' },
    { number: 2, principal: 266000, interest: 104000, fees: 0, total: 370000, balance: 4474000, status: 'PAID' },
    { number: 3, principal: 272000, interest: 98000, fees: 0, total: 370000, balance: 4202000, status: 'PENDING' },
    { number: 4, principal: 278000, interest: 92000, fees: 0, total: 370000, balance: 3924000, status: 'PENDING' },
  ];
  for (const i of inst) {
    await put({ PK: 'LOAN#L-2041', SK: `INSTALLMENT#${String(i.number).padStart(3, '0')}`, entity: 'installment', id: `i${i.number}`, loanId: 'L-2041', dueDate: nowIso(), overdueDays: 0, ...i });
  }
  await put({ PK: 'LOAN#L-2041', SK: `LEDGER#2026-08-20T00:00:00Z#${uid('le')}`, entity: 'ledger', id: uid('le'), loanId: 'L-2041', date: '2026-08-20T00:00:00Z', concept: 'Desembolso', account: 'CAPITAL', debit: 5000000, credit: 0, balance: 5000000 });

  // Pagos manuales en revisión
  const pays = [
    { loanId: 'L-2015', amount: 160000, channel: 'TRANSFER', reference: 'TRF-55120', registeredBy: 'Pedro Cobrador' },
    { loanId: 'L-2041', amount: 370000, channel: 'CASH', reference: 'CAJA-0912', registeredBy: 'Pedro Cobrador' },
  ];
  for (const p of pays) {
    const pid = uid('pay');
    await put({ PK: `TENANT#${tenantId}`, SK: `PAYMENT#${pid}`, GSI1PK: `LOAN#${p.loanId}`, GSI1SK: `PAYMENT#${pid}`, entity: 'payment', id: pid, tenantId, status: 'PENDING_REVIEW', createdAt: nowIso(), ...p });
  }

  return json(200, { ok: true, tenantId, message: 'Datos de ejemplo creados.' });
}

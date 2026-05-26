// ═══════════════════════════════════════════════════════════════
//  DeliveryApp — Cloudflare Worker (API Backend)
//  Banco: Cloudflare D1 (SQLite serverless)
// ═══════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── AUTH ─────────────────────────────────────────────────────────
async function authMiddleware(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  // Token = base64(userId:timestamp)
  try {
    const decoded = atob(token);
    const [userId] = decoded.split(':');
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND active = 1').bind(userId).first();
    return user || null;
  } catch {
    return null;
  }
}

function makeToken(userId) {
  return btoa(`${userId}:${Date.now()}`);
}

// ── ROUTER ────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── AUTH ROUTES (public) ──────────────────────────────────────
    if (path === '/api/login' && method === 'POST') {
      const { userId, password } = await request.json();
      if (!userId || !password) return err('Dados incompletos');
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ? AND password = ? AND active = 1'
      ).bind(userId, password).first();
      if (!user) return err('Usuário ou senha incorretos', 401);
      const token = makeToken(user.id);
      return json({ token, user: { id: user.id, name: user.name, role: user.role } });
    }

    // ── PROTECTED ROUTES ──────────────────────────────────────────
    const user = await authMiddleware(request, env);
    if (!user && path.startsWith('/api/') && path !== '/api/login') {
      return err('Não autorizado', 401);
    }

    // ── USERS ─────────────────────────────────────────────────────
    if (path === '/api/users' && method === 'GET') {
      const rows = await env.DB.prepare('SELECT id,name,role,active,created_at FROM users ORDER BY role,name').all();
      return json(rows.results);
    }
    if (path === '/api/users' && method === 'POST') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const { name, password, role } = await request.json();
      if (!name || !password || !role) return err('Dados incompletos');
      const id = 'u' + Date.now();
      await env.DB.prepare('INSERT INTO users(id,name,password,role,active,created_at) VALUES(?,?,?,?,1,datetime("now"))').bind(id, name, password, role).run();
      return json({ id, name, role, active: 1 });
    }
    if (path.match(/^\/api\/users\/\w+$/) && method === 'PUT') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      const { name, password, role, active } = await request.json();
      if (password) {
        await env.DB.prepare('UPDATE users SET name=?,password=?,role=?,active=? WHERE id=?').bind(name, password, role, active ?? 1, id).run();
      } else {
        await env.DB.prepare('UPDATE users SET name=?,role=?,active=? WHERE id=?').bind(name, role, active ?? 1, id).run();
      }
      return json({ ok: true });
    }
    if (path.match(/^\/api\/users\/\w+$/) && method === 'DELETE') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      if (id === user.id) return err('Não pode excluir a si mesmo');
      await env.DB.prepare('DELETE FROM users WHERE id=?').bind(id).run();
      return json({ ok: true });
    }

    // ── BRANCHES ──────────────────────────────────────────────────
    if (path === '/api/branches' && method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM branches ORDER BY name').all();
      return json(rows.results);
    }
    if (path === '/api/branches' && method === 'POST') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const b = await request.json();
      const id = 'b' + Date.now();
      await env.DB.prepare('INSERT INTO branches(id,name,street,number,complement,neighborhood,city,state,zip,phone,color,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime("now"))').bind(id, b.name, b.street, b.number, b.complement || '', b.neighborhood, b.city, b.state, b.zip || '', b.phone || '', b.color || '#2563EB').run();
      return json({ id, ...b });
    }
    if (path.match(/^\/api\/branches\/\w+$/) && method === 'PUT') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      const b = await request.json();
      await env.DB.prepare('UPDATE branches SET name=?,street=?,number=?,complement=?,neighborhood=?,city=?,state=?,zip=?,phone=?,color=? WHERE id=?').bind(b.name, b.street, b.number, b.complement || '', b.neighborhood, b.city, b.state, b.zip || '', b.phone || '', b.color || '#2563EB', id).run();
      return json({ ok: true });
    }
    if (path.match(/^\/api\/branches\/\w+$/) && method === 'DELETE') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      const linked = await env.DB.prepare('SELECT COUNT(*) as c FROM deliveries WHERE branch_id=?').bind(id).first();
      if (linked.c > 0) return err('Filial possui pedidos vinculados');
      await env.DB.prepare('DELETE FROM branches WHERE id=?').bind(id).run();
      return json({ ok: true });
    }

    // ── DELIVERIES ────────────────────────────────────────────────
    if (path === '/api/deliveries' && method === 'GET') {
      let query = '';
      let params = [];
      if (user.role === 'vendedor') {
        query = 'SELECT d.*, b.name as branch_name, b.color as branch_color FROM deliveries d LEFT JOIN branches b ON d.branch_id=b.id WHERE d.seller_id=? ORDER BY d.created_at DESC';
        params = [user.id];
      } else if (user.role === 'entregador' || user.role === 'apoio') {
        query = 'SELECT d.*, b.name as branch_name, b.color as branch_color FROM deliveries d LEFT JOIN branches b ON d.branch_id=b.id WHERE d.deliverer_id=? ORDER BY d.created_at DESC';
        params = [user.id];
      } else {
        query = 'SELECT d.*, b.name as branch_name, b.color as branch_color FROM deliveries d LEFT JOIN branches b ON d.branch_id=b.id ORDER BY d.created_at DESC';
      }
      const rows = await env.DB.prepare(query).bind(...params).all();
      // Parse status_history JSON
      const deliveries = rows.results.map(d => ({
        ...d,
        statusHistory: JSON.parse(d.status_history || '[]'),
      }));
      return json(deliveries);
    }

    if (path === '/api/deliveries' && method === 'POST') {
      if (user.role !== 'admin' && user.role !== 'vendedor') return err('Sem permissão', 403);
      const d = await request.json();

      // Get next order number
      const last = await env.DB.prepare('SELECT MAX(order_num) as m FROM deliveries').first();
      const orderNum = (last.m || 0) + 1;
      const id = 'del' + Date.now();
      const now = new Date().toISOString();
      const history = JSON.stringify([{ status: 'criado', changedAt: now, changedBy: user.name }]);

      await env.DB.prepare(`
        INSERT INTO deliveries(
          id,order_num,created_at,status,status_history,
          customer_name,customer_phone1,customer_phone2,
          addr_street,addr_number,addr_complement,addr_neighborhood,addr_city,addr_state,addr_zip,
          notes,priority,payment_method,change_for,store_order_num,volumes,
          branch_id,seller_id,seller_name,deliverer_id,deliverer_name
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        id, orderNum, now, 'criado', history,
        d.customerName, d.phone1, d.phone2 || '',
        d.street, d.number, d.complement || '', d.neighborhood, d.city, d.state, d.zip || '',
        d.notes || '', d.priority || 'Normal', d.paymentMethod, d.changeFor || '', d.storeOrderNum || '', d.volumes || 1,
        d.branchId, user.id, user.name, '', ''
      ).run();

      return json({ id, orderNum, status: 'criado' });
    }

    if (path.match(/^\/api\/deliveries\/[\w]+\/status$/) && method === 'PUT') {
      const id = path.split('/')[3];
      const { status } = await request.json();
      const del = await env.DB.prepare('SELECT * FROM deliveries WHERE id=?').bind(id).first();
      if (!del) return err('Pedido não encontrado', 404);
      const history = JSON.parse(del.status_history || '[]');
      history.push({ status, changedAt: new Date().toISOString(), changedBy: user.name });
      await env.DB.prepare('UPDATE deliveries SET status=?,status_history=? WHERE id=?').bind(status, JSON.stringify(history), id).run();
      return json({ ok: true, status });
    }

    if (path.match(/^\/api\/deliveries\/[\w]+\/assign$/) && method === 'PUT') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      const { delivererId } = await request.json();
      const deliverer = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(delivererId).first();
      if (!deliverer) return err('Entregador não encontrado');
      const del = await env.DB.prepare('SELECT * FROM deliveries WHERE id=?').bind(id).first();
      const history = JSON.parse(del.status_history || '[]');
      history.push({ status: del.status, changedAt: new Date().toISOString(), changedBy: user.name, note: `Entregador: ${deliverer.name}` });
      await env.DB.prepare('UPDATE deliveries SET deliverer_id=?,deliverer_name=?,status_history=? WHERE id=?').bind(delivererId, deliverer.name, JSON.stringify(history), id).run();
      return json({ ok: true, delivererName: deliverer.name });
    }

    if (path.match(/^\/api\/deliveries\/[\w]+$/) && method === 'DELETE') {
      if (user.role !== 'admin') return err('Sem permissão', 403);
      const id = path.split('/')[3];
      await env.DB.prepare('DELETE FROM deliveries WHERE id=?').bind(id).run();
      return json({ ok: true });
    }

    return err('Rota não encontrada', 404);
  },
};

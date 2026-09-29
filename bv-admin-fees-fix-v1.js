/* BRASABOX — ADMIN TAXA DE ENTREGA FIX v1 */
(() => {
  'use strict';
  if (window.BV_ADMIN_FEE_FIX_V1) return;
  window.BV_ADMIN_FEE_FIX_V1 = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const isAdmin = () => ['administrador','admin'].includes(String(window.BV_ROLE || '').toLowerCase());
  const client = () => window.BV_SUPABASE || window.sb;

  async function renderAdminFees(options) {
    const silent = options === false || options?.silent === true;
    const box = $('motoFeeOrders');
    if (!box || !isAdmin()) return;

    const hasContent = !!box.querySelector('.motoFeeFilter,.motoFeeHeader,.motoFeeList,.emptyState');
    if (!silent && !hasContent) box.innerHTML = '<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';

    try {
      const sb = client();
      if (!sb) throw new Error('Banco de dados indisponível.');

      const [{ data, error }, { data: motoboys, error: motoboyError }] = await Promise.all([
        sb.from('orders')
          .select('id,order_number,delivery_fee,created_at,motoboy_id')
          .eq('status','entregue')
          .order('created_at',{ascending:false}),
        sb.from('profiles')
          .select('id,name,role')
          .eq('role','motoboy')
          .order('name',{ascending:true})
      ]);

      if (error) throw error;
      if (motoboyError) throw motoboyError;

      const rows = Array.isArray(data) ? data : [];
      const filter = window.BV_MOTO_FEE_FILTER || 'all';
      const userFilter = window.BV_ADMIN_FEE_USER_FILTER || 'all';
      const now = new Date();
      const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
      let start = null, end = null, specific = '';

      if (filter === 'today') start = today;
      if (filter === 'week') {
        const day = today.getDay();
        start = new Date(today);
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      }
      if (filter === 'month') start = new Date(now.getFullYear(),now.getMonth(),1);
      if (filter.startsWith('specific:')) {
        specific = filter.slice(9);
        const p = specific.split('-').map(Number);
        if (p.length === 3 && p.every(Number.isFinite)) {
          start = new Date(p[0],p[1]-1,p[2]);
          end = new Date(p[0],p[1]-1,p[2]+1);
        }
      }

      const userRows = Array.isArray(motoboys) ? motoboys : [];
      const filtered = (end
        ? rows.filter(o => { const d=new Date(o.created_at); return d>=start && d<end; })
        : start
          ? rows.filter(o => new Date(o.created_at) >= start)
          : rows)
        .filter(o => userFilter === 'all' || String(o.motoboy_id || '') === String(userFilter));

      const total = filtered.reduce((sum,o)=>sum+Number(o.delivery_fee||0),0);
      const date = value => {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? 'Data não disponível' : d.toLocaleDateString('pt-BR');
      };

      if ($('deliveryFeeEyebrow')) $('deliveryFeeEyebrow').textContent = 'ADMINISTRAÇÃO';
      if ($('deliveryFeeDescription')) $('deliveryFeeDescription').textContent =
        'Consulte o total das taxas de todas as entregas realizadas.';

      box.innerHTML =
        '<div class="motoFeeFilter">'+
          '<div class="motoFeeQuickFilters">'+
            '<button type="button" class="'+(filter==='today'?'active':'')+'" onclick="setMotoFeeFilter(\'today\')">Hoje</button>'+
            '<button type="button" class="'+(filter==='week'?'active':'')+'" onclick="setMotoFeeFilter(\'week\')">Esta semana</button>'+
            '<button type="button" class="'+(filter==='month'?'active':'')+'" onclick="setMotoFeeFilter(\'month\')">Este mês</button>'+
            '<button type="button" class="'+(filter==='all'?'active':'')+'" onclick="setMotoFeeFilter(\'all\')">Todas</button>'+
          '</div>'+
          '<label><span>Data específica</span><input id="motoFeeDate" type="date" value="'+esc(specific)+'" onchange="setMotoFeeSpecificDate(this.value)"></label>'+          '<label><span>Motoboy</span><select id="motoFeeUser" onchange="setMotoFeeUserFilter(this.value)">'+            '<option value="all" '+(userFilter==='all'?'selected':'')+'>Todos os motoboys</option>'+            userRows.map(u => '<option value="'+esc(u.id)+'" '+(String(userFilter)===String(u.id)?'selected':'')+'>'+esc(u.name || 'Motoboy')+'</option>').join('')+          '</select></label>'+
        '</div>'+
        '<div class="motoFeeHeader">'+
          '<div><small>ENTREGAS REALIZADAS</small><strong>'+filtered.length+'</strong></div>'+
          '<div><small>TOTAL DE TAXAS</small><strong>'+money(total)+'</strong></div>'+
        '</div>'+
        (filtered.length
          ? '<div class="motoFeeList">'+filtered.map(o =>
              '<article class="motoFeeOrder">'+
                '<div class="motoFeeOrderNumber">'+
                  '<small>PEDIDO</small><b>#'+esc(String(o.order_number || String(o.id).slice(0,6)).padStart(3,'0'))+'</b>'+
                  '<small>DATA</small><b>'+date(o.created_at)+'</b>'+
                '</div>'+
                '<div class="motoFeeValue"><small>TAXA DE ENTREGA</small><strong>'+money(o.delivery_fee)+'</strong></div>'+
              '</article>'
            ).join('')+'</div>'
          : '<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b><small>Escolha outro filtro para consultar as taxas.</small></div>');
    } catch (e) {
      console.error('[BV ADMIN FEES]',e);
      box.innerHTML =
        '<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message || 'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>';
    }
  }

  window.setMotoFeeUserFilter = function(value) {
    window.BV_ADMIN_FEE_USER_FILTER = value || 'all';
    renderAdminFees();
  };

  const previous = window.renderMotoFeeOrders;
  window.renderMotoFeeOrders = function(options) {
    if (isAdmin()) return renderAdminFees(options);
    return typeof previous === 'function' ? previous() : undefined;
  };
})();

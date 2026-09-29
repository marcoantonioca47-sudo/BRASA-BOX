/* BRASABOX — autenticação definitiva v2 */
(() => {
  const $ = id => document.getElementById(id);
  const URL = window.BV_SUPABASE_CONFIG?.url || '';
  const KEY = window.BV_SUPABASE_CONFIG?.publishableKey || '';

  let client;
  const validUrl = /^https:\/\/[^\s]+\.supabase\.co\/?$/.test(URL); const validKey = /^sb_publishable_[A-Za-z0-9._-]+$/.test(KEY) || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(KEY); const validConfig = validUrl && validKey;
  window.BV_DB_READY = false;
  try {
    if (!validConfig) throw new Error('Novo Supabase ainda não configurado.');
    const storeSlug = String(new URLSearchParams(window.location.search).get('loja') || 'brasabox-demo').trim().toLowerCase();
    client = window.supabase?.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-store-slug': storeSlug } }
    });
    window.BV_STORE_SLUG = storeSlug;
    window.BV_SUPABASE = client;
    window.BV_DB_READY = !!client;
  } catch (e) {
    window.BV_SUPABASE = null;
    console.warn('[BV AUTH] Banco ainda não configurado:', e?.message || e);
  }

  const errorText = e => {
    const m = String(e?.message || e || 'Erro de autenticação.');
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme o e-mail da conta antes de entrar.';
    if (/too many requests/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
    return m;
  };

  const firstLoginDone = () => { try { return localStorage.getItem('bv_first_login_done') === '1'; } catch(e) { return false; } }

  // Sincroniza SEMPRE o perfil/permissão diretamente do Supabase.
  // O cache local serve apenas como apoio visual; nunca é usado como fonte de autorização.
  window.BV_SYNC_PERMISSIONS = async function(userId, fallbackEmail='') {
    if (!client || !userId) return {error:'Usuário não identificado.'};
    const {data:profile,error} = await client.from('profiles').select('id,name,role,store_id').eq('id',userId).maybeSingle();
    if (error) return {error:error.message};
    if (!profile) return {error:'Sua conta existe, mas não possui um perfil cadastrado.'};
    const role=String(profile.role||'usuario').trim().toLowerCase();
    window.BV_STORE_ID=profile.store_id||window.BV_STORE_ID||null;
    window.BV_ROLE=role;
    window.BV_USER_NAME=profile.name || fallbackEmail || '';
    try{
      localStorage.removeItem('bv_profile_cache');
      localStorage.setItem('bv_profile_cache',JSON.stringify({name:window.BV_USER_NAME,role,userId}));
    }catch(e){}
    window.applyAccess?.();
    window.renderLoggedUser?.();
    return {profile};
  };

  window.BV_LOGIN = async (email, password) => {
    if (!client) return { error: 'O novo Supabase ainda não foi configurado neste BrasaBox.' };
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!email || !password) return { error: 'Informe e-mail e senha.' };

    let { data, error } = await client.auth.signInWithPassword({ email, password });

    // Primeiro acesso do administrador inicial:
    // se a conta ainda não existir, o próprio login cria a conta via Auth.
    // A trigger do Supabase atribui automaticamente o perfil "administrador"
    // somente para este e-mail. A senha nunca fica gravada no código.
    if (error && email === 'marcoantoniaca47@gmail.com' && /invalid login credentials/i.test(String(error.message || ''))) {
      const created = await client.auth.signUp({
        email,
        password,
        options: { data: { name: 'Marco' } }
      });
      if (created.error) return { error: errorText(created.error) };
      if (!created.data?.user) return { error: 'Não foi possível criar o administrador inicial.' };
      if (!created.data.session) {
        return { error: 'Administrador criado. Confirme o e-mail recebido antes do primeiro acesso.' };
      }
      data = created.data;
      error = null;
    }

    if (error) return { error: errorText(error) };
    if (!data?.user) return { error: 'O servidor não retornou o usuário.' };

    // Novo login: a permissão vem novamente do banco, nunca do cache local.
    const synced = await window.BV_SYNC_PERMISSIONS(data.user.id, data.user.email || email);
    if (synced.error) return { error: 'Login realizado, mas não foi possível atualizar suas permissões: ' + synced.error };
    try { localStorage.setItem('bv_first_login_done','1'); } catch(e) {}
    $('login')?.style.setProperty('display','none','important');

    try {
      await window.loadApp?.();
    } catch (e) {
      console.error('[BV AUTH] loadApp', e);
    }
    return {};
  };

  window.login = async () => {
    const err = $('err');
    if (err) err.textContent = '';
    const button = document.querySelector('#login button:not(.registerLoginBtn)');
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Entrando...'; }

    try {
      const r = await window.BV_LOGIN($('email')?.value, $('pass')?.value);
      if (r?.error) {
        if (err) err.textContent = r.error;
        return;
      }
      if (err) err.textContent = '';
      $('login')?.style.setProperty('display','none','important');
    } catch (e) {
      console.error('[BV AUTH] login', e);
      if (err) err.textContent = errorText(e);
    } finally {
      if (button) { button.disabled = false; button.textContent = old || 'Entrar'; }
    }
  };

  window.logout = async () => {
    try { await client?.auth.signOut(); } catch(e) { console.error(e); }
    window.BV_ROLE = '';
    window.BV_USER_NAME = '';
    window.applyAccess?.();
    $('login')?.style.setProperty('display','flex','important');
    window.showPage?.('inicio');
  };

  window.BV_REGISTER = async (name,email,password) => {
    if (!client) return { error:'Supabase não carregou.' };
    const { data, error } = await client.auth.signUp({
      email: String(email||'').trim().toLowerCase(),
      password: String(password||''),
      options: { data: { name: String(name||'').trim() } }
    });
    if (error) return { error:errorText(error) };
    if (!data?.user) return { error:'Não foi possível criar a conta.' };
    const p = await client.from('profiles').upsert({
      id:data.user.id, name:String(name||'').trim(), role:'usuario'
    }, {onConflict:'id'});
    if (p.error) return { error:p.error.message };
    return {};
  };

  window.resetBVPassword = async () => {
    const email = String($('email')?.value || '').trim().toLowerCase();
    const err = $('err');
    if (!email) {
      if (err) err.textContent = 'Digite o e-mail cadastrado para receber a redefinição.';
      return;
    }
    if (!client) {
      if (err) err.textContent = 'Serviço de recuperação indisponível. Recarregue a página.';
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) {
      if (err) err.textContent = errorText(error);
      return;
    }
    if (err) err.textContent = '';
    window.toast?.('E-mail de redefinição enviado. Verifique sua caixa de entrada e o spam.');
  };

  function showPasswordRecovery() {
    if ($('bvPasswordRecovery')) return;
    const d=document.createElement('div');
    d.id='bvPasswordRecovery';
    d.style.cssText='position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.82);backdrop-filter:blur(7px)';
    d.innerHTML='<div style="width:min(420px,100%);padding:22px;border:1px solid #343a44;border-radius:18px;background:#0f1115;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.65)"><small style="color:#e50914;font-weight:900;letter-spacing:1px">REDEFINIR SENHA</small><h3 style="margin:7px 0 6px">Crie uma nova senha</h3><p style="margin:0 0 16px;color:#9ba1aa;font-size:13px">Digite a nova senha para acessar sua conta.</p><input id="bvNewPassword" type="password" autocomplete="new-password" placeholder="Nova senha" style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:10px;border-radius:10px;border:1px solid #343a44;background:#080a0d;color:#fff"><input id="bvNewPassword2" type="password" autocomplete="new-password" placeholder="Repita a nova senha" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid #343a44;background:#080a0d;color:#fff"><div id="bvRecoveryErr" style="min-height:18px;margin:9px 0;color:#ff6870;font-size:13px"></div><button id="bvRecoverySave" type="button" style="width:100%;min-height:44px;border:0;border-radius:10px;background:#e50914;color:#fff;font-weight:900;cursor:pointer">Salvar nova senha</button></div>';
    document.body.appendChild(d);
    $('bvRecoverySave').onclick=async()=>{
      const p=String($('bvNewPassword')?.value||'');
      const p2=String($('bvNewPassword2')?.value||'');
      const e=$('bvRecoveryErr');
      if(p.length<6){e.textContent='A senha deve ter pelo menos 6 caracteres.';return}
      if(p!==p2){e.textContent='As senhas não conferem.';return}
      const b=$('bvRecoverySave');b.disabled=true;b.textContent='Salvando...';
      const {error}=await client.auth.updateUser({password:p});
      if(error){e.textContent=errorText(error);b.disabled=false;b.textContent='Salvar nova senha';return}
      try{localStorage.removeItem('bv_first_login_done');localStorage.removeItem('bv_profile_cache')}catch(_){}
      d.remove();
      window.toast?.('Senha redefinida com sucesso. Faça login com a nova senha.');
      await client.auth.signOut();
      $('login')?.style.setProperty('display','flex','important');
    };
  }

  client?.auth.onAuthStateChange((event) => {
    if(event==='PASSWORD_RECOVERY') setTimeout(showPasswordRecovery,0);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (data?.session && firstLoginDone()) {
      try {
        const p = await client.from('profiles').select('name,role,store_id').eq('id',data.session.user.id).maybeSingle();
        if (p.data) {
          window.BV_ROLE = p.data.role || 'usuario'; window.BV_STORE_ID=p.data.store_id||null;
          window.BV_USER_NAME = p.data.name || data.session.user.email || ''; window.renderLoggedUser?.();
          window.applyAccess?.();
          $('login')?.style.setProperty('display','none','important');
          await window.loadApp?.();
        }
      } catch(e) { console.error('[BV AUTH] restore',e); }
    }
  });
})();
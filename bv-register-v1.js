/* BRASABOX — cadastro de cliente */
(() => {
  const $ = id => document.getElementById(id);

  window.openRegister = () => {
    const modal = $('registerModal');
    if (!modal) return;
    $('registerErr') && ($('registerErr').textContent = '');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    setTimeout(() => $('registerName')?.focus(), 60);
  };

  window.closeRegister = () => {
    const modal = $('registerModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  };

  window.registerUser = async event => {
    event?.preventDefault?.();
    const err = $('registerErr');
    if (err) err.textContent = '';

    const name = String($('registerName')?.value || '').trim();
    const email = String($('registerEmail')?.value || '').trim().toLowerCase();
    const password = String($('registerPass')?.value || '');
    const confirm = String($('registerPass2')?.value || '');
    const submit = document.querySelector('#registerModal button[type="submit"]');

    if (!name || !email || !password || !confirm) {
      if (err) err.textContent = 'Preencha todos os campos.';
      return false;
    }
    if (password.length < 6) {
      if (err) err.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      return false;
    }
    if (password !== confirm) {
      if (err) err.textContent = 'As senhas não conferem.';
      return false;
    }

    const oldText = submit?.textContent;
    if (submit) { submit.disabled = true; submit.textContent = 'Criando conta...'; }

    try {
      if (typeof window.BV_REGISTER !== 'function') throw new Error('Serviço de cadastro indisponível.');
      const result = await window.BV_REGISTER(name, email, password);
      if (result?.error) throw new Error(result.error);

      window.closeRegister();
      $('email') && ($('email').value = email);
      const session = await window.BV_SUPABASE?.auth.getSession();
      if (session?.data?.session) {
        window.toast?.('Conta criada com sucesso.');
        await window.loadApp?.();
      } else {
        window.toast?.('Conta criada. Confirme o e-mail, se solicitado, e faça login.');
      }
      return true;
    } catch (e) {
      console.error('[BV REGISTER]', e);
      if (err) err.textContent = String(e?.message || 'Não foi possível criar a conta.');
      return false;
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = oldText || '✓ Criar conta'; }
    }
  };
})();
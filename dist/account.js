/* ATLAS account storage. Passwords are handled only by Supabase Auth. */
(() => {
  'use strict';
  const GUEST_KEY = 'atlas-studio-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  window.ATLAS_ACCOUNT = {
    create(hooks) {
      const config = window.ATLAS_AUTH_CONFIG;
      const client = config && window.supabase?.createClient(config.url, config.key, {
        auth: { storageKey: 'atlas-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      let user = null, ready = false, revision = 0, draft = null, dirty = false;
      let epoch = 0, generation = 0, timer, inFlight = null, conflict = null, status = 'loading', lastSync = null;
      const key = id => 'atlas-profile-v1:' + id;
      const read = name => { try { return JSON.parse(localStorage.getItem(name) || 'null'); } catch { return null; } };
      const announce = () => hooks.status(api.info());
      const cache = () => {
        try { localStorage.setItem(key(user.id), JSON.stringify({ state: draft, revision, dirty, lastSync })); return true; }
        catch { return false; }
      };
      const setStatus = next => { status = next; announce(); };
      async function remote() {
        const { data, error } = await client.from('atlas_web_profiles').select('state,revision,updated_at').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        return data;
      }
      function accept(row) {
        revision = row?.revision || 0;
        draft = hooks.clean(row?.state || hooks.fresh(user));
        lastSync = row?.updated_at || null;
        dirty = !row;
        cache();
        hooks.apply(clone(draft));
      }
      async function activate(nextUser) {
        if (ready && user?.id === nextUser?.id) { user = nextUser; return; }
        const turn = ++epoch;
        clearTimeout(timer); inFlight = null; conflict = null; ready = false; dirty = false; generation = 0;
        user = nextUser; revision = 0; draft = null; lastSync = null;
        hooks.lock(); setStatus('loading');
        if (!user) {
          hooks.apply(hooks.clean(read(GUEST_KEY) || hooks.fresh(null)));
          ready = true; setStatus('guest'); hooks.open(); return;
        }
        const cached = read(key(user.id));
        try {
          const row = await remote();
          if (turn !== epoch) return;
          if (cached?.dirty && cached.state?.version === 1) {
            draft = hooks.clean(cached.state); revision = cached.revision || 0; dirty = true; lastSync = cached.lastSync;
            hooks.apply(clone(draft));
            if ((row?.revision || 0) !== revision) conflict = row;
          } else accept(row);
          ready = true; setStatus(conflict ? 'conflict' : dirty ? 'pending' : 'synced'); hooks.open();
          if (dirty && !conflict) void api.flush();
        } catch {
          if (turn !== epoch) return;
          if (cached?.state?.version === 1) {
            draft = hooks.clean(cached.state); revision = cached.revision || 0; dirty = !!cached.dirty; lastSync = cached.lastSync;
            hooks.apply(clone(draft)); ready = true; setStatus('offline'); hooks.open();
          } else { setStatus('unavailable'); hooks.open(); }
        }
      }
      async function performFlush() {
        const turn = epoch, sentGeneration = generation, sent = clone(draft);
        setStatus('saving');
        try {
          const { data, error } = await client.rpc('atlas_web_save', { p_state: sent, p_revision: revision });
          if (turn !== epoch) return false;
          if (error) {
            if (error.code === '40001') {
              conflict = await remote();
              if (turn !== epoch) return false;
              setStatus('conflict'); return false;
            }
            throw error;
          }
          const row = data?.[0];
          if (!row) throw Error('Missing saved profile');
          revision = row.revision; lastSync = row.updated_at;
          dirty = generation !== sentGeneration;
          cache(); setStatus(dirty ? 'pending' : 'synced');
          return true;
        } catch {
          if (turn === epoch) setStatus('offline');
          return false;
        }
      }
      const api = {
        info: () => ({ user, ready, status, dirty, lastSync, conflict: !!conflict }),
        guest: () => read(GUEST_KEY),
        async start() {
          if (!client) { ready = true; setStatus('disabled'); hooks.open(); return; }
          // Auth callbacks must return synchronously; SDK calls run outside its auth lock.
          client.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION') return;
            setTimeout(() => {
              if (event === 'PASSWORD_RECOVERY') hooks.recovery();
              void activate(session?.user || null);
            }, 0);
          });
          try { const { data, error } = await client.auth.getSession(); if (error) throw error; await activate(data.session?.user || null); }
          catch { ready = true; setStatus('disabled'); hooks.open(); }
        },
        save(state) {
          if (!ready) return false;
          if (!user) {
            try { localStorage.setItem(GUEST_KEY, JSON.stringify(state)); return true; } catch { return false; }
          }
          draft = clone(state); dirty = true; generation++;
          const savedLocally = cache();
          if (!conflict) { setStatus('pending'); clearTimeout(timer); timer = setTimeout(() => void api.flush(), 700); }
          return savedLocally;
        },
        async flush() {
          clearTimeout(timer);
          if (!user || !ready) return !user;
          if (conflict) return false;
          if (inFlight) { await inFlight; return dirty && !conflict && status !== 'offline' ? api.flush() : !dirty; }
          if (!dirty) return true;
          const task = performFlush(); inFlight = task;
          const ok = await task;
          if (inFlight === task) inFlight = null;
          return ok && dirty ? api.flush() : ok;
        },
        async refresh() {
          if (!user) return;
          if (!ready) return activate(user);
          if (inFlight || conflict) return;
          if (dirty) return api.flush();
          const turn = epoch;
          try {
            const row = await remote();
            if (turn !== epoch || dirty || inFlight) return;
            if (row && row.revision !== revision) { conflict = row; setStatus('remote'); }
            else setStatus('synced');
          } catch { if (turn === epoch) setStatus('offline'); }
        },
        async resolve(choice) {
          if (!conflict) return;
          if (choice === 'cloud') {
            if (dirty) hooks.backup(clone(draft));
            const row = conflict; conflict = null; accept(row); setStatus('synced'); hooks.open();
          } else {
            hooks.backup(clone(conflict.state));
            revision = conflict.revision; conflict = null; dirty = true; generation++; cache();
            await api.flush();
          }
        },
        async signIn(email, password) {
          if (!client) throw Error('Connexion indisponible. Recharge la page.');
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
        },
        async signUp(email, password, name) {
          if (!client) throw Error('Connexion indisponible. Recharge la page.');
          const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin } });
          if (error) throw error;
          return !!data.session;
        },
        async password(currentPassword, password) {
          const { error: verified } = await client.auth.signInWithPassword({ email: user.email, password: currentPassword });
          if (verified) throw verified;
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
        },
        async signOut() {
          const id = user?.id;
          hooks.lock();
          try {
            if (!await api.flush()) throw Error('Sauvegarde en attente. Rétablis la connexion ou résous le conflit avant de te déconnecter.');
            const { error } = await client.auth.signOut({ scope: 'local' });
            if (error) throw Error('La déconnexion a échoué. Vérifie ta connexion et réessaie.');
            if (id) { try { localStorage.removeItem(key(id)); } catch {} }
            await activate(null);
          } catch (error) {
            if (user?.id === id && draft) { hooks.apply(clone(draft)); hooks.open(); }
            throw error;
          }
        }
      };
      window.addEventListener('online', () => void api.refresh());
      window.addEventListener('focus', () => void api.refresh());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void api.flush(); else void api.refresh();
      });
      window.addEventListener('beforeunload', event => {
        if (user && dirty) { void api.flush(); event.preventDefault(); event.returnValue = ''; }
      });
      window.addEventListener('storage', event => {
        if (user && event.key === key(user.id)) void api.refresh();
        if (!user && ready && event.key === GUEST_KEY && event.newValue) hooks.guestChanged(hooks.clean(read(GUEST_KEY)));
      });
      return api;
    }
  };
})();

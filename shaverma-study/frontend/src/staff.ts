import { getStaffOrders, Order, setOrderStatus, staffLogin } from './api';

const app = document.querySelector<HTMLElement>('#app')!;
let token = sessionStorage.getItem('staffToken') || '';
let role = sessionStorage.getItem('staffRole') || '';
let staffName = sessionStorage.getItem('staffName') || '';
let orders: Order[] = [];
let activeFilter = 'active';

const labels: Record<string, string> = {
  new: 'Новый', cooking: 'Готовится', ready: 'Готов', completed: 'Выдан', cancelled: 'Отменён'
};
const roleLabels: Record<string, string> = { cashier: 'Кассир', cook: 'Повар', director: 'Директор' };
const money = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));

function actions(order: Order): string[] {
  if ((role === 'cashier' || role === 'director') && order.status === 'new') return ['cooking', 'cancelled'];
  if ((role === 'cook' || role === 'director') && order.status === 'cooking') return ['ready'];
  if ((role === 'cashier' || role === 'director') && order.status === 'ready') return ['completed', 'cancelled'];
  return [];
}

function loginView(): void {
  app.innerHTML = `<div class="auth-wrap">
    <form class="auth-card" data-login>
      <img class="auth-logo" src="/images/logo.svg" alt="Шаурма рядом">
      <div><span class="eyebrow dark">СЛУЖЕБНЫЙ ИНТЕРФЕЙС</span><h1>Вход сотрудника</h1><p>Управление заказами заведения</p></div>
      <label><span>Логин</span><input name="username" value="cashier" required autocomplete="username"></label>
      <label><span>Пароль</span><input name="password" type="password" value="cashier123" required autocomplete="current-password"></label>
      <button class="primary">Войти</button>
      <p class="demo-hint">Демо: cashier / cashier123</p>
      <p class="form-error" data-error></p>
    </form>
  </div>`;
  app.querySelector<HTMLFormElement>('[data-login]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = (event.currentTarget as HTMLFormElement).querySelector<HTMLButtonElement>('.primary')!;
    const data = new FormData(event.currentTarget as HTMLFormElement);
    button.disabled = true;
    try {
      const result = await staffLogin(String(data.get('username')), String(data.get('password')));
      token = result.access_token; role = result.role; staffName = result.name;
      sessionStorage.setItem('staffToken', token);
      sessionStorage.setItem('staffRole', role);
      sessionStorage.setItem('staffName', staffName);
      await load();
    } catch (reason) {
      app.querySelector<HTMLElement>('[data-error]')!.textContent = reason instanceof Error ? reason.message : 'Ошибка входа';
      button.disabled = false;
    }
  });
}

function filteredOrders(): Order[] {
  if (activeFilter === 'active') return orders.filter(order => ['new', 'cooking', 'ready'].includes(order.status));
  if (activeFilter === 'all') return orders;
  return orders.filter(order => order.status === activeFilter);
}

function render(): void {
  const visible = filteredOrders();
  const count = (status: string) => orders.filter(order => order.status === status).length;
  app.innerHTML = `
    <header class="staff-topbar">
      <a href="/" class="brand"><img src="/images/logo.svg" alt="Шаурма рядом"></a>
      <div class="staff-user"><span>${esc(staffName || roleLabels[role] || role)}</span><small>${esc(roleLabels[role] || role)}</small></div>
      <button class="icon-button" data-logout title="Выйти">↪</button>
    </header>
    <main class="staff-main">
      <section class="staff-title-row">
        <div><span class="eyebrow dark">КАБИНЕТ СОТРУДНИКА</span><h1>Заказы</h1><p>Новые заказы появляются после обновления списка.</p></div>
        <button class="refresh-button" data-refresh>↻ Обновить</button>
      </section>
      <section class="stats-grid">
        <article><span class="stat-icon amber">●</span><div><small>Новые</small><strong>${count('new')}</strong></div></article>
        <article><span class="stat-icon blue">●</span><div><small>Готовятся</small><strong>${count('cooking')}</strong></div></article>
        <article><span class="stat-icon green">●</span><div><small>Готовы</small><strong>${count('ready')}</strong></div></article>
      </section>
      <nav class="order-filters">
        ${[['active', 'Активные'], ['new', 'Новые'], ['cooking', 'Готовятся'], ['ready', 'Готовы'], ['all', 'Все']]
          .map(([value, text]) => `<button class="${activeFilter === value ? 'active' : ''}" data-filter="${value}">${text}</button>`).join('')}
      </nav>
      <section class="orders">
        ${visible.length ? visible.map(order => `<article class="order-card">
          <div class="order-top">
            <div><small>${new Date(order.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</small><h2>Заказ №${order.id}</h2></div>
            <span class="status status-${order.status}">${labels[order.status]}</span>
          </div>
          <div class="customer-row"><div class="customer-avatar">${esc(order.customer_name.charAt(0).toUpperCase())}</div><div><strong>${esc(order.customer_name)}</strong><span>${esc(order.phone || 'Телефон не указан')}</span></div></div>
          <ul>${order.items.map(item => `<li><span>${esc(item.name)} <em>× ${item.quantity}</em></span><strong>${money(item.price * item.quantity)}</strong></li>`).join('')}</ul>
          <div class="order-bottom">
            <div><small>Сумма</small><strong>${money(order.total)}</strong></div>
            <div class="order-actions">${actions(order).map(status => `<button class="action-${status}" data-status="${status}" data-id="${order.id}">${labels[status]}</button>`).join('') || '<span class="no-actions">Действий нет</span>'}</div>
          </div>
        </article>`).join('') : '<div class="empty-state staff-empty"><span>✓</span><h2>Здесь пока пусто</h2><p>Заказов с выбранным статусом нет.</p></div>'}
      </section>
    </main>`;
}

async function load(): Promise<void> {
  try { orders = await getStaffOrders(token); render(); }
  catch { sessionStorage.clear(); token = ''; loginView(); }
}

app.addEventListener('click', async event => {
  const target = event.target as HTMLElement;
  const filter = target.closest<HTMLButtonElement>('[data-filter]');
  if (filter) { activeFilter = filter.dataset.filter || 'active'; render(); return; }
  if (target.closest('[data-logout]')) { sessionStorage.clear(); token = ''; loginView(); return; }
  if (target.closest('[data-refresh]')) { await load(); return; }
  const button = target.closest<HTMLButtonElement>('[data-status]');
  if (button) {
    button.disabled = true;
    try { await setOrderStatus(token, Number(button.dataset.id), String(button.dataset.status)); await load(); }
    catch (reason) { alert(reason instanceof Error ? reason.message : 'Ошибка'); button.disabled = false; }
  }
});

if (token) void load(); else loginView();

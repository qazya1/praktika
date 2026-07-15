import { getStaffOrders, Order, setOrderStatus, staffLogin } from './api';

const app = document.querySelector<HTMLElement>('#app')!;
let token = sessionStorage.getItem('staffToken') || '';
let role = sessionStorage.getItem('staffRole') || '';
let orders: Order[] = [];

const labels: Record<string, string> = {
  new: 'Новый', cooking: 'Готовится', ready: 'Готов', completed: 'Выдан', cancelled: 'Отменён'
};

function actions(order: Order): string[] {
  if ((role === 'cashier' || role === 'director') && order.status === 'new') return ['cooking', 'cancelled'];
  if ((role === 'cook' || role === 'director') && order.status === 'cooking') return ['ready'];
  if ((role === 'cashier' || role === 'director') && order.status === 'ready') return ['completed', 'cancelled'];
  return [];
}

function loginView(): void {
  app.innerHTML = `<div class="auth-wrap"><form class="auth-card" data-login>
    <span class="eyebrow">СЛУЖЕБНЫЙ ИНТЕРФЕЙС</span><h1>Вход сотрудника</h1>
    <label>Логин<input name="username" value="cashier" required></label>
    <label>Пароль<input name="password" type="password" value="cashier123" required></label>
    <button class="primary">Войти</button><p class="form-error" data-error></p>
  </form></div>`;
  app.querySelector<HTMLFormElement>('[data-login]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    try {
      const result = await staffLogin(String(data.get('username')), String(data.get('password')));
      token = result.access_token; role = result.role;
      sessionStorage.setItem('staffToken', token); sessionStorage.setItem('staffRole', role);
      await load();
    } catch (reason) {
      app.querySelector<HTMLElement>('[data-error]')!.textContent = reason instanceof Error ? reason.message : 'Ошибка входа';
    }
  });
}

function render(): void {
  app.innerHTML = `<header class="staff-head"><div><span class="eyebrow">КАБИНЕТ</span><h1>Заказы</h1><p>Роль: ${role}</p></div>
    <div class="head-actions"><button data-refresh>Обновить</button><button data-logout>Выйти</button></div></header>
    <section class="orders">
      ${orders.length ? orders.map(order => `<article class="order-card">
        <div class="order-top"><div><small>Заказ</small><h2>№${order.id}</h2></div><span class="status status-${order.status}">${labels[order.status]}</span></div>
        <p><strong>${order.customer_name}</strong> · ${order.phone || 'без телефона'}</p>
        <ul>${order.items.map(item => `<li>${item.name} × ${item.quantity}<strong>${item.price * item.quantity} ₽</strong></li>`).join('')}</ul>
        <div class="order-bottom"><strong>${order.total} ₽</strong><div>${actions(order).map(status => `<button data-status="${status}" data-id="${order.id}">${labels[status]}</button>`).join('')}</div></div>
      </article>`).join('') : '<div class="empty">Заказов пока нет</div>'}
    </section>`;
}

async function load(): Promise<void> {
  try { orders = await getStaffOrders(token); render(); }
  catch { sessionStorage.clear(); token = ''; loginView(); }
}

app.addEventListener('click', async event => {
  const target = event.target as HTMLElement;
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

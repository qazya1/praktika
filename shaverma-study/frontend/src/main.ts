import { clientLogin, createOrder, getMenu, Product } from './api';

const app = document.querySelector<HTMLElement>('#app')!;
const cart = new Map<number, number>();
let products: Product[] = [];
let token = '';

const money = (value: number) => `${value.toFixed(0)} ₽`;
const cartTotal = () => products.reduce((sum, product) => sum + product.price * (cart.get(product.id) || 0), 0);

function render(): void {
  const groups = new Map<string, Product[]>();
  for (const product of products) groups.set(product.category, [...(groups.get(product.category) || []), product]);

  app.innerHTML = `
    <header class="hero">
      <span class="eyebrow">МИНИ-ПРИЛОЖЕНИЕ</span>
      <h1>Шаурма рядом</h1>
      <p>Выберите блюда, добавьте их в корзину и оформите заказ.</p>
    </header>
    <section class="content">
      ${[...groups.entries()].map(([category, items]) => `
        <section class="category">
          <h2>${category}</h2>
          <div class="product-grid">
            ${items.map(product => {
              const quantity = cart.get(product.id) || 0;
              return `<article class="card">
                <div><h3>${product.name}</h3><p>${product.description}</p></div>
                <footer><strong>${money(Number(product.price))}</strong>
                  <div class="counter">
                    <button data-minus="${product.id}" aria-label="Уменьшить">−</button>
                    <span>${quantity}</span>
                    <button data-plus="${product.id}" aria-label="Добавить">+</button>
                  </div>
                </footer>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')}
    </section>
    <aside class="cartbar ${cartTotal() ? 'visible' : ''}">
      <div><small>Корзина</small><strong>${money(cartTotal())}</strong></div>
      <button data-checkout>Оформить</button>
    </aside>`;
}

function checkout(): void {
  const items = [...cart.entries()].filter(([, quantity]) => quantity > 0);
  app.insertAdjacentHTML('beforeend', `
    <div class="modal" data-modal>
      <form class="sheet" data-form>
        <button type="button" class="close" data-close>×</button>
        <h2>Оформление заказа</h2>
        <label>Имя<input name="name" required minlength="2" value="Демо пользователь"></label>
        <label>Телефон<input name="phone" placeholder="+7 900 000-00-00"></label>
        <div class="summary">Итого <strong>${money(cartTotal())}</strong></div>
        <button class="primary" type="submit">Создать заказ</button>
        <p class="form-error" data-error></p>
      </form>
    </div>`);

  const modal = document.querySelector<HTMLElement>('[data-modal]')!;
  modal.querySelector('[data-close]')?.addEventListener('click', () => modal.remove());
  modal.querySelector<HTMLFormElement>('[data-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const error = modal.querySelector<HTMLElement>('[data-error]')!;
    try {
      const order = await createOrder(token, {
        customer_name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        items: items.map(([product_id, quantity]) => ({ product_id, quantity }))
      });
      modal.querySelector('.sheet')!.innerHTML = `
        <div class="success">✓</div><h2>Заказ №${order.id} создан</h2>
        <p>Сумма: <strong>${money(order.total)}</strong></p>
        <button type="button" class="primary" data-done>Готово</button>`;
      modal.querySelector('[data-done]')?.addEventListener('click', () => {
        cart.clear(); modal.remove(); render();
      });
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : 'Не удалось создать заказ';
    }
  });
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const plus = target.closest<HTMLElement>('[data-plus]');
  const minus = target.closest<HTMLElement>('[data-minus]');
  if (plus) cart.set(Number(plus.dataset.plus), (cart.get(Number(plus.dataset.plus)) || 0) + 1);
  if (minus) cart.set(Number(minus.dataset.minus), Math.max(0, (cart.get(Number(minus.dataset.minus)) || 0) - 1));
  if (plus || minus) render();
  if (target.closest('[data-checkout]')) checkout();
});

async function start(): Promise<void> {
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
  try {
    [products, token] = await Promise.all([getMenu(), clientLogin()]);
    render();
  } catch (reason) {
    app.innerHTML = `<div class="center-error"><h1>Не удалось открыть меню</h1><p>${reason instanceof Error ? reason.message : ''}</p></div>`;
  }
}

void start();

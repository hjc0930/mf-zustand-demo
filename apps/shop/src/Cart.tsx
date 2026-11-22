import { useAppStore, type CartAppProps } from '@demo/shared-state';
import './cart.css';

/**
 * remote 的对外出口。
 *
 * 单例模式：这里不需要接 store、不需要 Provider，也不会有“缺少 Provider”的问题——
 * 因为 useAppStore 直接读的是共享包里那个模块级单例。
 */
export default function Cart({ title = 'Shop 远程购物车' }: CartAppProps) {
  return <CartView title={title} />;
}

function CartView({ title }: { title: string }) {
  const storeId = useAppStore((s) => s.storeId);
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const cartCount = useAppStore((s) => s.cartCount);
  const addToCart = useAppStore((s) => s.addToCart);
  const clearCart = useAppStore((s) => s.clearCart);

  return (
    <section className={`cart ${theme}`} data-testid="remote-cart">
      <div className="cart-head">
        <h2>{title}</h2>
        <span className="badge ok" data-testid="cart-mode">
          共享单例 store
        </span>
      </div>

      <dl className="cart-facts">
        <div>
          <dt>远程读到的用户</dt>
          <dd data-testid="cart-user">{user?.name ?? '未登录'}</dd>
        </div>
        <div>
          <dt>远程读到的主题</dt>
          <dd data-testid="cart-theme">{theme}</dd>
        </div>
        <div>
          <dt>购物车数量</dt>
          <dd data-testid="cart-count">{cartCount}</dd>
        </div>
      </dl>

      <div className="cart-actions">
        <button type="button" data-testid="cart-add" onClick={addToCart}>
          加入购物车 +1
        </button>
        <button type="button" className="ghost" data-testid="cart-clear" onClick={clearCart}>
          清空
        </button>
      </div>

      <p className="cart-hint">
        store 实例 <code data-testid="cart-store-id">#{storeId}</code>
        ，与宿主显示的是同一个 —— 这里没有接收任何 props。
      </p>
    </section>
  );
}

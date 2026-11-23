import { Link } from 'react-router-dom';
import { useAppStore } from '@demo/shared-state';

/** 宿主自己的首页：说明当前架构，并指向商城（远程应用） */
export function HomePanel() {
  const storeId = useAppStore((s) => s.storeId);

  return (
    <section className="panel">
      <h1>模式一：路由由宿主集中管理</h1>
      <p className="sub">
        宿主用 <code>&lt;Route path="/shop/*"&gt;</code> 把远程挂在
        <code>/shop</code> 下；远程内部再用相对路径的 <code>&lt;Routes&gt;</code>{' '}
        匹配 <code>orders</code>、<code>orders/:id</code>。
        两边共享同一个 react-router 实例，所以不用传 basename，也不用传 props。
      </p>

      <dl className="facts">
        <div>
          <dt>远程入口</dt>
          <dd>shop/App → /shop/*</dd>
        </div>
        <div>
          <dt>路由归属</dt>
          <dd>宿主一级 / 远程二级</dd>
        </div>
        <div>
          <dt>store 实例</dt>
          <dd>#{storeId}</dd>
        </div>
      </dl>

      <p className="hint">
        点顶部导航的 <Link to="/shop">商城</Link> 进入远程应用，再试试{' '}
        <code>/shop/orders/42</code> 这种深链刷新。
      </p>
    </section>
  );
}

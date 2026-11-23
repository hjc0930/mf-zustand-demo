import { Link, useParams } from 'react-router-dom';

/** 订单详情：路由 /shop/orders/:id */
export function OrderDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="panel" data-testid="order-detail">
      <h2>订单 #{id}</h2>
      <p className="sub">
        路由参数直接从 URL 取：<code>/shop/orders/{id}</code>。
        宿主不需要知道这个参数存在，也不需要向下传参。
      </p>
      <Link to=".." data-testid="order-back">
        ← 返回订单列表
      </Link>
    </div>
  );
}

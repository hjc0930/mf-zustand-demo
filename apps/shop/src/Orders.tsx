import { Link } from 'react-router-dom';

const ORDERS = [
  { id: '1001', title: '机械键盘', amount: 399, status: '已发货' },
  { id: '1002', title: '显示器支架', amount: 159, status: '待发货' },
  { id: '1003', title: '降噪耳机', amount: 899, status: '已完成' },
];

/** 订单列表：路由 /shop/orders */
export function Orders() {
  return (
    <div className="panel" data-testid="orders-page">
      <h2>订单列表</h2>
      <p className="sub">
        远程自己的页面。数据是静态示例，真实项目里由远程自己的接口获取，宿主不参与。
      </p>

      <ul className="order-list">
        {ORDERS.map((o) => (
          <li key={o.id} className="order-row">
            <Link to={o.id} data-testid={`order-link-${o.id}`}>
              #{o.id} {o.title}
            </Link>
            <span className="order-amount">¥{o.amount}</span>
            <span className="tag">{o.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

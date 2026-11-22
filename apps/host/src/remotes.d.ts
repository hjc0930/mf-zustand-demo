/**
 * 远程模块的类型声明。
 *
 * 生产项目里可以由 @module-federation/enhanced 的 DTS 自动生成；
 * 这里手写一份，保证 typecheck 阶段就能发现 props 不匹配。
 */
declare module 'shop/Cart' {
  import type { ComponentType } from 'react';
  import type { CartAppProps } from '@demo/shared-state';

  const Cart: ComponentType<CartAppProps>;
  export default Cart;
}

/**
 * 跨应用契约：remote 暴露的模块接收什么 props。
 *
 * 单例模式下宿主不再下发 store，props 面收窄到只剩展示相关的配置。
 * 保留这个类型是为了：shop 改了 props 形状，host 在 typecheck 阶段就能发现。
 */
export interface CartAppProps {
  title?: string;
}

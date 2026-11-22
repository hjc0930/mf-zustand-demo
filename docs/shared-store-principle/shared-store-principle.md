# 共享单例 store 的原理

> 本文说明 `@demo/shared-state` 里的 `appStore` 为什么能在 host 与 remote 之间变成「同一个实例」，
> 以及这个「单例」的边界在哪里。

## 一句话

它是 **「模块只求值一次」×「页面级共享注册表」** 的结果。Zustand 和 React 都不参与这件事——
换成 Redux、MobX、甚至一个普通的 `let state = {}`，机制完全一样。

## 三层机制

### 第一层：ESM 的模块缓存（语言层）

```ts
export const appStore = createAppStore();
```

模块顶层代码在**一个 realm（页面）里只会执行一次**。此后无论谁 `import`，拿到的都是同一个模块
命名空间对象，因此 `appStore` 是同一个引用。

但这一层只在「同一个模块图」里成立。host 和 shop 是两个独立构建的 bundle，各有各的模块图，
默认情况下会各自执行一次 —— 那就是两个 store。

### 第二层：构建期改写（把 import 变成「向注册表要」）

配了 `shared` 的包不会被内联进 bundle。打包插件会生成一个**代理模块**，它做的事大致是：

> 这个 import 不要用我自己那份实现，运行时去共享作用域里要一个。

所以产物里的 `import { appStore } from '@demo/shared-state'` 已经**不指向任何具体文件**，
而是指向一次运行时查找。

### 第三层：运行时协商（决定谁的那份胜出）

`window.__FEDERATION__.__SHARE__` 维护一张注册表，记录每个包的：

```
{ version, get()/lib(), shareConfig: { singleton, requiredVersion, ... }, loaded }
```

规则是：**先注册的一方把记录写进去；后加载的一方发现已有兼容记录，就直接复用，不再求值自己那份。**

## 注册表实测

在 `pnpm dev` 运行状态下，`pnpm inspect` 会打印这张表。一次真实的输出：

```json
{
  "instances": ["host", "shop"],
  "shareScopes": {
    "host": {
      "global-app-scope": {
        "@demo/shared-state": [{ "version": "1.0.0", "from": "host", "singleton": true }],
        "zustand": [{ "version": "5.1.0", "from": "host", "singleton": true }],
        "react": [{ "version": "19.3.1", "from": "host", "loaded": true, "singleton": true }]
      }
    },
    "shop": {
      "global-app-scope": {
        "@demo/shared-state": [{ "version": "1.0.0", "from": "shop", "singleton": true }],
        "zustand": [{ "version": "5.1.0", "from": "shop", "singleton": true }],
        "react": [{ "version": "19.3.1", "from": "shop", "loaded": true, "singleton": true }]
      }
    }
  },
  "dom": { "host": "#giak29", "remote": "#giak29" }
}
```

四个信息点：

1. **scope 名是 `global-app-scope`** —— 由 `@demo/shared-state/mf-config` 里的 `SHARE_SCOPE` 统一指定（默认是 `default`）。两边同名，才会进同一张表。
2. **每个实例一个分片**，`from` 表示这条记录由谁提供；运行时解析时按 scope 名汇总候选。
3. **每个包只有一条版本记录**，`singleton: true` 决定候选里只留一个。漏配 `shared` 或 scope 名不一致时，才会出现两份。
4. **`dom.host` 与 `dom.remote` 的 storeId 相同** —— 这是结论性证据：最终只求值了一次。

## 时序

```
host 启动
  └─ init() → 把自己那份 shared 注册进 scope

shop 容器加载（remoteEntry）
  └─ initializeSharing()
       ├─ 遍历自己要共享的包
       ├─ 发现 scope 里已有兼容记录（singleton）
       └─ 调用那条记录的 get() 拿模块，而不是执行自己的副本

组件 render
  └─ import('@demo/shared-state') → 命中同一条记录 → 同一个 appStore
```

注意：这里**没有「把数据传过去」这个动作**。传过去的只是「模块实例」这个概念，
数据之所以同步，是因为两边操作的是同一个对象。

## 为什么 `singleton` 不可省

不加 `singleton` 时，host 会注册 `1.0.0 (from host)`、shop 会注册 `1.0.0 (from shop)`，
协商按版本策略挑一个；但两边各自的依赖图里仍可能保留自己的那份，结果还是两份 store。

`singleton` 的语义可以精确表述为：

> 这个包在页面里只允许存在一个实例，后注册的必须复用已有的，不允许并列。

## 这个「单例」的边界

| 场景 | 是否共享 |
|---|---|
| 同一页面的 host 和多个 remote | ✅ 共享 |
| 同一站点的两个浏览器标签页 | ❌ 各有一份 |
| 页面里的 iframe | ❌ 不同 realm |
| 刷新页面 | ❌ 重建 |
| SSR 的两次请求 | ❌ 必须每请求一份 |

跨标签页同步要靠 `BroadcastChannel` 或 `storage` 事件，那不是 Module Federation 的职责。

## 什么情况下会破功

| 现象 | 原因 |
|---|---|
| 注册表里出现两条同名记录 | 某一边没配 `shared`，或两边 `shared` 配置不一致 |
| 两边 share scope 名不同 | 手动配了 `scope` 且不一致 |
| 同一个包用不同 specifier 引用（`@demo/shared-state` 与 `@demo/shared-state/src/index`） | 包名不同，注册表里成了两个 key |
| 版本不兼容 + `strictVersion` | 直接抛错，而不是静默用旧版本 |

## 和 Context 的分工

- **注册表**决定「页面里为什么只有一个实例」—— 这是共享机制。
- **Context** 决定「组件怎么拿到这个实例」—— 这是分发机制。

本项目删掉 Context 后一切照常，因为真正起作用的一直是前者。
如果将来需要在同一页面挂两个独立 store，才需要把 Context + Provider 加回来做局部覆盖
（覆盖只对 React 树内有效，命令式 `import { appStore }` 不受影响）。

## 自己验证

```bash
pnpm dev       # 启动 host:5173 / shop:5174
pnpm inspect   # 打印共享作用域注册表
```

对照点：

- `@demo/shared-state` 应该**只有一条** `1.0.0` 记录；
- 页面两侧显示的 `store 实例 #xxxxxx` 应该完全一致；
- 控制台 `__HOST_STORE__ === (await import('@demo/shared-state')).appStore` 为 `true`。

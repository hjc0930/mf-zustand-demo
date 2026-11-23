import { useRouteError } from 'react-router-dom';

export function RemoteLoading() {
  return <div className="loading">正在加载 shop 远程应用…</div>;
}

export function RemoteUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="remote-error" data-testid="remote-error">
      <strong>远程应用暂不可用</strong>
      <p>请确认 shop 已启动，或检查 /mf-remotes.json 里的地址是否正确。</p>
      {reason ? <code>{reason}</code> : null}
    </div>
  );
}

/** 作为路由的 errorElement：渲染期出错时由 data router 接管 */
export function RemoteErrorRoute() {
  const error = useRouteError();
  return <RemoteUnavailable reason={error instanceof Error ? error.message : String(error)} />;
}

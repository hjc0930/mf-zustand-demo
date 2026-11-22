import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** 远程模块加载失败时的兜底，避免整个宿主白屏 */
export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[host] 远程模块渲染失败', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="remote-error" data-testid="remote-error">
          <strong>远程模块加载失败</strong>
          <p>请确认 shop 应用已启动在 http://localhost:5174</p>
          <code>{this.state.message}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

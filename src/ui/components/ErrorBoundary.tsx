import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0a0a14', color: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'GMarketSans, sans-serif',
          padding: 32,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>오류가 발생했습니다</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24, textAlign: 'center' }}>
            {this.state.error?.message}
          </div>
          <button
            // eslint-disable-next-line no-restricted-syntax -- ErrorBoundary 는 앱이 이미 깨진 상태 복구용, 일반 런타임 아님
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px', borderRadius: 12,
              background: '#fff', color: '#000',
              border: 'none', fontSize: 16, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            다시 시작
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error card (e.g. "Slide Canvas") */
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? '', error, info.componentStack);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          gap: '1rem',
          height: '100%',
          background: '#0f1117',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <strong style={{ fontSize: '1rem' }}>
          {this.props.label ? `${this.props.label} crashed` : 'Something went wrong'}
        </strong>
        <pre
          style={{
            maxWidth: '480px',
            fontSize: '0.7rem',
            background: '#1e293b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            overflowX: 'auto',
            color: '#f87171',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={this.handleReset}
          style={{
            padding: '0.4rem 1.2rem',
            borderRadius: '6px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

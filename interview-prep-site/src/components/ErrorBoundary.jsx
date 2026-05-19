import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Rendering Error</h2>
          <p>Something went wrong while displaying this content.</p>
          <pre style={{ marginTop: '12px', fontSize: '0.8rem', textAlign: 'left', background: '#f4f4f0', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '12px', padding: '6px 16px', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

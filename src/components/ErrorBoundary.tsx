/** Catches render errors so a broken screen shows a way out instead of a blank page. */
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="state" role="alert">
        <div>
          <h2>Something went wrong on this screen</h2>
          <p>Your progress is saved. Go back to Home or reload the app.</p>
          <div className="row" style={{ justifyContent: 'center', margin: '18px 0' }}>
            <button className="btn btn-primary" onClick={() => { location.hash = '#/'; this.setState({ error: null }); }}>Back to Home</button>
            <button className="btn" onClick={() => location.reload()}>Reload</button>
          </div>
          <pre>{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}

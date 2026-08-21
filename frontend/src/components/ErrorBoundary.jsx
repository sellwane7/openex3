import { Component } from "react";

/**
 * Without this, an uncaught error anywhere in the routed page tree
 * unmounts the *entire* React app (NavBar included), leaving a blank
 * black screen with nothing in the console-visible DOM to debug from.
 * Wrapping the routes here means a crash stays contained to the page
 * that caused it, and shows an actual error message + reset button
 * instead of silence.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface the real cause in the console — this is the "blank page"
    // killer: without this log, a render-time throw fails silently from
    // the user's perspective.
    console.error("Caught render error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="panel error-boundary">
            <h2>Something went wrong loading this page</h2>
            <p className="form-error">{this.state.error.message || "Unknown error"}</p>
            <p className="placeholder-note">
              Try again below — if it keeps happening, open the browser console (F12) for the full stack trace.
            </p>
            <button className="submit-order buy" onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No console noise; could be extended to telemetry if needed
    this.info = info;
  }

  render() {
    if (this.state.error) {
      const title = this.props.title || "אירעה שגיאה בלתי צפויה";
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-right" dir="rtl">
          <div className="font-semibold text-red-700 mb-1">{title}</div>
          <div className="text-sm text-red-700">ננסה להציג את המסך מחדש. אם זה חוזר על עצמו, נסה לרענן או לשנות בחירה.</div>
          {/* Optional lightweight debug for preview only */}
          {this.props.debug && (
            <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap break-words">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
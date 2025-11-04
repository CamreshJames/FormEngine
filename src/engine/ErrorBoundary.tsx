import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('FormEngine Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="field-error" style={{ padding: '1rem', textAlign: 'center' }}>
                    <h3>Something went wrong</h3>
                    <p>There was an error rendering this form field.</p>
                    <details style={{ marginTop: '0.5rem', textAlign: 'left' }}>
                        <summary>Error details</summary>
                        <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
                            {this.state.error?.message}
                        </pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}
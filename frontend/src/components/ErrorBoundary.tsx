import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        console.error('Error Boundary caught an error:', error, errorInfo)

        // TODO: Log to error reporting service (Sentry, LogRocket, etc.)
        // logErrorToService(error, errorInfo)

        this.setState({
            error,
            errorInfo,
        })
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided by parent
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default fallback UI
            return (
                <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
                    <div className="w-full max-w-2xl space-y-6 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="text-center space-y-2">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                We're sorry for the inconvenience. The application encountered an unexpected error.
                            </p>
                        </div>

                        {this.state.error && (
                            <details className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                <summary className="cursor-pointer font-semibold text-red-900 dark:text-red-100 mb-2">
                                    Error Details (for developers)
                                </summary>
                                <div className="mt-2 space-y-2">
                                    <div className="text-sm">
                                        <strong className="text-red-800 dark:text-red-200">Error:</strong>
                                        <pre className="mt-1 text-xs overflow-auto bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                            {this.state.error.toString()}
                                        </pre>
                                    </div>
                                    {this.state.errorInfo && (
                                        <div className="text-sm">
                                            <strong className="text-red-800 dark:text-red-200">Stack Trace:</strong>
                                            <pre className="mt-1 text-xs overflow-auto bg-red-100 dark:bg-red-900/30 p-2 rounded max-h-64">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

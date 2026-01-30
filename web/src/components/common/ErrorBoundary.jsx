import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureError } from '../../config/sentry';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 * Prevents entire app from crashing when a single component fails
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Send to Sentry error tracking
        captureError(error, {
            componentStack: errorInfo?.componentStack,
            boundaryName: this.props.title || 'DefaultErrorBoundary'
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-[300px] flex items-center justify-center p-6">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            {this.props.title || 'Nešto je pošlo po zlu'}
                        </h2>

                        <p className="text-slate-600 mb-6">
                            {this.props.message || 'Došlo je do greške pri učitavanju ove sekcije. Pokušajte ponovo ili se vratite na početnu stranicu.'}
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                <RefreshCw size={16} />
                                Pokušaj ponovo
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <Home size={16} />
                                Početna
                            </button>
                        </div>

                        {/* Show error details in development */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                                    Detalji greške (dev only)
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-100 rounded-lg text-xs text-red-600 overflow-auto max-h-48">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Wrapper component for specific sections
 * Usage: <MapErrorBoundary><MapContainer /></MapErrorBoundary>
 */
export const MapErrorBoundary = ({ children }) => (
    <ErrorBoundary
        title="Greška pri učitavanju mape"
        message="Mapa trenutno nije dostupna. Proverite internet konekciju i pokušajte ponovo."
    >
        {children}
    </ErrorBoundary>
);

export const AnalyticsErrorBoundary = ({ children }) => (
    <ErrorBoundary
        title="Greška pri učitavanju analitike"
        message="Podaci analitike trenutno nisu dostupni. Pokušajte ponovo kasnije."
    >
        {children}
    </ErrorBoundary>
);

export const TableErrorBoundary = ({ children }) => (
    <ErrorBoundary
        title="Greška pri učitavanju tabele"
        message="Podaci tabele trenutno nisu dostupni. Pokušajte ponovo."
    >
        {children}
    </ErrorBoundary>
);

export default ErrorBoundary;

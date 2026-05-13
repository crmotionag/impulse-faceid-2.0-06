import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-glow">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Algo deu errado
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A página encontrou um problema inesperado. Tente recarregar para continuar.
          </p>
          {this.state.error?.message && (
            <p className="mt-4 max-h-24 overflow-auto rounded-lg bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground">
              {this.state.error.message}
            </p>
          )}
          <Button onClick={this.handleReload} variant="hero" size="lg" className="mt-6 w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }
}

import React from 'react'

export class ErrorBoundary extends React.Component {
    state = {
        hasError: false
    }
  
    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { hasError: true };
    }
  
    componentDidCatch(error, errorInfo) {
      // You can also log the error to an error reporting service
      console.error(error, errorInfo);
    }
  
    render() {
      if (this.state.hasError) {
        // You can render any custom fallback UI
        return <div>Popup crashed.</div>;
      }
  
      return this.props.children; 
    }
  }
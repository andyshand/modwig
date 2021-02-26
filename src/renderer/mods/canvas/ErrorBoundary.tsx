import React from 'react'
import { styled } from 'linaria/react'

const Wrap = styled.div`
  background: rgba(0, 0, 0, 0.7);
  position: absolute;
  color: white;
  align-items: center;
  justify-content: center;
  display: flex;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`

export class ErrorBoundary extends React.Component {
    state = {
        hasError: false
    }

    componentDidCatch(error, errorInfo) {
      // You can also log the error to an error reporting service
      console.error(error, errorInfo);
      this.setState({hasError: true})
    }
  
    render() {
      if (this.state.hasError) {
        // You can render any custom fallback UI
        return <Wrap>Popup crashed.</Wrap>;
      }
  
      return this.props.children; 
    }
  }
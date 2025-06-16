import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in component:', error, errorInfo);
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
  }


  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.redirectTo) {
      this.props.navigate(this.props.redirectTo);
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h3>Something went wrong</h3>
          {this.props.errorMessage || (
            <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          )}
          <button 
            className="btn btn-primary" 
            onClick={this.handleReload}
          >
            {this.props.buttonText || 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  buttonText: PropTypes.string,
  redirectTo: PropTypes.string,
  navigate: PropTypes.func
};

// This is a wrapper component to use the navigate hook
const ErrorBoundaryWithRouter = (props) => {
  const navigate = useNavigate();
  return <ErrorBoundary {...props} navigate={navigate} />;
};

export default ErrorBoundaryWithRouter;

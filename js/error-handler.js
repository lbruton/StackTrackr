// /js/error-handler.js
// This file will contain the ErrorHandler class for centralized error management.

class ErrorHandler {
  constructor() {
    this.errorContainer = document.getElementById('error-container');
    if (!this.errorContainer) {
      this.errorContainer = document.createElement('div');
      this.errorContainer.id = 'error-container';
      document.body.appendChild(this.errorContainer);
    }
  }

  handle(error, context) {
    console.error(`Error in ${context}:`, error);
    this.showError(`An error occurred during ${context}. Please check the console for details.`);
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    this.errorContainer.appendChild(errorElement);
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }
}

window.errorHandler = new ErrorHandler();

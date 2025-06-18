class TradePredictorFormController {
  constructor(formId) {
    this.form = document.getElementById(formId);
    if (!this.form) return;
    this.setupValidators();
    this.attachEventListeners();
    this.submitButton = this.form.querySelector('.submit-button');
    this.resultsDiv = document.getElementById('predictionResults');
  }

  setupValidators() {
    this.validators = {
      modelType: (value) => Boolean(value),
      qualityScore: (value) => {
        const score = Number(value);
        return !isNaN(score) && score >= 0 && score <= 5;
      },
      currentPrice: (value) => {
        const price = Number(value);
        return !isNaN(price) && price > 0;
      },
      volatility: (value) => ['low', 'medium', 'high'].includes(value)
    };
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    Object.keys(this.validators).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.addEventListener('input', () => {
          this.validateField(fieldId);
          this.updateSubmitButton();
        });
      }
    });
  }

  validateField(fieldId) {
    const element = document.getElementById(fieldId);
    if (!element) return false;
    const value = element.value;
    const isValid = this.validators[fieldId](value);
    element.classList.toggle('error', !isValid);
    const errorId = `${element.id}-error`;
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = isValid ? '' : this.getErrorMessage(fieldId);
      errorElement.style.display = isValid ? 'none' : 'block';
    }
    return isValid;
  }

  getErrorMessage(fieldId) {
    const messages = {
      modelType: 'Please select a model type',
      qualityScore: 'Quality score must be between 0 and 5',
      currentPrice: 'Price must be greater than 0',
      volatility: 'Please select volatility level'
    };
    return messages[fieldId] || 'Invalid input';
  }

  updateSubmitButton() {
    if (!this.submitButton) return;
    const isFormValid = Object.keys(this.validators)
      .every(field => this.validateField(field));
    this.submitButton.disabled = !isFormValid;
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (!this.validateForm()) return;
    const formData = this.getFormData();
    try {
      if (this.submitButton) this.submitButton.disabled = true;
      await google.script.run
        .withSuccessHandler(this.handleSuccess.bind(this))
        .withFailureHandler(this.handleError.bind(this))
        .predictTradeSetup(formData);
    } catch (error) {
      this.handleError(error);
    } finally {
      if (this.submitButton) this.submitButton.disabled = false;
    }
  }

  validateForm() {
    return Object.keys(this.validators)
      .every(field => this.validateField(field));
  }

  getFormData() {
    return {
      modelType: document.getElementById('modelType').value,
      qualityScore: Number(document.getElementById('qualityScore').value),
      currentPrice: Number(document.getElementById('currentPrice').value),
      volatility: document.getElementById('volatility').value,
      timestamp: new Date().toISOString()
    };
  }

  handleSuccess(result) {
    if (!this.resultsDiv) return;
    if (!result.success) {
      this.showError(result.message);
      return;
    }
    const prediction = result.prediction;
    this.resultsDiv.innerHTML = `
      <div class="prediction-results">
        <h3>Trade Prediction</h3>
        <p>Success Probability: ${(prediction.probability * 100).toFixed(1)}%</p>
        <p>Confidence Level: ${(prediction.confidence * 100).toFixed(1)}%</p>
        <p>Recommended Entry: ${prediction.recommendedEntry}</p>
        <p>Suggested Stop Loss: ${prediction.suggestedStopLoss}</p>
      </div>
    `;
    this.resultsDiv.style.display = 'block';
  }

  handleError(error) {
    this.showError(error && error.message ? error.message : 'Failed to process trade setup');
  }

  showError(message) {
    if (!this.form) return;
    let errorDiv = this.form.querySelector('.form-global-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'form-global-error error-message';
      this.form.insertBefore(errorDiv, this.submitButton);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => { if (errorDiv) errorDiv.style.display = 'none'; }, 5000);
  }
}

if (typeof document !== 'undefined') {
  new TradePredictorFormController('tradePredictorForm');
}
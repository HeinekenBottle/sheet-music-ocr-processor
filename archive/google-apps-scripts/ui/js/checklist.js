/**
 * Pre-Trade Checklist JavaScript
 * Handles dynamic checklist creation and form submission
 */

// Initialize when document loads
document.addEventListener('DOMContentLoaded', function() {
    loadChecklistItems();
  });
  
  // Checklist configuration
  const CHECKLIST_ITEMS = [
    {
      id: 'patternQuality',
      label: 'Pattern Quality Score',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      step: 0.5
    },
    {
      id: 'liquidityResistance',
      label: 'Liquidity Level',
      type: 'select',
      required: true,
      options: ['High', 'Medium', 'Low']
    },
    {
      id: 'riskReward',
      label: 'Risk/Reward Ratio',
      type: 'number',
      required: true,
      step: 0.1
    },
    {
      id: 'marketContext',
      label: 'Market Context',
      type: 'select',
      required: true,
      options: ['Strong', 'Neutral', 'Weak']
    }
  ];
  
  // Add after the CHECKLIST_ITEMS configuration

// Add validation messages
const VALIDATION_MESSAGES = {
    patternQuality: 'Score must be between 1 and 5',
    riskReward: 'Risk/Reward ratio must be positive',
    required: 'This field is required'
  };
  
  // Update submitChecklist function to include validation
  function submitChecklist() {
    const form = document.getElementById('preTradeForm');
    
    // Clear previous error messages
    clearErrorMessages();
    
    if (!validateForm()) {
      return;
    }
    
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    
    // Disable submit button while processing
    document.querySelector('button[onclick="submitChecklist()"]').disabled = true;
    
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .processChecklistSubmission(data);
  }
  
  function validateForm() {
    const form = document.getElementById('preTradeForm');
    let isValid = true;
    
    CHECKLIST_ITEMS.forEach(item => {
      const input = document.getElementById(item.id);
      if (!input.checkValidity()) {
        showError(input, VALIDATION_MESSAGES[item.id] || VALIDATION_MESSAGES.required);
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  function showError(input, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
    input.classList.add('error');
  }
  
  function clearErrorMessages() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }
  
  // Update onFailure to show errors in UI
  function onFailure(error) {
    document.querySelector('button[onclick="submitChecklist()"]').disabled = false;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'submission-error';
    errorDiv.textContent = `Error: ${error}`;
    document.getElementById('preTradeForm').prepend(errorDiv);
  }
  
  function loadChecklistItems() {
    const form = document.getElementById('preTradeForm');
    CHECKLIST_ITEMS.forEach(item => {
      form.appendChild(createFormItem(item));
    });
  }
  
  function createFormItem(item) {
    const div = document.createElement('div');
    div.className = 'checklist-item';
    
    const label = document.createElement('label');
    label.htmlFor = item.id;
    label.textContent = item.label;
    
    const input = item.type === 'select' 
      ? createSelect(item)
      : createInput(item);
    
    div.appendChild(label);
    div.appendChild(input);
    return div;
  }
  
  function createSelect(item) {
    const select = document.createElement('select');
    select.id = item.id;
    select.name = item.id;
    select.required = item.required;
    
    item.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.toLowerCase();
      option.textContent = opt;
      select.appendChild(option);
    });
    
    return select;
  }
  
  function createInput(item) {
    const input = document.createElement('input');
    input.type = item.type;
    input.id = item.id;
    input.name = item.id;
    input.required = item.required;
    
    if (item.min) input.min = item.min;
    if (item.max) input.max = item.max;
    if (item.step) input.step = item.step;
    
    return input;
  }
  
  function submitChecklist() {
    const form = document.getElementById('preTradeForm');
    const data = {};
    
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .processChecklistSubmission(data);
  }
  
  function onSuccess() {
    google.script.host.close();
  }
  
  function onFailure(error) {
    alert('Error submitting checklist: ' + error);
  }
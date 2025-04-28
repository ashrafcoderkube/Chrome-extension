// content.js
(function() {
    // State variables
    let selectedText = '';
    let selectionRange = null;
    let popupElement = null;
    let isExtensionValid = true;
  
    // Function to check if extension is valid
    function checkExtensionValid() {
      try {
        chrome.runtime.getURL('');
        isExtensionValid = true;
        return true;
      } catch (e) {
        console.log("Extension context invalidated. This is normal during development.");
        isExtensionValid = false;
        return false;
      }
    }
  
   // Create popup element
   function createPopup() {
    // Remove existing popup if present
    const existingPopup = document.getElementById('tone-adjuster-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'tone-adjuster-popup';
    popup.innerHTML = 
      `<div class="tone-adjuster-header">Tone Adjuster</div>
      <div class="tone-adjuster-buttons">
        <button id="professional-btn">Professional</button>
        <button id="casual-btn">Casual</button>
        <button id="funny-btn">Funny</button>
        <button id="enthusiastic-btn">Enthusiastic</button>
        <button id="informational-btn">Informational</button>
        <button id="fix-grammar-btn">Fix Grammar</button>
      </div>
      <div id="result-container" class="tone-adjuster-result hidden">
        <div id="result-text"></div>
        <button id="apply-btn">Apply Changes</button>
      </div>
      <div id="loading-indicator" class="tone-adjuster-loading hidden">Processing...</div>
      <div id="error-container" class="tone-adjuster-error hidden">
        <div id="error-text"></div>
        <button id="reload-btn">Reload Extension</button>
      </div>`
    ;
    document.body.appendChild(popup);
    
    // Add event listeners to buttons using safer method
    safeAddEventListener('professional-btn', 'mousedown', (e) => {
      e.preventDefault();
      adjustTone('professional');
    });
    
    safeAddEventListener('casual-btn', 'mousedown', (e) => {
      e.preventDefault();
      adjustTone('casual');
    });
    
    safeAddEventListener('funny-btn', 'mousedown', (e) => {
      e.preventDefault();
      adjustTone('funny');
    });
    
    safeAddEventListener('enthusiastic-btn', 'mousedown', (e) => {
      e.preventDefault();
      adjustTone('enthusiastic');
    });
    
    safeAddEventListener('informational-btn', 'mousedown', (e) => {
      e.preventDefault();
      adjustTone('informational');
    });
    
    safeAddEventListener('fix-grammar-btn', 'mousedown', (e) => {
      e.preventDefault();
      fixGrammar();
    });
    
    safeAddEventListener('apply-btn', 'click', applyChanges);
    
    safeAddEventListener('reload-btn', 'click', () => {
      // Give message to reload the extension
      showError("Please reload the extension in Chrome's extension manager and refresh this page.");
    });
    
    return popup;
  }

  
    // Safe way to add event listeners to elements that might not exist
    function safeAddEventListener(elementId, eventType, handler) {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(eventType, handler);
      }
    }
  
    // Store selection when it happens
    function storeSelection() {
      const selection = window.getSelection();
      selectedText = selection.toString().trim();
      
      if (selectedText) {
        try {
          selectionRange = selection.getRangeAt(0).cloneRange(); // Clone to preserve selection
        } catch (e) {
          console.error("Failed to store selection range:", e);
        }
      }
    }
  
    // Handle text selection
    function handleTextSelection(e) {
      storeSelection();
      
      if (selectedText) {
        // Create popup if it doesn't exist
        if (!popupElement || !document.body.contains(popupElement)) {
          popupElement = createPopup();
        }
        
        // Determine if selection is inside an input or textarea
        let anchorElement = null;
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          anchorElement = active;
        }
        
        // Position popup
        let rect;
        if (anchorElement) {
          rect = anchorElement.getBoundingClientRect();
        } else if (selectionRange) {
          rect = selectionRange.getBoundingClientRect();
        }
        
        if (rect && popupElement) {
          popupElement.style.top = `${window.scrollY + rect.bottom + 10}px`;
          popupElement.style.left = `${window.scrollX + rect.left}px`;
          popupElement.classList.add('visible');
          
          // Hide containers
          hideElement('result-container');
          hideElement('error-container');
        }
      } else if (popupElement && document.body.contains(popupElement)) {
        // Check if click was outside the popup
        if (!popupElement.contains(e.target)) {
          popupElement.classList.remove('visible');
        }
      }
    }
  
    // Hide element by ID
    function hideElement(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.classList.add('hidden');
      }
    }
  
    // Show element by ID
    function showElement(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.classList.remove('hidden');
      }
    }
  
    // Prevent losing selection when clicking inside the popup
    function handlePopupClick(e) {
      if (popupElement && popupElement.contains(e.target)) {
        e.preventDefault();
      }
    }
  
    // Adjust tone of selected text
    function adjustTone(toneType) {
      console.log("Adjusting tone to:", toneType);
      
      if (!selectedText) {
        console.error("No text selected");
        return;
      }
      
      if (!checkExtensionValid()) {
        showExtensionInvalidError();
        return;
      }
      
      showElement('loading-indicator');
      hideElement('result-container');
      hideElement('error-container');
      
      let prompt;
      switch (toneType) {
        case 'professional':
          prompt = `Rewrite the following text in a professional tone while preserving its meaning: "${selectedText}"`;
          break;
        case 'casual':
          prompt = `Rewrite the following text in a casual, conversational tone while preserving its meaning: "${selectedText}"`;
          break;
        case 'funny':
          prompt = `Rewrite the following text in a funny, humorous tone while preserving its meaning: "${selectedText}"`;
          break;
        case 'enthusiastic':
          prompt = `Rewrite the following text in an enthusiastic, energetic tone while preserving its meaning: "${selectedText}"`;
          break;
        case 'informational':
          prompt = `Rewrite the following text in an informational, factual tone while preserving its meaning: "${selectedText}"`;
          break;
        default:
          prompt = `Rewrite the following text in a ${toneType} tone while preserving its meaning: "${selectedText}"`;
      }
      
      console.log("Sending prompt:", prompt);
      callGeminiAPI(prompt);
    }
  
    // Fix grammar of selected text
    function fixGrammar() {
      console.log("Fixing grammar");
      
      if (!selectedText) {
        console.error("No text selected");
        return;
      }
      
      if (!checkExtensionValid()) {
        showExtensionInvalidError();
        return;
      }
      
      showElement('loading-indicator');
      hideElement('result-container');
      hideElement('error-container');
      
      const prompt = `Fix any grammar errors in the following text while preserving its meaning and tone: "${selectedText}"`;
      
      console.log("Sending prompt:", prompt);
      callGeminiAPI(prompt);
    }
  
    // Show extension invalid error
    function showExtensionInvalidError() {
      hideElement('loading-indicator');
      hideElement('result-container');
      showElement('error-container');
      const errorText = document.getElementById('error-text');
      if (errorText) {
        errorText.textContent = "Extension has been updated or reloaded. Please refresh this page to continue.";
      }
    }
  
    // Call Gemini API
    function callGeminiAPI(prompt) {
      console.log("Calling Gemini API with prompt:", prompt);
      
      if (!checkExtensionValid()) {
        showExtensionInvalidError();
        return;
      }
      
      try {
        // Send message to background script to make the API call
        chrome.runtime.sendMessage(
          { action: 'callGeminiAPI', prompt: prompt },
          function(response) {
            // Check if the extension is still valid
            if (!checkExtensionValid()) {
              showExtensionInvalidError();
              return;
            }
            
            if (chrome.runtime.lastError) {
              console.error("Runtime error:", chrome.runtime.lastError);
              showError("Extension error: " + chrome.runtime.lastError.message);
              return;
            }
            
            console.log("Received response:", response);
            if (response && response.success) {
              
              showResult(response.result);
            } else {
              hideElement('loading-indicator');
              showError("Error: " + (response ? response.error : "No response from API"));
            }
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        if (error.message.includes("Extension context invalidated")) {
          showExtensionInvalidError();
        } else {
          hideElement('loading-indicator');
          showError("Extension error: " + error.message);
        }
      }
    }
  
    function showResult(text) {
      showElement('result-container');
      const resultText = document.getElementById('result-text');
      
      if (resultText) {
        resultText.textContent = text;
      }
      hideElement('loading-indicator');
    }
  
    function showError(message) {
      hideElement('loading-indicator');
      showElement('result-container');
      
      const resultText = document.getElementById('result-text');
      if (resultText) {
        resultText.textContent = message;
      }
    }
  
    // Apply changes to the original text
    function applyChanges() {
      const resultText = document.getElementById('result-text');
      if (!resultText) return;

      const newText = resultText.textContent;
      if (!newText) return;

      // Check if the active element is an input or textarea
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        const value = active.value;
        // Replace the selected text with the new text
        active.value = value.slice(0, start) + newText + value.slice(end);
        // Set the cursor after the new text
        active.selectionStart = active.selectionEnd = start + newText.length;
        if (popupElement) popupElement.classList.remove('visible');
        return;
      }

      // Fallback: replace selection in content-editable or normal text
      if (selectionRange) {
        try {
          selectionRange.deleteContents();
          selectionRange.insertNode(document.createTextNode(newText));
          if (popupElement) popupElement.classList.remove('visible');
        } catch (error) {
          console.error("Error applying changes:", error);
          showError("Failed to apply changes: " + error.message);
        }
      }
    }
  
    // Set up event listeners with reconnection capability
    function setupEventListeners() {
      // Clean up old listeners if necessary
      
      // Add new listeners
      document.addEventListener('mouseup', handleTextSelection);
      document.addEventListener('mousedown', handlePopupClick);
    }
  
    // Initialize the extension
    function initialize() {
      console.log("Content script initializing");
      setupEventListeners();
    }
  
    // Start the extension
    initialize();
  })();
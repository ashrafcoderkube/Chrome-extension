// content.js
(function() {
    // State variables
    let selectedText = '';
    let selectionRange = null;
    let popupElement = null;
    let miniButtonElement = null;
    let isExtensionValid = true;
    let isPopupOpen = false; // Track popup state
  
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
  
    // Create mini floating button that appears on text selection
    function createMiniButton() {
      // Remove existing mini button if present
      const existingMiniButton = document.getElementById('tone-adjuster-mini-button');
      if (existingMiniButton) {
        existingMiniButton.remove();
      }

      const miniButton = document.createElement('div');
      miniButton.id = 'tone-adjuster-mini-button';
      miniButton.innerHTML = `
        <div class="mini-button-icon">
          <svg width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fff" style="">
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path d="M21 2C6 2 4 16 3 22h1.998c.666-3.333 2.333-5.166 5.002-5.5 4-.5 7-4 8-7l-1.5-1 1-1c1-1 2.004-2.5 3.5-5.5z" fill="#fff" style=""></path>
    </g>
</svg>
        </div>
      `;
      document.body.appendChild(miniButton);

      // Add event listener to mini button
      miniButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPopup(e);
      });

      return miniButton;
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
        <div id="result-container" class="tone-adjuster-result">
          <div id="result-text">Reframing sentence...</div>
          <button id="apply-btn">Apply Changes</button>
        </div>
        <div class="tone-adjuster-buttons">
          <button id="professional-btn">Professional</button>
          <button id="casual-btn">Casual</button>
          <button id="funny-btn">Funny</button>
          <button id="enthusiastic-btn">Enthusiastic</button>
          <button id="informational-btn">Informational</button>
          <button id="fix-grammar-btn">Fix Grammar</button>
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
        e.stopPropagation(); // Prevent event bubbling
        adjustTone('professional');
      });
      
      safeAddEventListener('casual-btn', 'mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        adjustTone('casual');
      });
      
      safeAddEventListener('funny-btn', 'mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        adjustTone('funny');
      });
      
      safeAddEventListener('enthusiastic-btn', 'mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        adjustTone('enthusiastic');
      });
      
      safeAddEventListener('informational-btn', 'mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        adjustTone('informational');
      });
      
      safeAddEventListener('fix-grammar-btn', 'mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        fixGrammar();
      });
      
      safeAddEventListener('apply-btn', 'click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        applyChanges();
      });
      
      safeAddEventListener('reload-btn', 'click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        // Give message to reload the extension
        showError("Please reload the extension in Chrome's extension manager and refresh this page.");
      });
      
      // Add click handler to the popup itself to prevent closing
      popup.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      return popup;
    }

    // Show popup with default reframing
    function showPopup(e) {
      // Create popup if it doesn't exist
      if (!popupElement || !document.body.contains(popupElement)) {
        popupElement = createPopup();
      }
      
      // Position popup near the mini button
      if (miniButtonElement) {
        const rect = miniButtonElement.getBoundingClientRect();
        popupElement.style.top = `${window.scrollY + rect.bottom + 10}px`;
        popupElement.style.left = `${window.scrollX + rect.left}px`;
        popupElement.classList.add('visible');
        isPopupOpen = true; // Set popup state to open
        
        // Start default reframing
        fixGrammar();
      }
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
      // Don't process if click was inside popup
      if (popupElement && popupElement.contains(e.target)) {
        return;
      }
      
      storeSelection();
      
      if (selectedText) {
        // Create mini button if it doesn't exist
        if (!miniButtonElement || !document.body.contains(miniButtonElement)) {
          miniButtonElement = createMiniButton();
        }
        
        // Position mini button near the selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Check if we got a valid rect with dimensions
          if (rect && rect.width > 0 && rect.height > 0) {
            console.log("Positioning mini button at:", rect);
            miniButtonElement.style.top = `${window.scrollY + rect.bottom + 10}px`;
            miniButtonElement.style.left = `${window.scrollX + rect.left}px`;
            miniButtonElement.classList.add('visible');
            
            // Only hide popup if it's not being interacted with
            if (popupElement && !isPopupOpen) {
              popupElement.classList.remove('visible');
            }
          } else {
            // Fallback positioning if getBoundingClientRect returns empty rect
            const selectionCoords = getSelectionCoordinates();
            if (selectionCoords) {
              console.log("Using fallback positioning:", selectionCoords);
              miniButtonElement.style.top = `${window.scrollY + selectionCoords.bottom + 10}px`;
              miniButtonElement.style.left = `${window.scrollX + selectionCoords.left}px`;
              miniButtonElement.classList.add('visible');
            }
          }
        }
      } else {
        // Only hide elements if click was outside popup
        if (!popupElement || !popupElement.contains(e.target)) {
          // Hide mini button if no text is selected
          if (miniButtonElement) {
            miniButtonElement.classList.remove('visible');
          }
          
          // Check if click was outside the popup
          if (popupElement && !popupElement.contains(e.target)) {
            popupElement.classList.remove('visible');
            isPopupOpen = false; // Update popup state
          }
        }
      }
    }
    
    // Fallback method to get selection coordinates
    function getSelectionCoordinates() {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return null;
      
      const range = selection.getRangeAt(0);
      
      // Try to get position from the range
      let rect = range.getBoundingClientRect();
      
      // If that didn't work, try to get position from a temporary element
      if (rect.width === 0 && rect.height === 0) {
        // Create a temporary span
        const span = document.createElement('span');
        // Ensure span has some content so it has dimensions
        span.textContent = '.';
        
        // Insert the span into the range
        const tempRange = range.cloneRange();
        tempRange.insertNode(span);
        
        // Get the position of the span
        rect = span.getBoundingClientRect();
        
        // Clean up
        span.parentNode.removeChild(span);
      }
      
      return {
        left: rect.left,
        top: rect.top,
        bottom: rect.bottom
      };
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
      if ((popupElement && popupElement.contains(e.target)) || 
          (miniButtonElement && miniButtonElement.contains(e.target))) {
        e.preventDefault();
        e.stopPropagation();
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
      hideElement('error-container');
      
      const prompt = `Fix any grammar errors in the following text while preserving its meaning and tone: "${selectedText}"`;
      
      console.log("Sending prompt:", prompt);
      callGeminiAPI(prompt);
    }
  
    // Show extension invalid error
    function showExtensionInvalidError() {
      hideElement('loading-indicator');
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
      const resultText = document.getElementById('result-text');
      
      if (resultText) {
        resultText.textContent = text;
      }
      hideElement('loading-indicator');
    }
  
    function showError(message) {
      hideElement('loading-indicator');
      showElement('error-container');
      
      const errorText = document.getElementById('error-text');
      if (errorText) {
        errorText.textContent = message;
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
        isPopupOpen = false; // Update popup state
        if (miniButtonElement) miniButtonElement.classList.remove('visible');
        return;
      }

      // Fallback: replace selection in content-editable or normal text
      if (selectionRange) {
        try {
          selectionRange.deleteContents();
          selectionRange.insertNode(document.createTextNode(newText));
          if (popupElement) popupElement.classList.remove('visible');
          isPopupOpen = false; // Update popup state
          if (miniButtonElement) miniButtonElement.classList.remove('visible');
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
      
      // Add global click listener to prevent popup from closing
      document.addEventListener('click', function(e) {
        if (popupElement && popupElement.classList.contains('visible') && !popupElement.contains(e.target) && !miniButtonElement.contains(e.target)) {
          // Only close if click is outside popup and mini button
          if (!isPopupOpen) {
            popupElement.classList.remove('visible');
          }
        }
      }, true); // Use capture phase
    }
  
    // Initialize the extension
    function initialize() {
      console.log("Content script initializing");
      setupEventListeners();
      
      // Add CSS for mini button and popup
      const style = document.createElement('style');
      style.textContent = `
        #tone-adjuster-mini-button {
          position: absolute;
          z-index: 10000;
          background-color:rgb(0, 0, 0);
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        #tone-adjuster-mini-button.visible {
          opacity: 1;
        }
        
        #tone-adjuster-popup {
          position: absolute;
          z-index: 10001;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          width: 300px;
          padding: 12px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        
        #tone-adjuster-popup.visible {
          opacity: 1;
          pointer-events: auto;
        }
        
        .hidden {
          display: none !important;
        }
        
        /* Add styles for buttons to prevent accidental clicks */
        #tone-adjuster-popup button {
          margin: 5px;
          padding: 8px 12px;
          cursor: pointer;
        }
        
        .tone-adjuster-header {
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #eee;
        }
        
        .tone-adjuster-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
        }
      `;
      document.head.appendChild(style);
    }
  
    // Start the extension
    initialize();
  })();
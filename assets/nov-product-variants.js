class ProductVariantDropdown extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  connectedCallback() {
    console.log('[connectedCallback] Component connected to DOM');
    console.log('[connectedCallback] Select elements available:', this.querySelectorAll('select').length);
    
    const form = document.getElementById(`product-form-${this.dataset.productId}`);
    if (!form) {
      console.warn('[connectedCallback] Form not found!');
      return;
    }
    
    // Listen for pack size radio button changes
    const packGroup = form.querySelector('.mdw-packung-group');
    if (packGroup) {
      const packRadios = packGroup.querySelectorAll('input[name="mdw_packung"]');
      packRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          console.log('[connectedCallback] Pack size changed to:', radio.value);
          this.updateOptions();
          this.updateMasterId();
          if (this.currentVariant) {
            this.updateVariantInput();
          }
        });
      });
    }
    
    // Form-Submit-Listener: Prüft und korrigiert Varianten-ID vor dem Absenden
    form.addEventListener('submit', (e) => {
      console.log('[FORM SUBMIT] Form submission intercepted');
      
      // Ensure we have the latest options
      this.updateOptions();
      this.updateMasterId();
      
      const variantInput = form.querySelector('input[name="id"]');
      if (!variantInput) {
        console.error('[FORM SUBMIT] ❌ No variant input field found!');
        return;
      }
      
      const currentVariantId = variantInput.value;
      console.log('[FORM SUBMIT] Current variant ID in input:', currentVariantId);
      console.log('[FORM SUBMIT] Current selected options:', this.options);
      console.log('[FORM SUBMIT] Current variant from matching:', this.currentVariant ? this.currentVariant.id : 'NONE');
      
      // If we found a matching variant, use it
      if (this.currentVariant) {
        if (currentVariantId !== this.currentVariant.id.toString()) {
          console.warn('[FORM SUBMIT] ⚠️ MISMATCH! Updating variant ID from', currentVariantId, 'to', this.currentVariant.id);
          variantInput.value = this.currentVariant.id;
        } else {
          console.log('[FORM SUBMIT] ✓ Variant ID is correct:', this.currentVariant.id);
        }
      } else {
        // Try to find variant based on select values only (fallback)
        console.warn('[FORM SUBMIT] ⚠️ No variant found via matching, trying fallback...');
        const variantData = this.getVariantData();
        const fallbackVariant = this.findVariantFallback(variantData);
        
        if (fallbackVariant) {
          console.log('[FORM SUBMIT] ✓ Fallback variant found:', fallbackVariant.id);
          variantInput.value = fallbackVariant.id;
        } else {
          console.error('[FORM SUBMIT] ❌ No variant found! Cannot submit.');
          e.preventDefault();
          alert('Bitte wähle eine gültige Variante aus.');
          return false;
        }
      }
    }, true); // Use capture phase to catch it early
    
    // Button-Click-Listener als Backup: Aktualisiert Varianten-ID vor dem Submit
    const addButton = form.querySelector('[name="add"]');
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        console.log('[BUTTON CLICK] Add to cart button clicked');
        
        // Update options and variant before submit
        this.updateOptions();
        this.updateMasterId();
        
        const variantInput = form.querySelector('input[name="id"]');
        if (variantInput && this.currentVariant) {
          const oldValue = variantInput.value;
          variantInput.value = this.currentVariant.id;
          console.log('[BUTTON CLICK] Updated variant ID from', oldValue, 'to', this.currentVariant.id);
        } else if (variantInput && !this.currentVariant) {
          console.warn('[BUTTON CLICK] ⚠️ No variant found, trying fallback...');
          const variantData = this.getVariantData();
          const fallbackVariant = this.findVariantFallback(variantData);
          if (fallbackVariant) {
            variantInput.value = fallbackVariant.id;
            console.log('[BUTTON CLICK] Fallback variant set:', fallbackVariant.id);
          }
        }
      }, true); // Use capture phase
    }
    
    // Check initial state after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.updateOptions();
      console.log('[connectedCallback] Initial options after timeout:', this.options);
      this.updateMasterId();
      if (this.currentVariant) {
        console.log('[connectedCallback] Initial variant found:', this.currentVariant.id);
        this.updateVariantInput();
      } else {
        console.warn('[connectedCallback] No initial variant found!');
      }
    }, 100);
  }
  
  // Fallback-Methode: Versucht Variante zu finden, auch wenn Packungsgröße fehlt
  findVariantFallback(variantData) {
    if (!this.options || this.options.length === 0) {
      console.warn('[findVariantFallback] No options available');
      return null;
    }
    
    console.log('[findVariantFallback] Trying to find variant with options:', this.options);
    
    // Try to find variant by matching available options
    // First, try exact match with all options
    let foundVariant = variantData.find((variant) => {
      if (!variant.options || variant.options.length !== this.options.length) {
        return false;
      }
      
      // Match all options at their respective indices
      return this.options.every((selectedOption, index) => {
        // If option is empty, skip it (might be pack size)
        if (!selectedOption || selectedOption === '') {
          return true; // Allow empty options to match
        }
        return variant.options[index] === selectedOption;
      });
    });
    
    if (foundVariant) {
      console.log('[findVariantFallback] ✓ Found variant with exact match:', foundVariant.id);
      return foundVariant;
    }
    
    // If no exact match, try matching only non-empty options
    const nonEmptyOptions = this.options
      .map((opt, index) => ({ value: opt, index }))
      .filter(item => item.value && item.value !== '');
    
    console.log('[findVariantFallback] Trying with non-empty options only:', nonEmptyOptions);
    
    foundVariant = variantData.find((variant) => {
      if (!variant.options) return false;
      
      // Check if all non-empty selected options match the variant
      return nonEmptyOptions.every(({ value, index }) => {
        return variant.options[index] === value;
      });
    });
    
    if (foundVariant) {
      console.log('[findVariantFallback] ✓ Found variant with partial match:', foundVariant.id);
      return foundVariant;
    }
    
    console.error('[findVariantFallback] ✗ No variant found with fallback method');
    return null;
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.updateVariantStatuses();
    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateVariantInput();
      this.renderProductInfo();
      if (document.querySelectorAll('.template-product').length && !this.closest('#content_quickview')) {
        this.updateURL();
      }
    }
  }

  updateOptions() {
    // Read all select elements
    const selects = Array.from(this.querySelectorAll('select'));
    this.options = selects.map((select) => select.value);
    
    // Debug: Log what we're reading from selects
    console.log('[updateOptions] Select elements found:', selects.length);
    console.log('[updateOptions] Options array:', this.options);
    console.log('[updateOptions] Select values:', selects.map(s => ({ id: s.id, value: s.value, display: window.getComputedStyle(s).display })));
    
    // Check if there's a pack size option that's hidden but managed by radio buttons
    const form = document.getElementById(`product-form-${this.dataset.productId}`);
    if (form) {
      const packGroup = form.querySelector('.mdw-packung-group');
      if (packGroup) {
        const packIndex = parseInt(packGroup.dataset.packIndex);
        const packRadio = packGroup.querySelector('input[name="mdw_packung"]:checked');
        
        if (packRadio && packIndex >= 0 && packIndex < this.options.length) {
          const packValue = packRadio.value;
          console.log('[updateOptions] Found pack radio button, updating option at index', packIndex, 'from', this.options[packIndex], 'to', packValue);
          this.options[packIndex] = packValue;
        } else if (packRadio && packIndex >= 0) {
          // If packIndex is beyond current options array, we need to insert it
          console.log('[updateOptions] Pack index', packIndex, 'is beyond options array. Current length:', this.options.length);
          // Ensure array is large enough
          while (this.options.length <= packIndex) {
            this.options.push('');
          }
          this.options[packIndex] = packRadio.value;
        }
      }
    }
    
    console.log('[updateOptions] Final options array after pack check:', this.options);
  }

  updateMasterId() {
    const variantData = this.getVariantData();
    
    // Debug: Log initial state
    console.log('[updateMasterId] Current options:', this.options);
    console.log('[updateMasterId] Options array length:', this.options ? this.options.length : 0);
    console.log('[updateMasterId] Variant data count:', variantData.length);
    console.log('[updateMasterId] First variant sample:', variantData[0] ? { id: variantData[0].id, options: variantData[0].options } : 'none');
    
    // Ensure options array is initialized
    if (!this.options || this.options.length === 0) {
      console.warn('[updateMasterId] Options array is empty, trying to update...');
      this.updateOptions();
    }
    
    this.currentVariant = variantData.find((variant) => {
      // Check if variant has the same number of options
      if (!variant.options || variant.options.length !== this.options.length) {
        console.log(`[updateMasterId] Variant ${variant.id} has ${variant.options?.length || 0} options, but we have ${this.options.length}`);
        return false;
      }
      
      const matches = variant.options.map((option, index) => {
        const selectedOption = this.options[index];
        const isMatch = selectedOption === option;
        if (!isMatch) {
          console.log(`[updateMasterId] Mismatch at index ${index}: selected="${selectedOption}" vs variant="${option}"`);
        }
        return isMatch;
      });
      const allMatch = !matches.includes(false);
      if (allMatch) {
        console.log('[updateMasterId] ✓ Found matching variant:', { id: variant.id, options: variant.options });
      }
      return allMatch;
    });
    
    if (!this.currentVariant) {
      console.error('[updateMasterId] ✗ NO VARIANT FOUND!');
      console.error('[updateMasterId] Selected options:', this.options);
      console.error('[updateMasterId] Options array length:', this.options ? this.options.length : 0);
      console.error('[updateMasterId] Available variants:', variantData.map(v => ({ 
        id: v.id, 
        options: v.options, 
        optionsLength: v.options ? v.options.length : 0 
      })));
      
      // Check what the hidden input currently has
      const hiddenInput = document.getElementById('variant_id');
      if (hiddenInput) {
        console.error('[updateMasterId] Current hidden input value:', hiddenInput.value);
      }
      
      // Try fallback method
      console.log('[updateMasterId] Trying fallback method...');
      const fallbackVariant = this.findVariantFallback(variantData);
      if (fallbackVariant) {
        console.log('[updateMasterId] ✓ Fallback variant found:', fallbackVariant.id);
        this.currentVariant = fallbackVariant;
      } else {
        console.error('[updateMasterId] ✗ Fallback also failed - no variant found');
      }
    } else {
      console.log('[updateMasterId] ✓ Selected variant ID:', this.currentVariant.id);
    }
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant?.featured_media) return;
    const newMedia = document.querySelector(
      `[data-media-id="${this.dataset.productId}-${this.currentVariant.featured_media.id}"]`
    );
    if (!newMedia) return;
    const parent = newMedia.parentElement;
    const itemact = document.querySelectorAll('.proFeaturedImage .item');
    for (var i = 0; i < itemact.length; i++) {
      itemact[i].classList.remove('act')
    }
    newMedia.classList.add('act');
    window.setTimeout(() => { parent.scroll(0, 0) });
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${this.dataset.productUrl}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.productId}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (input) {
        console.log('[updateVariantInput] Updating input from', input.value, 'to', this.currentVariant.id);
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.warn('[updateVariantInput] No input field found!');
      }
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(variant => this.querySelector(':checked').value === variant.option1);
    const inputWrappers = [...this.querySelectorAll('fieldset')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')]
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter(variant => variant.available && variant[`option${ index }`] === previousOptionSelected).map(variantOption => variantOption[`option${ index + 1 }`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue)
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.productId;
    fetch(`${this.dataset.productUrl}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.productId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const id = `ProductPrice-${this.dataset.productId}`;
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(id);
        const source = html.getElementById(id);
        if (source && destination) destination.innerHTML = source.innerHTML;
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.notify_me);
        const variant_id = document.getElementById("variant_id").getAttribute('value');
        const sku = document.getElementById("productSelect").querySelector('[value="'+variant_id+'"]').getAttribute('data-sku');
        const variantSku = document.getElementById('variantSku');
        if (typeof variantSku !== 'undefined' && variantSku) {
          variantSku.innerHTML = sku;
        }
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.productId}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > #AddToCartText');
    const addButtonParent = productForm.querySelector('.product-form__item--submit');
    const addButton2 = productForm.querySelector('.product-form__item--checkout');
    if (!addButton) return;

    if (disable) {
      if (text) addButtonParent.setAttribute('data-toggle', 'modal');
      if (text) addButtonParent.setAttribute('data-target', '#Form_newletter');
      if (text) addButtonParent.classList.add('soldout');
      if (text) addButtonText.textContent = text;
      if (!addButton2) return;
      addButton2.setAttribute('disabled', true);
    } else {
      const variant_id = document.getElementById("variant_id").getAttribute('value');
      const inventoryPolicy = document.getElementById("productSelect").querySelector('[value="'+variant_id+'"]').getAttribute('data-inventory_policy');
      const inventoryManagement = document.getElementById("productSelect").querySelector('[value="'+variant_id+'"]').getAttribute('data-inventory_management');
      if(inventoryPolicy == 'continue' && inventoryManagement == 'shopify' ) {
        addButtonText.textContent = window.variantStrings.preorder;
      } else {
        addButtonText.textContent = window.variantStrings.addToCart;
      }
      addButtonParent.classList.remove('soldout');
      addButtonParent.removeAttribute('data-toggle');
      addButtonParent.removeAttribute('data-target');
      if (!addButton2) return;
      addButton2.removeAttribute('disabled');
    }
    if (!modifyClass) return;
  }
  setUnavailable() {
    const addButton = document.getElementById(`product-form-${this.dataset.productId}`)?.querySelector('[name="add"]');
    const addButtonText = addButton.querySelector('#AddToCartText');
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
customElements.define('product-variant-dropdown', ProductVariantDropdown);

class ProductVariantSwatch extends ProductVariantDropdown {
  constructor() {
    super();
  }
  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }
  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('product-variant-swatch', ProductVariantSwatch);

class ProductVariantSelectsStick extends ProductVariantDropdown {
  constructor() {
    super();
  }
  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-sticky-${this.dataset.productId}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  renderProductInfo() {
    fetch(`${this.dataset.productUrl}?variant=${this.currentVariant.id}&section_id=${this.dataset.productId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const id = `ProductPriceStick-${this.dataset.productId}`;
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(id);
        const source = html.getElementById(id);
        if (source && destination) destination.innerHTML = source.innerHTML;
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.notify_me);
      });
  }
  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-sticky-${this.dataset.productId}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > #AddToCartText');
    const addButtonParent = productForm.querySelector('.product-form__item--submit');
    const addButton2 = productForm.querySelector('.product-form__item--checkout');
    if (!addButton) return;

    if (disable) {
      if (text) addButtonParent.setAttribute('data-toggle', 'modal');
      if (text) addButtonParent.setAttribute('data-target', '#Form_newletter');
      if (text) addButtonParent.classList.add('soldout');
      if (text) addButtonText.textContent = text;
      if (!addButton2) return;
      addButton2.setAttribute('disabled', true);
    } else {
      const variant_id = document.getElementById("variant_id").getAttribute('value');
      const inventoryPolicy = document.getElementById("productSelect").querySelector('[value="'+variant_id+'"]').getAttribute('data-inventory_policy');
      const inventoryManagement = document.getElementById("productSelect").querySelector('[value="'+variant_id+'"]').getAttribute('data-inventory_management');
      if(inventoryPolicy == 'continue' && inventoryManagement == 'shopify' ) {
        addButtonText.textContent = window.variantStrings.preorder;
      } else {
        addButtonText.textContent = window.variantStrings.addTobag;
      }
      addButtonParent.classList.remove('soldout');
      addButtonParent.removeAttribute('data-toggle');
      addButtonParent.removeAttribute('data-target');
      if (!addButton2) return;
      addButton2.removeAttribute('disabled');
    }
    if (!modifyClass) return;
  }
  setUnavailable() {
    const addButton = document.getElementById(`product-form-sticky-${this.dataset.productId}`)?.querySelector('[name="add"]');
    const addButtonText = addButton.querySelector('#AddToCartText');
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
  }
}

customElements.define('product-variant-selects-stick', ProductVariantSelectsStick);

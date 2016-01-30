"use strict";

let folds = [];


/**
 * Represents a single panel of togglable content inside an Accordion.
 *
 * @class
 */
class Fold{
	
	/**
	 * Instantiate a new Fold instance.
	 *
	 * @param {Accordion} accordion
	 * @param {HTMLElement} el
	 * @constructor
	 */
	constructor(accordion, el){
		let heading      = el.firstElementChild;
		let content      = el.lastElementChild;

		this.index       = folds.push(this) - 1;
		this.accordion   = accordion;
		this.el          = el;
		this.heading     = heading;
		this.content     = content;
		this.openClass   = accordion.openClass;
		this.closeClass  = accordion.closeClass;
		this.ariaEnabled = !accordion.noAria;
		el.accordionFold = this.index;
		
		
		/** Keyboard navigation */
		if(!accordion.noKeys){
			heading.tabIndex = 0;
			heading.addEventListener("keydown", this.onKeyDown = e => {
				const key = e.keyCode;
				let fold;
				
				switch(key){
					
					/** Enter: Toggle */
					case 13: {
						this.open = !this.open;
						break;
					}
					
					/** Escape: Clear focus */
					case 27:{
						e.target.blur();
						break;
					}
					
					
					/** Up arrow: Previous section */
					case 38:{
						
						/** Is there a previous sibling to navigate up to? */
						if(fold = this.previousFold){
							let children = fold.childAccordions;
							
							/** Is it open, and does it have nested accordions? */
							if(fold.open && children){
								let lastAcc;
								let lastFold;
								
								/** Locate the deepest/nearest accordion that's currently exposed */
								while(children){
									lastAcc  = children[children.length - 1];
									lastFold = lastAcc.folds[lastAcc.folds.length - 1];
									if(!lastFold.open) break;
									children = lastFold.childAccordions;
								}
								
								lastFold.heading.focus();
							}
							
							/** Nope */
							else fold.heading.focus();
						}
						
						/** Is there a higher level we can jump back up to? */
						else if(this.accordion.parent)
							this.accordion.parentFold.heading.focus();
						
						/** There's nothing to move back to, so just let the browser run its usual behaviour */
						else return true;
						
						e.preventDefault();
						return false;
						break;
					}
					
					
					
					/** Down arrow: Next section */
					case 40:{
						const children = this.childAccordions;
						
						/** Is there a nested accordion to jump into? */
						if(this.open && children)
							children[0].folds[0].heading.focus();
						
						/** No, there isn't. Is there another sibling to move down to? */
						else if(fold = this.nextFold)
							fold.heading.focus();
						
						/** Is there a containing accordion we can navigate back up to? */
						else if(this.accordion.parent){
							let parent = this;
							while(parent = parent.accordion.parentFold)
								if(fold = parent.nextFold){
									fold.heading.focus();
									break;
								}
							
							/** Nowhere left to go... */
							if(!parent) return true;
						}
						
						/** Nah. Just scroll the window normally, as per browser default */
						else return true;
						
						e.preventDefault();
						return false;
						break;
					}
					
					
					/** Left arrow */
					case 37:{
						
						/** Close an opened section */
						if(this.open) this.open = false;
						
						/** Switch focus back to parent */
						else if(this.accordion.parent)
							this.accordion.parentFold.heading.focus();
						
						break;
					}
					
					/** Right arrow */
					case 39:{
						
						/** Open a closed section */
						if(!this.open) this.open = true;
						
						/** Switch focus to a nested accordion */
						else if(this.childAccordions)
							this.childAccordions[0].folds[0].heading.focus();
						
						break;
					}
				}
			});
		}
		
		
		/** Listener to record the viewport's scroll offsets at the beginning of a touch */
		let scrollX, scrollY;
		touchEnabled && heading.addEventListener("touchstart", this.onTouchStart = e => {
			scrollX = window.pageXOffset;
			scrollY = window.pageYOffset;
		});
		
		
		heading.addEventListener(pressEvent, this.onPress = e => {
			if(e.type !== "touchend" || (e.cancelable && window.pageXOffset === scrollX && window.pageYOffset === scrollY)){
				this.open = !this.open;
				e.preventDefault();
			}
			return false;
		});
	}
	
	
	
	/**
	 * Adjust a fold's container to fit its content.
	 */
	fit(){
		let height = this.headingHeight;
		if(this.open)
			height += this.contentHeight;
		this.height = height;
	}
	
	
	
	/**
	 * Add or remove relevant ARIA attributes from the fold's elements.
	 *
	 * @property
	 * @type {Boolean}
	 */
	get ariaEnabled(){ return this._ariaEnabled; }
	set ariaEnabled(input){
		if((input = !!input) !== !!this._ariaEnabled){
			const heading = this.heading;
			const content = this.content;
			this._ariaEnabled = input;
			
			/** Enable ARIA-attribute management */
			if(input){
				heading.setAttribute("role", "tab");
				content.setAttribute("role", "tabpanel");
				
				
				/** Ensure the fold's elements have unique ID attributes. */
				const headingSuffix = "-heading";
				const contentSuffix = "-content";
				let elID            = this.el.id;
				let id;
				
				/** Neither of the fold's elements have an ID attribute */
				if(!heading.id && !content.id){
					id             = elID || uniqueID("a");
					heading.id     = id + headingSuffix;
					content.id     = id + contentSuffix;
				}
				
				/** Either the heading or element lack an ID */
				else if(!content.id) content.id   = (elID || heading.id) + contentSuffix;
				else if(!heading.id) heading.id   = (elID || content.id) + headingSuffix;
				
				/** Finally, double-check each element's ID is really unique */
				const $ = s => document.querySelectorAll("#"+s);
				while($(content.id).length > 1 || $(heading.id).length > 1){
					id         = uniqueID("a");
					content.id = id + contentSuffix;
					heading.id = id + headingSuffix;
				}
				
				/** Update ARIA attributes */
				heading.setAttribute("aria-controls",    content.id);
				content.setAttribute("aria-labelledby",  heading.id);
				
				
				/** Update the attributes that're controlled by .open's setter */
				heading.setAttribute("aria-selected",  this._open);
				heading.setAttribute("aria-expanded",  this._open);
				content.setAttribute("aria-hidden",   !this._open);
			}
			
			/** Disabling; remove all relevant attributes */
			else{
				heading.removeAttribute("role");
				heading.removeAttribute("aria-controls");
				heading.removeAttribute("aria-selected");
				heading.removeAttribute("aria-expanded");
				
				content.removeAttribute("role");
				content.removeAttribute("aria-labelledby");
				content.removeAttribute("aria-hidden");
			}
		}
	}
	
	
	
	/**
	 * Whether or not the fold's currently opened.
	 *
	 * @property
	 * @type {Boolean}
	 */
	get open(){
		
		/** Derive the fold's opened state from the DOM if it's not been determined yet */
		if(undefined === this._open){
			let classes = this.el.classList;
			let open    = classes.contains(this.openClass);
			classes.toggle(this.closeClass, !open);
			return (this._open = open);
		}
		
		return this._open;
	}
	
	set open(input){
		if((input = !!input) !== this._open){
			this.el.classList.toggle(this.openClass,   input);
			this.el.classList.toggle(this.closeClass, !input);
			this._open = input;
			
			/** Update ARIA attributes */
			if(this.ariaEnabled){
				const heading = this.heading;
				heading.setAttribute("aria-selected",      input);
				heading.setAttribute("aria-expanded",      input);
				this.content.setAttribute("aria-hidden",  !input);
			}
			
			
			/** If this fold was closed when the screen resized, run a full update in case its contents were juggled around */
			if(this.needsRefresh){
				delete this.needsRefresh;
				this.accordion.refresh();
			}
			else this.accordion.update();
		}
	}
	
	
	
	/**
	 * Whether the fold's been deactivated.
	 *
	 * Not set directly; changed when setting an accordion's .disabled property.
	 *
	 * @property
	 * @type {Boolean}
	 */
	get disabled(){ return this._disabled }
	set disabled(input){
		if((input = !!input) !== !!this._disabled){
			let heading = this.heading;
			let style   = this.el.style;
			let classes = this.el.classList;
			
			/** Deactivated */
			if(this._disabled = input){
				style.height =
				style.top    = null;
				
				touchEnabled && heading.removeEventListener("touchstart", this.onTouchStart);
				heading.removeEventListener(pressEvent, this.onPress);
				classes.remove(this.openClass, this.closeClass);
				if(this.onKeyDown){
					heading.removeEventListener("keydown", this.onKeyDown);
					heading.removeAttribute("tabindex");
				}
				
				if(this.ariaEnabled){
					this.ariaEnabled  = false;
					this._ariaEnabled = true;
				}
			}
			
			/** Reactivated */
			else{
				style.height = this._height + "px";
				style.top    = this._y      + "px";
				touchEnabled && heading.addEventListener("touchstart", this.onTouchStart);
				heading.addEventListener(pressEvent, this.onPress);
				
				if(this.onKeyDown){
					heading.addEventListener("keydown", this.onKeyDown);
					heading.tabIndex = 0;
				}
			}
		}
	}
	
	
	/**
	 * Vertical position of the fold within an accordion's container.
	 *
	 * @property
	 * @type {Number}
	 */
	get y(){
		if(undefined === this._y)
			return (this._y = parseInt(this.el.style.top) || 0);
		return this._y;
	}
	
	set y(input){
		if((input = +input) !== this._y){
			this.el.style.top  = input + "px";
			this._y            = input;
		}
	}
	
	
	
	/**
	 * Height of the fold's outermost container.
	 *
	 * @property
	 * @type {Number}
	 */
	get height(){
		if(undefined === this._height){
			let height           = this.headingHeight + this.contentHeight;
			this.el.style.height = height + "px";
			return (this._height = height);
		}
		return this._height;
	}
	
	set height(input){
		if(input && (input = +input) !== this._height){
			this.el.style.height = input + "px"
			this._height         = input;
		}
	}
	
	
	/**
	 * Current height of the fold's heading.
	 *
	 * @type {Number}
	 * @readonly
	 */
	get headingHeight(){
		return this.heading.scrollHeight;
	}
	
	
	/**
	 * Current height of the fold's content.
	 *
	 * @type {Number}
	 * @readonly
	 */
	get contentHeight(){
		return this.content.scrollHeight;
	}
	
	
	/**
	 * Current height of the fold's container element.
	 *
	 * @type {Number}
	 * @readonly
	 */
	get totalHeight(){
		return this.el.scrollHeight;
	}
	
	
	/**
	 * Whether the fold's container has been resized incorrectly.
	 *
	 * @type {Boolean}
	 * @readonly
	 * @property
	 */
	get wrongSize(){
		return this.headingHeight + this.contentHeight !== this.totalHeight;
	}
}

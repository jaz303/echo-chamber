!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.EchoChamber=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var du = _dereq_('domutil');

module.exports = Console;

var S_INIT              = 0,
    S_INPUT             = 1,
    S_PROCESSING        = 2;

var DEFAULT_PROMPT      = '> ';
var DEFAULT_PROMPT_NONE = null;
var ECHO_HANDLER        = function(console, cmd) { console.print(cmd); console.newline(); }

//
// Space Handling

var VISUAL_SPACE        = String.fromCharCode(160);
var RE_VS               = new RegExp(VISUAL_SPACE, 'g');
var RE_LS               = / /g;

function logicalSpaceToVisualSpace(ch) {
    return ch === ' ' ? VISUAL_SPACE : ch;
}

function replaceLogicalSpaceWithVisualSpace(str) {
    return str.replace(RE_LS, VISUAL_SPACE);
}

function replaceVisualSpaceWithLogicalSpace(str) {
    return str.replace(RE_VS, ' ');
}

/**
 * Constructor.
 *
 */
function Console(el, opts) {

    opts = opts || {};

    this.root           = el;
    this.state          = S_INIT;
    this._textarea      = null;
    this._prompt        = null;
    this._handler       = opts.handler || ECHO_HANDLER;
    this._cursor        = null;
    this._inputLine     = null;

    var needsTextarea = ('capabilities' in opts) ? !!(opts.capabilities.touch) : false;
    var tabIndex = opts.tabIndex || 0;
    
    if (needsTextarea) {
        this._textarea = document.createElement('textarea');
        this._textarea.setAttribute('tabindex', tabIndex);
        this.root.appendChild(this._textarea);
        this._bind(this._textarea);
    } else {
        this.root.setAttribute('tabindex', tabIndex);
        this._bind(this.root);
    }

    if ('prompt' in opts) {
        this._prompt = opts.prompt || DEFAULT_PROMPT_NONE;
    } else {
        this._prompt = DEFAULT_PROMPT;
    }

    if ('greeting' in opts) {
        this.print(opts.greeting);
    }

    this.newline();

}

//
// Public API

Console.prototype.getInput = function() {
    
    if (this.state !== S_INPUT)
        throw new Error("cannot get console input - illegal state");

    return replaceVisualSpaceWithLogicalSpace(
        this._getRawInputFromElement(this._inputLine)
    );
    
}

Console.prototype.print = function(str) {

    if (!str) return;
    
    var start = 0, end = str.indexOf("\n", start);
    while (end >= 0) {
        this._appendLine(str.substring(start, end));
        start = end + 1;
        end = str.indexOf("\n", start);
    }
    
    this._appendLine(str.substr(start));

}

Console.prototype.append = function(el, className) {
    this._appendElement(el, className);
}

Console.prototype.clearInput = function() {

    if (this.state !== S_INPUT) return;

    var l = this._inputLine,
        s = l.hasPrompt ? 1 : 0,
        v = l.childNodes.length - 2;

    while (v >= s) {
        l.removeChild(l.childNodes[v--]);
    }

    this._cursor = l.childNodes[s];
    this._cursor.className = 'cursor';

}

Console.prototype.newline = function() {

    //
    // If there's existing input, replace the existing div-of-spans with
    // a single text node.

    if (this._inputLine) {
        
        var input = this._getRawInputFromElement(this._inputLine);
        
        var max = this._inputLine.hasPrompt ? 1 : 0;
        while (this._inputLine.childNodes.length > max) {
            this._inputLine.removeChild(this._inputLine.lastChild);
        }

        this._inputLine.appendChild(document.createTextNode(input));
        this._inputLine.appendChild(document.createElement('br'));

        du.removeClass(this._inputLine, 'input');
    
    }

    //
    // Create new input container with prompt/cursor
    
    this._inputLine = document.createElement('div');
    this._inputLine.className = 'item text input';

    var prompt = this._generatePrompt();
    if (prompt) {
        prompt.className = 'prompt';
        this._inputLine.appendChild(prompt);
        this._inputLine.hasPrompt = true;
    } else {
        this._inputLine.hasPrompt = false;
    }
    
    this._cursor = document.createElement('span');
    this._cursor.textContent = VISUAL_SPACE;
    this._cursor.className = 'cursor';
    this._inputLine.appendChild(this._cursor);
    
    this.root.appendChild(this._inputLine);
    
    this._scrollToBottom();

    this.state = S_INPUT;

}

Console.prototype.focus = function() {
    if (this._textarea) {
        this._textarea.focus();    
    } else {
        this.root.focus();
    }
}

//
// Key handlers

Console.prototype._keydown = function(evt) {
    switch (evt.keyCode) {
        case 8:
            evt.preventDefault();
            if (this.state === S_INPUT) {
                this._backspace();
            }
            break;
        case 37: /* left */
            evt.preventDefault();
            if (this.state === S_INPUT) {
                this._cursorLeft();
            }
            break;
        case 38: /* up */
            // TODO: history
            break;
        case 39: /* right */
            evt.preventDefault();
            if (this.state === S_INPUT) {
                this._cursorRight();
            }
            break;
        case 40: /* down */
            // TODO: history management
            break;
    }
}

Console.prototype._keyup = function(evt) {
    switch (evt.keyCode) {
        case 27: /* escape */
            evt.preventDefault();
            if (this.state === S_INPUT) {
                this.clearInput();
            } else if (this.state === S_PROCESSING) {
                // send cancel message to handler?
            }
            break;
    }
}

Console.prototype._keypress = function(evt) {
    var input, result;

    if (this.state === S_INPUT) {

        if (evt.charCode === 13 || evt.keyCode === 13) {
            evt.preventDefault();
            this._clearSelection();
            input = this.getInput();
            this.state = S_PROCESSING;
            this._handler(this, input);
            return;
        }

        switch (evt.charCode) {
            case 32: /* space - insert &nbsp; */
                evt.preventDefault();
                this._clearSelection();
                this._insertStringBeforeCursor(VISUAL_SPACE);
                break;
            default:
                // TODO: ignore if meta-key (alt, option, cmd) is engaged
                if (evt.charCode > 32 && evt.charCode < 127) {
                    evt.preventDefault();
                    this._clearSelection();
                    this._insertStringBeforeCursor(String.fromCharCode(evt.charCode));
                } else {
                    console.log("whoops - keypress received non-printable value");
                }
        }
    }
}

//
// 

Console.prototype._getRawInputFromElement = function(el) {

    var str = '',
        m   = el.childNodes.length - 1,
        s   = el.hasPrompt ? 1 : 0;

    while (s < m) {
        str += el.childNodes[s++].textContent;
    }
    
    return str;

}

Console.prototype._generatePrompt = function() {

    var prompt = this._prompt;

    if (typeof prompt === 'function') {
        prompt = prompt(this);
    }

    if (typeof prompt === 'string') {
        var node = document.createElement('span');
        node.textContent = prompt; // TODO: du.setText() when ready
        prompt = node;
    }

    return prompt;

}

Console.prototype._scrollToBottom = function() {
    this.root.scrollTop = this.root.scrollHeight;
}

Console.prototype._clearSelection = function() {
    //window.getSelection().empty();
}

Console.prototype._backspace = function() {
    if (!this._cursor) return;

    var prev = this._cursor.previousSibling;
    if (prev && !du.hasClass(prev, 'prompt')) {
        this._inputLine.removeChild(prev);
    }
}

Console.prototype._cursorLeft = function() {
    if (!this._cursor) return;

    var prev = this._cursor.previousSibling;
    if (prev && !du.hasClass(prev, 'prompt')) {
        du.addClass(prev, 'cursor');
        du.removeClass(this._cursor, 'cursor');
        this._cursor = prev;
    }
}

Console.prototype._cursorRight = function() {
    if (!this._cursor) return;

    var next = this._cursor.nextSibling;
    if (next) {
        du.addClass(next, 'cursor');
        du.removeClass(this._cursor, 'cursor');
        this._cursor = next;
    }
}

// Append a line of text to the container
Console.prototype._appendLine = function(str) {

    var line = document.createElement('div');
    line.className = 'item text';
    line.appendChild(document.createTextNode(replaceLogicalSpaceWithVisualSpace(str)));
    line.appendChild(document.createElement('br'));

    this.root.appendChild(line);

}

Console.prototype._appendElement = function(el, className) {
    
    var wrap = document.createElement('div');
    wrap.className = 'item ' + (className || '');
    wrap.appendChild(el);

    this.root.appendChild(wrap);

}

Console.prototype._insertStringBeforeCursor = function(str) {
    if (!this._cursor) return;

    for (var i = 0; i < str.length; i++) {
        var ch = document.createElement('span');
        ch.textContent = logicalSpaceToVisualSpace(str.charAt(i));
        this._inputLine.insertBefore(ch, this._cursor);
    }
}

Console.prototype._bind = function(consoleEl) {
    du.bind(this.root,  'click',    this.focus.bind(this));
    du.bind(consoleEl,  'keydown',  this._keydown.bind(this));
    du.bind(consoleEl,  'keyup',    this._keyup.bind(this));
    du.bind(consoleEl,  'keypress', this._keypress.bind(this));
}
},{"domutil":8}],2:[function(_dereq_,module,exports){
if (typeof window.DOMTokenList === 'undefined') {

	// Constants from jQuery
	var rclass = /[\t\r\n]/g;
	var core_rnotwhite = /\S+/g;

	// from jQuery
	exports.hasClass = function(ele, className) {
	    className = " " + className + " ";
	    return (" " + ele.className + " ").replace(rclass, " ").indexOf(className) >= 0;
	}

	exports.addClass = function(ele, value) {
	    var classes = (value || "").match(core_rnotwhite) || [],
	            cur = ele.className ? (" " + ele.className + " ").replace(rclass, " ") : " ";

	    if (cur) {
	        var j = 0, clazz;
	        while ((clazz = classes[j++])) {
	            if (cur.indexOf(" " + clazz + " ") < 0) {
	                cur += clazz + " ";
	            }
	        }
	        ele.className = cur.trim();
	    }
	}

	exports.removeClass = function(ele, value) {
	    var classes = (value || "").match(core_rnotwhite) || [],
	            cur = ele.className ? (" " + ele.className + " ").replace(rclass, " ") : " ";

	    if (cur) {
	        var j = 0, clazz;
	        while ((clazz = classes[j++])) {
	            while (cur.indexOf(" " + clazz + " ") >= 0) {
	                cur = cur.replace(" " + clazz + " ", " ");
	            }
	            ele.className = value ? cur.trim() : "";
	        }
	    }
	}

	exports.toggleClass = function(ele, value) {
	    var classes = (value || "").match(core_rnotwhite) || [],
	            cur = ele.className ? (" " + ele.className + " ").replace(rclass, " ") : " ";

	    if (cur) {
	        var j = 0, clazz;
	        while ((clazz = classes[j++])) {
	            var removeCount = 0;
	            while (cur.indexOf(" " + clazz + " ") >= 0) {
	                cur = cur.replace(" " + clazz + " ", " ");
	                removeCount++;
	            }
	            if (removeCount === 0) {
	                cur += clazz + " ";
	            }
	            ele.className = cur.trim();
	        }
	    }
	}

} else {

	exports.hasClass = function(el, className) {
	    return el.classList.contains(className);
	}

	exports.addClass = function(el, classes) {
	    if (classes.indexOf(' ') >= 0) {
	        classes.split(/\s+/).forEach(function(c) {
	            el.classList.add(c);
	        });
	    } else {
	        el.classList.add(classes);
	    }
	}

	exports.removeClass = function(el, classes) {
	    if (classes.indexOf(' ') >= 0) {
	        classes.split(/\s+/).forEach(function(c) {
	            el.classList.remove(c);
	        });
	    } else {
	        el.classList.remove(classes);
	    }
	}

	exports.toggleClass = function(el, classes) {
	    if (classes.indexOf(' ') >= 0) {
	        classes.split(/\s+/).forEach(function(c) {
	            el.classList.toggle(c);
	        });
	    } else {
	        el.classList.toggle(classes);
	    }
	}

}

},{}],3:[function(_dereq_,module,exports){
var matchesSelector = _dereq_('./matches_selector').matchesSelector;

var bind = null, unbind = null;

if (typeof window.addEventListener === 'function') {

	bind = function(el, evtType, cb, useCapture) {
		el.addEventListener(evtType, cb, useCapture || false);
		return cb;
	}

	unbind = function(el, evtType, cb, useCapture) {
		el.removeEventListener(evtType, cb, useCapture || false);
		return cb;
	}

} else if (typeof window.attachEvent === 'function') {

	bind = function(el, evtType, cb, useCapture) {
		
		function handler(evt) {
			evt = evt || window.event;
			
			if (!evt.preventDefault) {
				evt.preventDefault = function() { evt.returnValue = false; }
			}
			
			if (!evt.stopPropagation) {
				evt.stopPropagation = function() { evt.cancelBubble = true; }
			}

			cb.call(el, evt);
		}
		
		el.attachEvent('on' + evtType, handler);
		return handler;
	
	}

	unbind = function(el, evtType, cb, useCapture) {
		el.detachEvent('on' + evtType, cb);
		return cb;
	}

}

function delegate(el, evtType, selector, cb, useCapture) {
	return bind(el, evtType, function(evt) {
		var currTarget = evt.target;
		while (currTarget && currTarget !== el) {
			if (matchesSelector(selector, currTarget)) {
				evt.delegateTarget = currTarget;
				cb.call(el, evt);
				break;
			}
			currTarget = currTarget.parentNode;
		}
	}, useCapture);
}

function bind_c(el, evtType, cb, useCapture) {
	cb = bind(el, evtType, cb, useCapture);

	var removed = false;
	return function() {
		if (removed) return;
		removed = true;
		unbind(el, evtType, cb, useCapture);
		el = cb = null;
	}
}

function delegate_c(el, evtType, selector, cb, useCapture) {
	cb = delegate(el, evtType, selector, cb, useCapture);

	var removed = false;
	return function() {
		if (removed) return;
		removed = true;
		unbind(el, evtType, cb, useCapture);
		el = cb = null;
	}
}

function stop(evt) {
	evt.preventDefault();
	evt.stopPropagation();
}

exports.bind = bind;
exports.unbind = unbind;
exports.delegate = delegate;
exports.bind_c = bind_c;
exports.delegate_c = delegate_c;
exports.stop = stop;
},{"./matches_selector":5}],4:[function(_dereq_,module,exports){
exports.setRect = function(el, x, y, width, height) {
	el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
}

exports.setPosition = function(el, x, y) {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
}

exports.setSize = function(el, width, height) {
    el.style.width = width + 'px';
    el.style.height = height + 'px';
}
},{}],5:[function(_dereq_,module,exports){
var proto = window.Element.prototype;
var nativeMatch = proto.webkitMatchesSelector
					|| proto.mozMatchesSelector
					|| proto.msMatchesSelector
					|| proto.oMatchesSelector;

if (nativeMatch) {
	
	exports.matchesSelector = function(selector, el) {
		return nativeMatch.call(el, selector);
	}

} else {

	console.warn("Warning: using slow matchesSelector()");
	
	var indexOf = Array.prototype.indexOf;
	exports.matchesSelector = function(selector, el) {
		return indexOf.call(document.querySelectorAll(selector), el) >= 0;
	}

}

},{}],6:[function(_dereq_,module,exports){
exports.isElement = function(el) {
	return el && el.nodeType === 1;
}

exports.replace = function(oldEl, newEl) {
	oldEl.parentNode.replaceChild(newEl, oldEl);
}
},{}],7:[function(_dereq_,module,exports){
// http://stackoverflow.com/questions/1248081/get-the-browser-viewport-dimensions-with-javascript
exports.viewportSize = function() {
	return {
	    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
	    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
	};
}
},{}],8:[function(_dereq_,module,exports){
var du = module.exports = {};

extend(_dereq_('./impl/classes'));
extend(_dereq_('./impl/events'));
extend(_dereq_('./impl/layout'));
extend(_dereq_('./impl/matches_selector'));
extend(_dereq_('./impl/node'));
extend(_dereq_('./impl/viewport'));

function extend(things) {
    for (var k in things) {
        du[k] = things[k];
    }
}

},{"./impl/classes":2,"./impl/events":3,"./impl/layout":4,"./impl/matches_selector":5,"./impl/node":6,"./impl/viewport":7}]},{},[1])
(1)
});
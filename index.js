var du = require('domutil');

module.exports = Console;

var S_INIT              = 0,
    S_INPUT             = 1,
    S_PROCESSING        = 2;

var DEFAULT_PROMPT      = '> ';
var DEFAULT_PROMPT_NONE = null;
var NULL_HANDLER        = function(console, cmd) { console.newline(); }

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
    this._handler       = opts.handler || NULL_HANDLER;
    this._cancel        = opts.cancel || NULL_HANDLER;
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

}

//
// Public API

Console.prototype.setHandler = function(handler) {
    this._handler = handler || NULL_HANDLER;
}

Console.prototype.setPrompt = function(prompt) {
    this._prompt = prompt;
}

Console.prototype.getInput = function() {
    
    if (this.state !== S_INPUT)
        throw new Error("cannot get console input - illegal state");

    return replaceVisualSpaceWithLogicalSpace(
        this._getRawInputFromElement(this._inputLine)
    );
    
}

Console.prototype.print = function(str) {
    
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
    du.text(this._cursor, VISUAL_SPACE);
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
                this._cancel(this);
            }
            break;
    }
}

Console.prototype._keypress = function(evt) {
    var input, result;

    if (this.state === S_INPUT) {

        // Enter
        if (evt.charCode === 13 || evt.keyCode === 13) {
            evt.preventDefault();
            this._clearSelection();
            input = this.getInput();
            du.removeClass(this._cursor, 'cursor');
            this._cursor = null;
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
        str += du.getText(el.childNodes[s++]);
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
        du.text(node, prompt);
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

    this._appendRaw(line);

}

Console.prototype._appendElement = function(el, className) {
    
    var wrap = document.createElement('div');
    wrap.className = 'item ' + (className || '');
    wrap.appendChild(el);

    this._appendRaw(el);

}

Console.prototype._appendRaw = function(el) {
    if (this.state === S_INPUT) {
        this.root.insertBefore(el, this._inputLine);
    } else {
        this.root.appendChild(el);
    }
    this._scrollToBottom();
}

Console.prototype._insertStringBeforeCursor = function(str) {
    if (!this._cursor) return;

    for (var i = 0; i < str.length; i++) {
        var ch = document.createElement('span');
        du.text(ch, logicalSpaceToVisualSpace(str.charAt(i)));
        this._inputLine.insertBefore(ch, this._cursor);
    }
}

Console.prototype._bind = function(consoleEl) {
    du.bind(this.root,  'click',    this.focus.bind(this));
    du.bind(consoleEl,  'keydown',  this._keydown.bind(this));
    du.bind(consoleEl,  'keyup',    this._keyup.bind(this));
    du.bind(consoleEl,  'keypress', this._keypress.bind(this));
}
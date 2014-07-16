# echo-chamber

`echo-chamber` is a simple, no-frills console component built with HTML, CSS and Javascript. It might look a bit like this:

![Echo Chamber Screenshot](https://github.com/jaz303/echo-chamber/raw/master/screenshot.png)

But that's up to you - it's fully stylable with CSS.

As well as text the widget can host arbitrary HTML content (see `konsole.append(el)`).

__This is not an ANSI/VT100 terminal emulator!__

## Demo

`echo-chamber` is used by [basica](https://github.com/jaz303/basica), my embeddable BASIC interpreter. [Try it here!](http://labs.curiouschip.com/basica/embed/)

## Installation

In addition to the following you'll need to add some CSS to your project. Check out the Default CSS section, below, for a starting point.

### npm

Get it:

    npm install echo-chamber

Require it:

    var EchoChamber = require('echo-chamber');

### UMD

Copy and paste either `build/echo-chamber.js` or `build/echo-chamber.min.js` into your project.

## Default CSS

```css
.console {
  line-height: 1.2;
  overflow: auto;
}

.console:focus {
  outline: none;
}

/* Shim text area for receiving keyboard input */
.console > textarea {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  padding: 0;
  border: none;
  overflow: hidden;
  background: none;
}

.console > textarea:focus {
  outline: none;
}

/* Line or other item */
.console > .item {}

/* Text line */
.console > .text {
  word-wrap: break-word;
}

/* Line currently receiving input */
.console > .input {}

/* Prompt */
.console > .item > .prompt {}

/* Cursor */
.console > .input > .cursor {}
```

## API

#### `var konsole = new EchoChamber(el, [opts])`

Create a new console rooted in the empty div `el`.

Supported options:

  * `capabilities`: a `Modernizr`-like feature-detection object, used to detect support for touch devices via the `touch` key. If this option is omitted touch device support will be disabled.
  * `greeting`: initial text to display on the console.
  * `handler`: function to be called when user presses enter. Receives parameters `(console, command)`. See 'Handling User Input', below.
  * `cancel`: function to be called if user presses escape whilst console is in processing state. Receives parameters `(console)`.
  * `prompt`: string or callback function for generating the prompt. Pass `false` if no prompt is desired. If a callback is specified, in addition to returning a string or false, it may elect to return a `<span>` element for direct insertion into the DOM. Default: `> `.
  * `tabIndex`: the tab index of the console. Default: `0`.

#### `konsole.getInput()`

Returns the command that the user has entered. Throws an exception if console is not in the input state.

#### `konsole.print(str)`

Print a text string to the console.

#### `konsole.append(el)`

Append a DOM element to the console.

#### `konsole.clearInput()`

Clear the input bufer.

#### `konsole.newline()`

Prepare the console for the next line of input by generating a new prompt, updating the cursor and putting the console into input mode. You should call this function from your command handler after command processing is complete and the console is ready to accept further input.

#### `konsole.focus()`

Focus on the console.

## Handling User Input

When the user presses enter the user supplied handler function is called and receives the console instance and the command string as parameters. Behind the scenes, the console is now in "processing" mode, meaning that further terminal input will be ignored until processing is complete.

Use `konsole.print()` to output text during processing, or `konsole.append()` to output a DOM node. Once processing is complete simply call `konsole.newline()` to begin the next line of user input. Processing, of course, may be performed asynchronously.

## Copyright &amp; License

&copy; 2014 Jason Frame [ [@jaz303](http://twitter.com/jaz303) / [jason@onehackoranother.com](mailto:jason@onehackoranother.com) ]

Released under the ISC license.
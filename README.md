# echo-chamber

`echo-chamber` is a simple, no-frills console component built with HTML, CSS and Javascript. It might look a bit like this:

![Echo Chamber Screenshot](screenshot.png)

But that's up to you - it's fully stylable with CSS.

As well as text the widget can host arbitrary HTML content.

__This is not an ANSI/VT100 terminal emulator!__

## Default CSS

```css
/* Console Defaults */

.console {
	line-height: 1;
}

.console:focus {
	outline: none;
}

.console textarea {
	position: absolute;
	top: 0;
	left: 0;
	width: 0;
	height: 0;
	padding: 0;
	border: none;
	overflow: hidden;
}

.console textarea:focus {
	outline: none;
}

/* Line or other item */
.console .l {}

/* Prompt */
.console .p {}

/* Cursor */
.console .c {}
```
# echo-chamber

`echo-chamber` is a simple, no-frills console component built with HTML, CSS and Javascript. It looks a bit like this:



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
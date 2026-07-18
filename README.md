# OKLCH Tuner

[![npm package](https://img.shields.io/npm/v/oklch-tuner)](https://www.npmjs.com/package/oklch-tuner)

A tiny developer utility for live-tuning OKLCH variables in the browser. It overlays a small widget to visually adjust lightness, chroma, hue, and alpha channels for CSS custom properties.

**→** **[Interactive Demo](https://www.feinschmecker.dev/oklch-tuner-demo)**

## Installation

### NPM
```bash
npm install oklch-tuner
```

### CDN 
```html
<script type="module">
  import { initTuner } from 'https://unpkg.com/oklch-tuner/oklch-tuner.js';
  initTuner();
</script>
```

## Usage

Calling `initTuner()` scans the active stylesheets for OKLCH variables and renders the widget.

```javascript
import { initTuner } from 'oklch-tuner';

initTuner();
```

To explicitly define which variables to tune, pass a configuration object. E.g.:

```javascript
import { initTuner } from 'oklch-tuner';

initTuner({
  variables: [
    '--bg-main', 
    '--surface', 
    '--border',
    '--text-main', 
    '--text-muted',
    '--accent', 
    '--accent-hover', 
    '--accent-text'
  ]
});
```

## Configuration API

| Property | Type | Description |
| :--- | :--- | :--- |
| `variables` | `string[]` | (Optional) Explicit array of CSS variable names to tune. Omitting this triggers auto-discovery. |

## Copying CSS

Clicking the "Copy CSS" button copies a `:root` block containing all tuned variables to the clipboard, formatted and ready to be pasted into a stylesheet.

## License

MIT

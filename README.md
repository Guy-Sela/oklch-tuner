# OKLCH Tuner [don't use emojis]
# OKLCH Tuner

A zero-dependency widget for live-tuning OKLCH CSS variables in the browser. It overlays a small control panel to visually adjust lightness, chroma, hue, and alpha channels for CSS custom properties.

[Interactive Demo](https://stackblitz.com/github/your-username/oklch-tuner?file=index.html) *(Note: Update this link when published)*

## Features

- **Zero Dependencies:** Pure vanilla JS and CSS. Works in any framework.
- **Auto-Discovery:** Automatically scans stylesheets to find and load `--var: oklch(...)` definitions.
- **Shadow DOM Isolation:** Renders inside a Shadow Root to prevent style conflicts with the host application.
- **State Persistence:** Retains widget position and active variables across page reloads via `localStorage`.

## Installation

### NPM
```bash
npm install oklch-tuner
```

### CDN (Browser)
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

To explicitly define which variables to tune, pass a configuration object:

```javascript
import { initTuner } from 'oklch-tuner';

initTuner({
  variables: ['--bg-main', '--text-primary']
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

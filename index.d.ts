export interface OklchTunerConfig {
  /**
   * An array of CSS variable names to tune (e.g., ['--bg-color', '--text-color']).
   * If omitted, the tuner will attempt to auto-discover variables in document.styleSheets.
   */
  variables?: string[];
}

/**
 * Initializes the OKLCH Tuner floating widget.
 * @param config Optional configuration object.
 */
export declare function initTuner(config?: OklchTunerConfig): void;

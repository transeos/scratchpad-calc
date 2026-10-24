// Loader and types for the ExprTk WebAssembly module produced by wasm/build.sh.

export interface EvalResult {
  ok: boolean;
  value: number;
  error: string;
  /** Offset of the offending token within the expression, or -1 when unknown. */
  position: number;
}

export interface LibraryInfo {
  name: string;
  version: string;
  date: string;
}

export interface ExprtkModule {
  evaluate(expression: string, variables: Record<string, number>): EvalResult;
  collectVariables(expression: string): string[];
  libraryInfo(): LibraryInfo;
}

/** Shape of the Emscripten glue emitted alongside exprtk.wasm. */
interface ExprtkGlue {
  default: () => Promise<ExprtkModule>;
}

let pending: Promise<ExprtkModule> | null = null;

/**
 * Instantiates the WebAssembly module, reusing a single instance across callers.
 *
 * The glue is copied out of public/ rather than bundled: the browser resolves
 * the URL at runtime, which is why webpack is told to leave the import alone.
 * Resolving against the page keeps it working when the site lives under a prefix.
 */
export function loadExprtk(): Promise<ExprtkModule> {
  if (!pending) {
    // webpack.config.mjs copies public/wasm/exprtk.mjs out as exprtk.js.
    const url = new URL('wasm/exprtk.js', document.baseURI).href;
    const glue = import(/* webpackIgnore: true */ url) as Promise<ExprtkGlue>;

    pending = glue.then((module) => module.default());
  }

  return pending;
}

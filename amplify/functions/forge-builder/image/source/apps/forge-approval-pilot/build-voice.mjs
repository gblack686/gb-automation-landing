import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('./voice-client.mjs',import.meta.url))],
  outfile:fileURLToPath(new URL('./.local-assets/voice-client.js',import.meta.url)),bundle:true,format:'esm',minify:true,legalComments:'eof'});
await build({entryPoints:[fileURLToPath(new URL('./turntable.mjs',import.meta.url))],
  outfile:fileURLToPath(new URL('./.local-assets/turntable.js',import.meta.url)),bundle:true,format:'esm',minify:true,legalComments:'eof'});

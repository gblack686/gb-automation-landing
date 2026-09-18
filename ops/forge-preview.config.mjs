import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
// Local integration only. No deployment settings or cloud backend mutation.
export default defineConfig({
 root:fileURLToPath(new URL('../',import.meta.url)),
 plugins:[{name:'forge-local-design-path',configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/forge'||req.url?.startsWith('/forge/designs/'))req.url='/forge/index.html';next();});}}],
 preview:{host:'127.0.0.1',port:4321,strictPort:true,proxy:{'/api/forge-intake':{target:'http://127.0.0.1:4318',changeOrigin:true,headers:{Origin:'http://127.0.0.1:4318'},rewrite:()=>'/api'}}}
});

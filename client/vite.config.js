import { defineConfig } from 'vite';
export default defineConfig({server:{port:5173,host:'127.0.0.1',proxy:{'/api':'http://localhost:4000','/uploads':'http://localhost:4000','/manifest.webmanifest':'http://localhost:4000'}}});

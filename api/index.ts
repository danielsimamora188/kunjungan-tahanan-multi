import { app, initApp } from '../server.ts';

export default async function handler(req: any, res: any) {
  await initApp();

  // Restore real request URL for Express route matching in Vercel
  const realUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (realUrl && typeof realUrl === 'string' && !realUrl.includes('/api/index.ts')) {
    req.url = realUrl;
  }

  return app(req, res);
}




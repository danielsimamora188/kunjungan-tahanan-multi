import { app, initApp } from '../server.ts';

export default async function handler(req: any, res: any) {
  try {
    await initApp();

    // Restore real request URL for Express route matching in Vercel
    const realUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url;
    if (realUrl && typeof realUrl === 'string' && !realUrl.includes('/api/index.')) {
      req.url = realUrl;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: err?.message || 'Server Internal Error' });
    }
  }
}





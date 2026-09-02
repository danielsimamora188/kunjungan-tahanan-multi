import { app, initApp } from '../server';

export default async function handler(req: any, res: any) {
  await initApp();
  return app(req, res);
}


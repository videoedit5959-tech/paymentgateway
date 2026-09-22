import { createApp } from '../server/app.js';
import { connectToDatabase } from '../server/db/connect.js';
import { Repository } from '../server/db/repository.js';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      await connectToDatabase();
      await Repository.seedMongoIfEmpty();
      return await createApp();
    })();
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}

import { Db, MongoClient } from "mongodb";
import { UserDAO } from "./UserDAO";

export async function connectToDatabase(): Promise<Db> {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  return client.db();
}

export async function createUserDAO(db: Db): Promise<UserDAO> {
  return new UserDAO(db);
}

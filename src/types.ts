import { UserDAO } from "./persistence/UserDAO";

export interface Context {
  // Add any context properties you need
  userDAO: UserDAO;
  token: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publishedYear?: number;
}

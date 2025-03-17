import { UserDAO } from "./persistence/UserDAO";

export interface Context {
  userDAO: UserDAO;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
  };
}

import * as jwt from "jsonwebtoken";
import { Context } from "../types";
import { UserDAO } from "../persistence/UserDAO";

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export async function decodeToken(
  token: string | undefined
): Promise<JwtPayload | null> {
  if (!token) {
    return null;
  }

  try {
    // Remove 'Bearer ' prefix if present
    const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;
    return jwt.verify(tokenString, process.env.JWT_SECRET!) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export async function createContext(
  userDAO: UserDAO,
  token?: string
): Promise<Context> {
  const decodedToken = await decodeToken(token);

  if (!decodedToken) {
    return {
      userDAO,
      token,
    };
  }

  const user = await userDAO.findById({ id: decodedToken.userId });
  if (!user) {
    return {
      userDAO,
      token,
    };
  }

  return {
    userDAO,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mfaEnabled: user.mfaEnabled ?? false,
    },
  };
}

import { MutationResolvers } from "../generated/graphql";
import { UserDAO } from "../persistence/UserDAO";
import * as jwt from "jsonwebtoken";
import { validatePasswordComplexity } from "../utils/passwordValidation";

// Default to 30 days if not specified in env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export const mutation: MutationResolvers = {
  register: async (
    _,
    { firstName, lastName, email, password },
    { userDAO }: { userDAO: UserDAO }
  ) => {
    // Validate password complexity
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Invalid password: ${passwordValidation.errors.join(", ")}`
      );
    }

    const user = await userDAO.create({
      firstName,
      lastName,
      email,
      password,
    });
    return user;
  },
  login: async (_, { email, password }, { userDAO }: { userDAO: UserDAO }) => {
    const user = await userDAO.login(email, password);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      user,
      token,
    };
  },
};

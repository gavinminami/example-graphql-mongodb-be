import { MutationResolvers } from "../generated/graphql";
import * as jwt from "jsonwebtoken";
import { validatePasswordComplexity } from "../utils/passwordValidation";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { Context } from "../types";

// Default to 30 days if not specified in env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export const mutation: MutationResolvers = {
  register: async (
    _,
    { firstName, lastName, email, password },
    { userDAO }: Context
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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      user,
      token,
    };
  },
  login: async (_, { email, password }, { userDAO }: Context) => {
    const user = await userDAO.login(email, password);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      user,
      token,
    };
  },
  enableMFA: async (_, __, { userDAO, user }: Context) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `YourApp:${user.email}`,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    await userDAO.enableMFA(user.id, secret.base32);

    return {
      qrCode,
      secret: secret.base32,
    };
  },
  verifyMFA: async (_, { token }, { userDAO, user }: Context) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    const isValid = await userDAO.verifyMFAToken(user.id, token);
    if (!isValid) {
      throw new Error("Invalid MFA token");
    }

    return true;
  },
  disableMFA: async (_, __, { userDAO, user }: Context) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    await userDAO.disableMFA(user.id);
    return true;
  },
  loginWithMFA: async (_, { email, password, token }, { userDAO }: Context) => {
    const user = await userDAO.loginWithMFA(email, password, token);
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      user,
      token: jwtToken,
    };
  },
};

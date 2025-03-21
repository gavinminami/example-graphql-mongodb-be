import { Db } from "mongodb";
import BaseDAO, { BaseDbEntity } from "./BaseDAO";
import { RegisterInput, User } from "../generated/graphql";
import * as bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import * as speakeasy from "speakeasy";

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS
  ? parseInt(process.env.MAX_LOGIN_ATTEMPTS)
  : 5;
const LOCKOUT_DURATION_MINUTES = process.env.LOCKOUT_DURATION_MINUTES
  ? parseInt(process.env.LOCKOUT_DURATION_MINUTES)
  : 15;

export type UserDbEntity = BaseDbEntity & {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  loginAttempts: number;
  lockedUntil?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
};

export class UserDAO extends BaseDAO<User, UserDbEntity> {
  constructor(db: Db) {
    super({ db, collectionName: "users" });
  }

  async create(user: RegisterInput): Promise<User> {
    // Check if user already exists
    const existingUser = await this.collection.findOne({ email: user.email });
    if (existingUser) {
      throw new GraphQLError("Email already registered", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    const userDbEntity = {
      ...user,
      password: hashedPassword,
      loginAttempts: 0,
      mfaEnabled: false,
    };

    const result = await this.collection.insertOne(userDbEntity);
    return this.fromDbEntity({ ...userDbEntity, _id: result.insertedId });
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.collection.findOne({ email });

    if (!user) {
      throw new GraphQLError("Invalid email or password", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - new Date().getTime()) / (1000 * 60)
      );
      throw new GraphQLError(
        `Account is locked. Please try again in ${minutesLeft} minutes.`,
        { extensions: { code: "ACCOUNT_LOCKED" } }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const updateData: Partial<UserDbEntity> = { loginAttempts };

      // Lock account if max attempts reached
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
        );
      }

      await this.collection.updateOne({ _id: user._id }, { $set: updateData });

      throw new GraphQLError(
        loginAttempts >= MAX_LOGIN_ATTEMPTS
          ? `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
          : "Invalid email or password",
        { extensions: { code: "UNAUTHENTICATED" } }
      );
    }

    // Reset login attempts on successful login
    await this.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
        },
      }
    );

    return this.fromDbEntity(user);
  }

  // Optional: Add method to manually unlock account
  async unlockAccount(email: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { email },
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
        },
      }
    );
    return result.modifiedCount > 0;
  }

  async enableMFA(userId: string, secret: string): Promise<User> {
    const result = await this.collection.updateOne(
      { _id: userId },
      {
        $set: {
          mfaEnabled: true,
          mfaSecret: secret,
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new GraphQLError("Failed to enable MFA", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    const updatedUser = await this.collection.findOne({ _id: userId });
    return this.fromDbEntity(updatedUser!);
  }

  async disableMFA(userId: string): Promise<User> {
    const result = await this.collection.updateOne(
      { _id: userId },
      {
        $set: {
          mfaEnabled: false,
          mfaSecret: null,
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new GraphQLError("Failed to disable MFA", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    const updatedUser = await this.collection.findOne({ _id: userId });
    return this.fromDbEntity(updatedUser!);
  }

  async loginWithMFA(
    email: string,
    password: string,
    token: string
  ): Promise<User> {
    const user = await this.collection.findOne({ email });

    if (!user) {
      throw new GraphQLError("Invalid email or password", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - new Date().getTime()) / (1000 * 60)
      );
      throw new GraphQLError(
        `Account is locked. Please try again in ${minutesLeft} minutes.`,
        { extensions: { code: "ACCOUNT_LOCKED" } }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const updateData: Partial<UserDbEntity> = { loginAttempts };

      // Lock account if max attempts reached
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
        );
      }

      await this.collection.updateOne({ _id: user._id }, { $set: updateData });

      throw new GraphQLError(
        loginAttempts >= MAX_LOGIN_ATTEMPTS
          ? `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
          : "Invalid email or password",
        { extensions: { code: "UNAUTHENTICATED" } }
      );
    }

    // Verify MFA token
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new GraphQLError("MFA is not enabled for this account", {
        extensions: { code: "MFA_NOT_ENABLED" },
      });
    }

    const isValidToken = await this.verifyMFAToken(user.mfaSecret, token);
    if (!isValidToken) {
      throw new GraphQLError("Invalid MFA token", {
        extensions: { code: "INVALID_MFA_TOKEN" },
      });
    }

    // Reset login attempts on successful login
    await this.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
        },
      }
    );

    return this.fromDbEntity(user);
  }

  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    const secret = this.collection.findOne({ _id: userId }).mfaSecret;
    const isValid = await speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });
    return isValid;
  }

  public fromDbEntity<DBE extends BaseDbEntity>(dbEntity: DBE): User {
    const baseEntity = super.fromDbEntity(dbEntity);
    const userEntity = dbEntity as unknown as UserDbEntity;
    return {
      ...baseEntity,
      mfaEnabled: userEntity.mfaEnabled ?? false,
    };
  }
}

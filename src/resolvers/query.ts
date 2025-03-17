import { QueryResolvers } from "../generated/graphql";
import { Context } from "../types";

export const query: QueryResolvers<Context> = {
  me: async (_, __, { user }) => {
    if (!user) {
      return null;
    }
    return user;
  },
};

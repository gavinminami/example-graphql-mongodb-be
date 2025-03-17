import { mutation } from "./mutation";
import { query } from "./query";
import { Resolvers } from "../generated/graphql";

export const resolvers: Resolvers = {
  Query: query,
  Mutation: mutation,
};

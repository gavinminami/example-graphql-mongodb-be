import { ApolloServerPlugin, GraphQLRequestContext } from "@apollo/server";
import { Context } from "../types";

// List of operations that don't require authentication
const PUBLIC_OPERATIONS = ["login", "register"];

export const authPlugin: ApolloServerPlugin<Context> = {
  async requestDidStart({ request, contextValue }) {
    return {
      async willSendResponse({ response }) {
        // Handle response if needed
      },

      async didResolveOperation({ operation }) {
        // Skip auth check for public operations
        const operationName = operation?.name?.value;
        if (operationName && PUBLIC_OPERATIONS.includes(operationName)) {
          return;
        }

        // Get token from context
        const token = contextValue.token;
        if (!token) {
          throw new Error(
            "Authentication required. Please provide a valid token."
          );
        }
      },
    };
  },
};

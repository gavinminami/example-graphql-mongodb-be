import { ApolloServerPlugin, GraphQLRequestContext } from "@apollo/server";
import { Context } from "../types";

// List of root queries/mutations that don't require authentication
const PUBLIC_OPERATIONS = {
  query: [], // Add any public queries here
  mutation: ["login", "register", "loginWithMFA"], // Add any public mutations here
};

export const authPlugin: ApolloServerPlugin<Context> = {
  async requestDidStart({ request, contextValue }) {
    return {
      async willSendResponse({ response }) {
        // Handle response if needed
      },

      async didResolveOperation({ operation }) {
        // Skip auth check for public operations
        const operationType = operation?.operation;
        const fieldName =
          operation?.selectionSet?.selections[0]?.kind === "Field"
            ? operation.selectionSet.selections[0].name.value
            : null;

        if (
          operationType &&
          fieldName &&
          PUBLIC_OPERATIONS[operationType]?.includes(fieldName)
        ) {
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

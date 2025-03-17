import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { readFileSync } from "fs";
import { resolvers } from "./resolvers";
import { Context } from "./types";
import { connectToDatabase, createUserDAO } from "./persistence";
import { authPlugin } from "./plugins/authPlugin";
import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const typeDefs = readFileSync("./src/schema.graphql", { encoding: "utf-8" });
const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [authPlugin],
  });

  await server.start();

  // Add health check endpoint for k8s readiness probe
  app.get("/health", async (req, res) => {
    try {
      const db = await connectToDatabase();
      await db.command({ ping: 1 });
      res.status(200).send("OK");
    } catch (error) {
      res.status(503).send("Service Unavailable");
    }
  });

  const db = await connectToDatabase();
  const userDAO = await createUserDAO(db);

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        userDAO,
        token: req.headers.authorization,
      }),
    })
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

startServer().catch(console.error);

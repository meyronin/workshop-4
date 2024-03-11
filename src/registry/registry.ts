import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

let registeredNodes: Node[] = [];

export async function launchRegistry(): Promise<any> {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // GET route to retrieve the node registry
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    res.json({ nodes: registeredNodes });
  });

  // POST route to register a node
  _registry.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body;

    // Validate request body
    if (typeof nodeId !== "number" || typeof pubKey !== "string") {
      res.status(400).json({ error: "Invalid request body" });
      return; // Exit the function early
    }

    // Add node to registeredNodes
    registeredNodes.push({ nodeId, pubKey });

    console.log(`Node ${nodeId} registered successfully`);

    res.status(201).json({ message: `Node ${nodeId} registered successfully` });
  });

  // Implement the status route
  _registry.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server; // Return the server instance
}

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
  let nodes: Node[] = [];

  // POST route to register a node
 _registry.post("/registerNode", (req, res) => {
  const { nodeId, pubKey }: RegisterNodeBody = req.body;

  // Check if the node is already registered
  const nodeExists = nodes.find(node => node.nodeId === nodeId);
  if (nodeExists) {
    return res.status(400).json({ message: "Node already registered." });
  }

  nodes.push({ nodeId, pubKey });
  return res.status(201).json({ message: "Node registered successfully." });
});

// GET route to retrieve the node registry
_registry.get("/getNodeRegistry", (req: Request, res: Response) => {
  const payload: GetNodeRegistryBody = {
    nodes: nodes
  };

  res.json(payload);
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
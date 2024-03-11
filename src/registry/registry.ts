import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey } from "../crypto"; // Importing cryptographic functions

export type Node = { nodeId: number; pubKey: string; prvKey: string | null }; // Update the Node type to include prvKey

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: {
    nodeId: number;
    pubKey: string;
  }[];
};

let registeredNodes: Node[] = [];

export async function launchRegistry(): Promise<any> {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // GET route to retrieve the private key of a node
  _registry.get("/getPrivateKey/:nodeId", async (req: Request, res: Response) => {
    const nodeId = parseInt(req.params.nodeId);

    // Find the node with the specified nodeId
    const node = registeredNodes.find((n) => n.nodeId === nodeId);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    if (!node.prvKey) {
      return res.status(404).json({ error: "Private key not found" });
    }

    // Respond with the private key
    res.json({ result: node.prvKey });

    return; // Ensure all code paths return a value
  });

  // GET route to retrieve the node registry
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    const nodesPayload: GetNodeRegistryBody = {
      nodes: registeredNodes.map((node) => ({
        nodeId: node.nodeId,
        pubKey: node.pubKey,
      })),
    };

    res.json(nodesPayload);
    return; // Ensure all code paths return a value
  });

  // POST route to register a node
  _registry.post("/registerNode", async (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body;

    // Generate RSA key pair for the node
    const { privateKey } = await generateRsaKeyPair();
    const prvKey = await exportPrvKey(privateKey);

    // Add node to registeredNodes
    registeredNodes.push({ nodeId, pubKey, prvKey });

    console.log(`Node ${nodeId} registered successfully`);

    res.status(201).json({ message: `Node ${nodeId} registered successfully` });

    return; // Ensure all code paths return a value
  });

  // Implement the status route
  _registry.get("/status", (req: Request, res: Response) => {
    res.send("live");
    return; // Ensure all code paths return a value
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server; // Return the server instance
}

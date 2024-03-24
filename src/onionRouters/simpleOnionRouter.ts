import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { Node } from "../registry/registry";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, rsaDecrypt, symDecrypt, importPrvKey } from "../crypto";

/**
 * Generates an express server instance for a simple onion router
 * @param nodeId - The onion router node's unique identifer
 * @returns The created express server instance
 */
export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Variables to store the last received encrypted message, decrypted message, message destination, and message source
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;
  let lastMessageSource: number | null = null;

  // Generate RSA key pair for encryption and decryption
  const keyPair = await generateRsaKeyPair();
  const publicKey = await exportPubKey(keyPair.publicKey);
  const privateKey = await exportPrvKey(keyPair.privateKey);

  // Define the node with its ID and public key
  let node: Node = { nodeId: nodeId, pubKey: publicKey };

   // Implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // GET route to retrieve the last received encrypted message
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  // GET route to retrieve the last received decrypted message
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  // GET route to retrieve the last message's destination
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  // GET Route to get the last message source
  onionRouter.get("/getLastMessageSource", (req, res) => {
    res.json({ result: lastMessageSource });
  });

  // Register the node in the registry
  const response = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    body: JSON.stringify({ nodeId: nodeId, pubKey: publicKey }),
    headers: { "Content-Type": "application/json" },
  });
  console.log(await response.json());

  // GET Route to retrieve the node's private key
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });

  // GET Route to handle received messages
  onionRouter.post("/message", async (req, res) => {
    const layer = req.body.message;
    // Decrypting the message with symmetric decryption and RSA
    const encryptedSymKey = layer.slice(0, 344);
    const symKey = privateKey ? await rsaDecrypt(encryptedSymKey, await importPrvKey(privateKey)) : null;
    const encryptedMessage = layer.slice(344);
    const message = symKey ? await symDecrypt(symKey, encryptedMessage) : null;
    
    // Updating stored message data
    lastReceivedEncryptedMessage = layer;
    lastReceivedDecryptedMessage = message ? message.slice(10) : null;
    lastMessageSource = nodeId;
    lastMessageDestination = message ? parseInt(message.slice(0, 10), 10) : null;
    
    // Move the decrypted message to its next destination
    if (lastMessageDestination) {
      await fetch(`http://localhost:${lastMessageDestination}/message`, {
        method: "POST",
        body: JSON.stringify({ message: lastReceivedDecryptedMessage }),
        headers: { "Content-Type": "application/json" },
      });
    }
    res.send("success");
  });

  // Start server
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on the port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
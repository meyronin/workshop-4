import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT } from "../config";
import { Node } from "@/src/registry/registry";
import { createRandomSymmetricKey, exportSymKey, importSymKey, rsaEncrypt, symEncrypt } from "../crypto";

/**
 * Defines the structure of the request body for transmitting a message.
 */
export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

// Variables to hold the latest received message, last sent message, and last utilized circuit
let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;
let lastCircuit: Node[] = [];

/**
 * Generates an express server instance for a specific user.
 * @param userId - The user's unique identifier.
 * @returns The created express server instance.
 */
export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

   // Endpoint to verify the user's status
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Endpoint to retrieve the latest received message
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // Endpoint to obtain the latest sent message
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // Endpoint for receiving a message
  _user.post("/message", (req, res) => {
    lastReceivedMessage = req.body.message;
    res.send("success");
  });

  // Endpoint to fetch the most recent circuit utilized
  _user.get("/getLastCircuit", (req, res) => {
    res.status(200).json({result: lastCircuit.map((node) => node.nodeId)});
  });

  // Endpoint for sending a message
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    let circuit: Node[] = [];

    // Retrieving the list of available nodes from the registry
    const nodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`)
      .then((res) => res.json())
      .then((body: any) => body.nodes);

    // Random selection of nodes to construct the circuit
    while (circuit.length < 3) {
      const randomIndex = Math.floor(Math.random() * nodes.length);
      if (!circuit.map(node => node.nodeId).includes(nodes[randomIndex].nodeId)) {
        circuit.push(nodes[randomIndex]);
      }
    }

    // Encrypting the message using onion routing
    lastSentMessage = message;
    let messageToSend = message;
    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");

    for (let i = 0; i < circuit.length; i++) {
      const node = circuit[i];
      const symKey = await createRandomSymmetricKey();
      const messageToEncrypt = `${destination}${messageToSend}`;
      destination = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, "0");
      const encryptedMessage = await symEncrypt(symKey, messageToEncrypt);
      const encryptedSymKey = await rsaEncrypt(await exportSymKey(symKey), node.pubKey);
      messageToSend = encryptedSymKey + encryptedMessage;
    }

    // Reversing the circuit for message transmission
    circuit.reverse();

    // Sending the message through the entry node of the circuit
    const entryNode = circuit[0];
    lastCircuit = circuit;
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/message`, {
      method: "POST",
      body: JSON.stringify({ message: messageToSend }),
      headers: { "Content-Type": "application/json" },
    });

    res.send("success");
  });

  // Initiating the user server listening on the designated port
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}
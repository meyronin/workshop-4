import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import axios from "axios"; // Import axios for HTTP requests
import { BASE_USER_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey } from "../crypto"; // Import cryptographic functions

const registryBaseUrl = "http://localhost:8083"; // Update with actual registry URL

// Variables to store last received and last sent messages
let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

   // Implement the status route
   _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Function to register the node on the registry
  async function registerNode() {
    const { publicKey, privateKey } = await generateRsaKeyPair();
    const pubKey = await exportPubKey(publicKey);

    try {
      await axios.post(`${registryBaseUrl}/registerNode`, {
        nodeId: userId,
        pubKey,
      });
      console.log(`Node ${userId} registered successfully`);
    } catch (error: any) { // Explicitly type 'error' as 'any'
      console.error(`Error registering node ${userId}: ${error.message}`);
    }
  }

  // Call the registerNode function to register the node on startup
  registerNode();

 

  // POST route to receive messages
  _user.post("/message", (req: Request, res: Response) => {
    const { message } = req.body;

    // Update the last received message
    lastReceivedMessage = message;

    res.send("success"); // Respond with success
  });

  // GET route to retrieve the last received message
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // GET route to retrieve the last sent message
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // Start server
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
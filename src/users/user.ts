import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_USER_PORT } from "../config";

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

  // GET route to retrieve the last received message
  _user.get("/getLastReceivedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedMessage });
  });

  // GET route to retrieve the last sent message
  _user.get("/getLastSentMessage", (req: Request, res: Response) => {
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


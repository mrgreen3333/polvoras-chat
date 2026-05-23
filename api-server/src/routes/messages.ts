import { Router, type Request } from "express";
import { store } from "../store.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/:conversationId", requireAuth, (req, res) => {
  const conversationId = String(req.params["conversationId"] ?? "");
  const msgs = store.getMessages(conversationId);
  res.json(msgs);
});

export { router as messagesRouter };

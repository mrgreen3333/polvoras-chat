import { Router, type Request } from "express";
import { store } from "../store.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/find", requireAuth, (req, res) => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ error: "Código obrigatório" });
    return;
  }
  const user = store.findUserByInviteCode(code);
  if (!user) {
    res.status(404).json({ error: "Utilizador não encontrado com esse código" });
    return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.get("/me", requireAuth, (req, res) => {
  const r = req as Request & { userId: string };
  const user = store.findUserById(r.userId);
  if (!user) {
    res.status(404).json({ error: "Não encontrado" });
    return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.patch("/me", requireAuth, (req, res) => {
  const r = req as Request & { userId: string };
  const { displayName, bio, status, avatarUri } = req.body as {
    displayName?: string;
    bio?: string;
    status?: "online" | "away" | "offline";
    avatarUri?: string;
  };
  const updated = store.updateUser(r.userId, { displayName, bio, status, avatarUri });
  if (!updated) {
    res.status(404).json({ error: "Não encontrado" });
    return;
  }
  const { passwordHash: _, ...safeUser } = updated;
  res.json(safeUser);
});

export { router as usersRouter };

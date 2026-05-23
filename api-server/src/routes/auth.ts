import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { store } from "../store.js";
import { JWT_SECRET } from "../middlewares/auth.js";

const router = Router();

function genInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PLVR-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.post("/register", async (req, res) => {
  const { username, displayName, password, publicKey } = req.body as {
    username?: string;
    displayName?: string;
    password?: string;
    publicKey?: string;
  };

  if (!username || !password || !publicKey) {
    res.status(400).json({ error: "Campos obrigatórios em falta" });
    return;
  }
  if (username.length < 3) {
    res.status(400).json({ error: "Username deve ter pelo menos 3 caracteres" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    return;
  }
  if (store.findUserByUsername(username)) {
    res.status(400).json({ error: "Nome de utilizador já existe" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = store.createUser({
    username: username.toLowerCase().trim(),
    displayName: (displayName ?? username).trim(),
    passwordHash,
    bio: "",
    status: "online",
    inviteCode: genInviteCode(),
    publicKey,
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "90d" });
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Campos em falta" });
    return;
  }
  const user = store.findUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: "Utilizador não encontrado" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Senha incorreta" });
    return;
  }
  store.updateUser(user.id, { status: "online" });
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "90d" });
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ token, user: { ...safeUser, status: "online" } });
});

export { router as authRouter };

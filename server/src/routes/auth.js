import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { publicUser } from '../utils/publicUser.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

function readAccount(body) {
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = String(body.role ?? '').trim();
  const rollNumber = String(body.rollNumber ?? '').trim();
  const department = String(body.department ?? '').trim() || 'Computer Science and Engineering';

  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, 'Name must be between 2 and 80 characters');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address');
  }
  if (password.length < 8 || password.length > 72) {
    throw new HttpError(400, 'Password must be between 8 and 72 characters');
  }
  if (!['student', 'faculty'].includes(role)) {
    throw new HttpError(400, 'Choose a student or faculty account');
  }
  if (role === 'student' && !/^[A-Za-z0-9/-]{4,20}$/.test(rollNumber)) {
    throw new HttpError(400, 'Roll number should be 4–20 letters or digits');
  }
  if (department.length > 80) {
    throw new HttpError(400, 'Department must be 80 characters or fewer');
  }

  return {
    name,
    email,
    password,
    role,
    rollNumber: role === 'student' ? rollNumber : '',
    department,
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const account = readAccount(req.body);

    if (account.role === 'faculty' && process.env.FILE_STORAGE === 'cloudinary') {
      const expectedCode = process.env.FACULTY_REGISTRATION_CODE;
      const suppliedCode = String(req.body.facultyCode ?? '');
      if (!expectedCode || suppliedCode !== expectedCode) {
        throw new HttpError(403, 'A valid faculty registration code is required');
      }
    }
    const existingEmail = await User.findOne({ email: account.email });
    if (existingEmail) throw new HttpError(409, 'An account with this email already exists');

    if (account.role === 'student') {
      const existingRoll = await User.findOne({ rollNumber: account.rollNumber, role: 'student' });
      if (existingRoll) throw new HttpError(409, 'This roll number is already registered');
    }

    const password = await bcrypt.hash(account.password, 10);
    const user = await User.create({ ...account, password });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const user = await User.findOne({ email });
    const matches = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !matches) throw new HttpError(401, 'Email or password is incorrect');
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  }),
);

export default router;

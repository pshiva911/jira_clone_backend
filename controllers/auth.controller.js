const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require("dotenv").config()

const client = new PrismaClient();

exports.register = async (req, res) => {
  // validate body (not now)
  if (await findUser(req.body.email))
    return res.status(409).json({ message: 'user with this email already exists' }).end();
  const pwd = await bcrypt.hash(req.body.pwd, 10);
  const user = await client.user.create({ data: { ...req.body, pwd } });
  const token = generateJwt({ uid: user.id });
  createCookie(res, token);
  res.json(user).end(); // send back newly created user obj
};

exports.logIn = async (req, res) => {
  const { email, pwd } = req.body;
  let user
  try{
    user = await findUser(email);
  }
  catch(e){
    console.log(e)
    return res.status(500).json({ message: e }).end()
  }
  if (!user) return res.status(409).json({ message: 'no account was registered with this email' }).end();
  const isValidPwd = await bcrypt.compare(pwd, user.pwd);
  if (!isValidPwd) return res.status(401).json({ message: 'password is incorrect' }).end();
  const token = generateJwt({ uid: user.id });
  console.log("token : ",token)
  createCookie(res, token);
  res.json(user).end();
};

exports.logOut = async (req, res) => {
  res.clearCookie('jira-clone').end();
};

exports.getAuth = async (req, res) => {};

exports.authMiddleware = (req, res, next) => {
  const token = req.cookies['jira-clone'];
  if (!token)
    return res
      .status(401)
      .json({ status: 401, message: 'please log in to access this resource' })
      .end();
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: err.message }).end();
  }
};

const generateJwt = (payload) => jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '30m' });

const findUser = async (email) => client.user.findFirst({ where: { email } });

const createCookie = (res, token) =>
  res.cookie('jira-clone', token, {
    httpOnly: true,
});

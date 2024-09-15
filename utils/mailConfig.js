const nodemailer = require('nodemailer');
require('dotenv').config()

let mailTransporter =
	nodemailer.createTransport(
		{
			service: 'gmail',
			auth: {
				user: process.env.ADMIN_MAILID,
				pass: process.env.ADMIN_MAILPASS
			}
		}
	);

module.exports = mailTransporter
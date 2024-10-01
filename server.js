const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const app = express()
require('dotenv').config()

const authRoute = require('./routes/auth.route')
const projectRoute = require('./routes/project.route')
const listRoute = require('./routes/list.route')
const issueRoute = require('./routes/issue.route')
const userRoute = require('./routes/user.route')
const memberRoute = require('./routes/member.route')
const commentRoute = require('./routes/comment.route')

const { authMiddleware } = require('./controllers/auth.controller')
const { restrictProjectMiddleware } = require('./utils/restrictProjectMiddleware')

const {upload} = require('./utils/s3upload')


// const {genAddToProjectTemplate,genRemovedFromProjectTemplate,genIssueAssignedTemplate} = require('./controllers/mailer.controller')
// const mailTransporter = require('./utils/mailConfig')

// const corOptions = {
// 	credentials: true,
// 	origin: ["https://77d8-65-1-2-195.ngrok-free.app"],
// 	methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
// }

var whitelist = ['https://77d8-65-1-2-195.ngrok-free.app', 'http://example2.com']
const corsOptions = {
	origin: function (origin, callback) {
	  if (whitelist.indexOf(origin) !== -1 || !origin) {
		callback(null, true)
	  } else {
		callback(new Error('Not allowed by CORS'))
	  }
	},
	credentials: true
  }
  

app.use(cors(corsOptions))
app.use(cookieParser())
// app.use(express.urlencoded({extended:false}))
app.use(express.json({limit: '50mb'}));
app.get('/ok', (req, res) => res.send('The server is active, buddy.').end())

// app.get('/ok',async(req,res)=>{
// 	// const mailDetails = genAddToProjectTemplate("akhildekarla45@gmail.com","akhil","amazing project")
// 	// const mailDetails = genRemovedFromProjectTemplate("akhildekarla45@gmail.com","akhil","amazing project")
// 	const mailDetails = genIssueAssignedTemplate("akhildekarla45@gmail.com","akhil","amazing project","nikhil","A very difficult issue")
// 	mailTransporter.sendMail(mailDetails,(err,data) => {
// 		if(err){
// 			console.log(`error sending mail : ${err}`)
// 			// res.send(`error sending mail : ${err}`).end()
// 		}
// 		else{
// 			console.log(`mail sent successfully : ${JSON.parse(data)}`)
// 			// res.send(`mail sent successfully : ${JSON.parse(data)}`).end()
// 		}

// 	})
// 	res.json('The server is active, buddy.')
	

// })

app.use(express.urlencoded({extended:true}))


app.use('/auth', authRoute)
app.use(authMiddleware)
app.use('/api/user', userRoute)
app.use('/api/project', projectRoute)
app.use('/api/list',restrictProjectMiddleware, listRoute)
app.use('/api/issue', issueRoute)
app.use('/api/member', restrictProjectMiddleware, memberRoute)
app.use('/api/comment', restrictProjectMiddleware, commentRoute)


app.listen(process.env.PORT)

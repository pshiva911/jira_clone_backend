const { PrismaClient } = require('@prisma/client')
const { badRequest } = require('./util')
const {genAddToProjectTemplate,genRemovedFromProjectTemplate} = require('./mailer.controller')
const mailTransporter = require('../utils/mailConfig')

const client = new PrismaClient()

exports.getMembersInProject = async (req, res) => {
	try {
		const { projectId } = req.customParams
		const members = await client.member.findMany({
			where: { projectId: +projectId },
			orderBy: { createdAt: 'asc' },
			include: { User: { select: { username: true, email: true, profileUrl: true } } },
		})
		const users = members.map(({ User, ...memberData }) => ({
			...memberData,
			...User,
		}))
		res.json(users).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.addMember = async (req, res) => {
	try {
		const { projectId, userId } = req.body
		const findingMember = await client.member.findFirst({
			where: { userId, projectId }
		})
		if(findingMember){
			return res.status(400).json({message: 'Member already exists in the project'}).end()
		}
		const member = await client.member.create({
			data: { userId, projectId: +projectId },
		})
		const user = await client.user.findFirst({
			where: { id: +userId },
			select: { id: true, username: true, email: true, profileUrl: false },
		})
		const project = await client.project.update({
			where: { id: projectId },
			data: { updatedAt: new Date(Date.now()).toISOString() },
		})
		// await Promise.all([member, project,user])
		const mailDetails = genAddToProjectTemplate(user.email,user.username,project.name)
		mailTransporter.sendMail(mailDetails,(err,data) => {
			if(err){
				console.log(`error sending mail : ${err}`)
			}
			else{
				console.log(`mail sent successfully : ${JSON.parse(data)}`)				
			}
	
		})
		res.json(member).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.removeMember = async (req, res) => {
	try {
		const { memberId: id, projectId, userId } = req.body
		const user = await client.user.findFirst({
			where: { id: +userId },
			select: { id: true, username: true, email: true, profileUrl: false },
		})
		const member =await  client.member.delete({ where: { id } })
		const removeAssignees = await client.assignee.deleteMany({ where: { AND: { userId, projectId } } })
		const project = await client.project.update({
			where: { id: projectId },
			data: { updatedAt: new Date(Date.now()).toISOString() },
		})
		// const {id : listIds} = await client.list.findMany({
		// 	where : {projectId : projectId}
		// })
		// const issuesInProject = await client.issue.updateMany({
		// 	where: {
		// 	  AND: [
		// 		{ listId: { in: listIds } },
		// 		{ reporterId: userId }
		// 	  ]
		// 	},
		// 	data : {
		// 		reporterId : null
		// 	}
		// });		  
		const mailDetails = genRemovedFromProjectTemplate(user.email,user.username,project.name)
		mailTransporter.sendMail(mailDetails,(err,data) => {
			if(err){
				console.log(`error sending mail : ${err}`)
			}
			else{
				console.log(`mail sent successfully : ${JSON.parse(data)}`)				
			}
	
		})
		res.json(member).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

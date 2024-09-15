const { PrismaClient } = require('@prisma/client')
const mailTransporter = require('../utils/mailConfig')
const { sameContainerReorder, diffContainerReorder, badRequest } = require('./util')
const {genIssueAssignedTemplate} = require('./mailer.controller')

const client = new PrismaClient()

exports.getIssuesInProject = async (req, res) => {
	try {
		const { projectId } = req.customParams
		const { userId } = req.query
		const listIssues = await client.list.findMany({
			where: { projectId: +projectId },
			orderBy: { order: 'asc' },
			include: {
				issues: {
					...(userId && { where: { assignees: { some: { userId: +userId } } } }),
					orderBy: { order: 'asc' },
					include: {
						assignees: {
							orderBy: { createdAt: 'asc' },
						},
						_count: {
							select: { comments: true },
						},
					},
				},
			},
		})
		const issues = listIssues.reduce(
			(p, { id, issues }) => ({
				...p,
				[id]: issues.map(({ _count, ...issue }) => ({ ...issue, ..._count })),
			}),
			{}
		)
		res.json(issues).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.createIssue = async (req, res) => {
	try {
		const { projectId, listId, assignees, ...data } = req.body // opt out projectId
		const { _count: order } = await client.issue.aggregate({ where: { listId }, _count: true })
		const { id: issueId } = await client.issue.create({
			data: { ...data, order: order + 1, listId },
		})
		// create assignee[] rows with new issue id
		await client.assignee.createMany({
			data: assignees.map((userId) => ({ issueId, userId, projectId })),
		})


		const projectDetails = await client.project.findFirst({
			where: { id: +projectId },
		})

		const reporterDetails = await client.user.findFirst({
			where: { id: +data.reporterId }
		})

		const assignedUsers = await client.user.findMany({
			where: {
				id: {
					in: assignees, // 'assignees' is your array of user IDs
				},
			},
		});

		const issueName = data.summary

		async function sendEmailsToAssignedUsers(assignedUsers, projectDetails, reporterDetails, issueName) {
			for (const user of assignedUsers) {
				const mailDetails = genIssueAssignedTemplate(user.email, user.username, projectDetails.name, reporterDetails.username, issueName);

				try {
					const data = await mailTransporter.sendMail(mailDetails);
					console.log(`Mail sent successfully to ${user.email}:`);
				} catch (err) {
					console.error(`Error sending mail to ${user.email}: ${err.message}`);
				}
			}
		}

		// Example usage:
		sendEmailsToAssignedUsers(assignedUsers, projectDetails, reporterDetails, issueName);


		res.json({ msg: 'issue is created' }).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.updateIssue = async (req, res) => {
	try {
		const id = +req.params.id
		const { type, value, projectId } = req.body

		switch (type) {
			case 'listId':
				const { _count: order } = await client.issue.aggregate({
					where: { listId: value },
					_count: true,
				})
				await client.issue.update({
					where: { id },
					data: { [type]: value, order: order + 1 },
				})
				break
			case 'addAssignee':
				await Promise.all([client.assignee.create({ data: { issueId: id, userId: value, projectId } }), updatedAt(id)])
				
				const userDetails =  await client.user.findFirst({
					where: { id: +value },
					select: { id: true, username: true, email: true, profileUrl: false },
				}) 

				const issueDetails = await client.issue.findFirst({
					where: { id }
				})

				const reporterDetails = await client.user.findFirst({
					where: { id: +issueDetails.reporterId }
				})
				
				const projectDetails = await client.project.findFirst({
					where: { id: +projectId },
				}) 				
				const mailDetails = genIssueAssignedTemplate(userDetails.email, userDetails.username, projectDetails.name, reporterDetails.username, issueDetails.summary)
				mailTransporter.sendMail(mailDetails,(err,data) => {
					if(err){
						console.log(`error sending mail : ${err}`)
					}
					else{
						console.log(`mail sent successfully : ${JSON.parse(data)}`)				
					}
			
				})


				break
			case 'removeAssignee':
				await Promise.all([client.assignee.deleteMany({ where: { AND: { issueId: id, userId: value } } }), updatedAt(id)])
				break
			default:
				await client.issue.update({ where: { id }, data: { [type]: value } })
				break
		}
		res.end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.deleteIssue = async (req, res) => {
	try {
		const { id } = req.params
		const issue = await client.issue.delete({ where: { id: +id } })
		res.json(issue).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

exports.reorderIssues = async (req, res) => {
	try {
		const {
			id,
			s: { sId, order },
			d: { dId, newOrder },
		} = req.body

		await (sId === dId ? sameContainerReorder({ id, order, newOrder }, { listId: sId }, client.issue) : diffContainerReorder(req.body, client.issue))
		res.end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

function updatedAt(id) {
	return client.issue.update({
		where: { id },
		data: { updatedAt: new Date(Date.now()).toISOString() },
	})
}

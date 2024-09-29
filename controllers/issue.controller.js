const { PrismaClient } = require('@prisma/client')
const mailTransporter = require('../utils/mailConfig')
const { sameContainerReorder, diffContainerReorder, badRequest } = require('./util')
const { genIssueAssignedTemplate } = require('./mailer.controller')
const { s3Client } = require('../utils/s3upload')
const path = require('path');
const fs = require('fs')
const { Upload } = require(`@aws-sdk/lib-storage`);





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
		// Destructure input data
		const parsedBody = {
			type: Number(req.body.type),
			reporterId: Number(req.body.reporterId),
			priority: Number(req.body.priority),
			summary: req.body.summary,
			descr: req.body.descr,
			projectId: Number(req.body.projectId),
			assignees: JSON.parse(req.body.assignees),
			listId: req.body.listId ? Number(req.body.listId) : null
		};

		

		const { projectId, listId, assignees, ...data } = parsedBody;
		console.log(assignees)

		// Generate random string and prepare file details
		let attachmentName = ""
		if (req.files) {
			const fileExtension = path.extname(req.files[0].originalname);
			const randString = Math.round(Math.random() * 1E9);
			const filePath = path.join("uploads", `s3uploading-object${fileExtension}`);
			const readStream = fs.createReadStream(filePath);

			// S3 upload parameters
			const params = {
				Bucket: process.env.S3_BUCKET,
				Key: `${randString}_${req.files[0].originalname}`,  // Include random string in key
				Body: readStream,
				ACL: 'public-read',
				ContentType: req.files[0].mimetype || 'application/octet-stream',  // Set content type
			};

			// Upload to S3 using @aws-sdk/lib-storage's Upload class
			const parallelUploads3 = new Upload({
				client: s3Client,
				params,
				leavePartsOnError: false,  // Clean up on failure
			});

			// Listen to S3 upload progress
			parallelUploads3.on('httpUploadProgress', (progress) => {
				console.log(`Uploaded ${progress.loaded} of ${progress.total} bytes`);
			});

			// Await the completion of the upload
			await parallelUploads3.done();
			attachmentName = `https://jira-clone-attachments.s3.ap-south-1.amazonaws.com/${randString}_${req.files[0].originalname}`
			// console.log('File uploaded successfully:', `https://jira-clone-attachments.s3.ap-south-1.amazonaws.com/${randString}_${req.files[0].originalname}`);
		}


		// Database logic: aggregate issue count, create new issue, and assign users
		const { _count: order } = await client.issue.aggregate({ where: { listId }, _count: true });
		const { id: issueId } = await client.issue.create({
			data: {
				...data,
				order: order + 1,
				listId,
				attachment: attachmentName
			},
		});

		// Create assignee rows for new issue
		await client.assignee.createMany({
			data: assignees.map((userId) => ({ issueId, userId, projectId })),
		});

		// Fetch project details and reporter details
		const projectDetails = await client.project.findFirst({ where: { id: +projectId } });
		const reporterDetails = await client.user.findFirst({ where: { id: +data.reporterId } });
		const assignedUsers = await client.user.findMany({
			where: { id: { in: assignees } },
		});

		// Issue name
		const issueName = data.summary;

		// Function to send emails to all assigned users
		async function sendEmailsToAssignedUsers(assignedUsers, projectDetails, reporterDetails, issueName) {
			for (const user of assignedUsers) {
				const mailDetails = genIssueAssignedTemplate(user.email, user.username, projectDetails.name, reporterDetails.username, issueName);
				try {
					await mailTransporter.sendMail(mailDetails);
					console.log(`Mail sent successfully to ${user.email}`);
				} catch (err) {
					console.error(`Error sending mail to ${user.email}: ${err.message}`);
				}
			}
		}

		// Send notification emails to assigned users
		await sendEmailsToAssignedUsers(assignedUsers, projectDetails, reporterDetails, issueName);

		// Respond to the client indicating issue creation
		res.json({ msg: 'Issue is created successfully' }).end();
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: 'Failed to create issue', error: err.message });
	}
};

// exports.createIssue = async (req,res) => {
// 	const fileExtension = path.extname(req.files[0].originalname);
// 	console.log(__dirname);
// 	const filePath = path.join("uploads", `s3uploading object${fileExtension}`);
// 	const readStream = fs.createReadStream(filePath);
// 	const params = {
// 	  Bucket: process.env.S3_BUCKET,
// 	  Key: req.files[0].originalname,  // Use the original file name for the key
// 	  Body: readStream,
// 	  ACL: 'public-read',
// 	  ContentType: req.files[0].mimetype || 'application/octet-stream',  // Set the content type
// 	};

// 	try {
// 	  const parallelUploads3 = new Upload({
// 		client: s3Client,
// 		params: params, 
// 		leavePartsOnError: false,
// 	  });

// 	  // Listen to events
// 	  parallelUploads3.on('httpUploadProgress', (progress) => {
// 		console.log(`Uploaded ${progress.loaded} of ${progress.total} bytes`);
// 	  });

// 	  // Wait for the upload to complete
// 	  const data = await parallelUploads3.done();
// 	  console.log('File uploaded successfully:', `https://jira-clone-attachments.s3.ap-south-1.amazonaws.com/${req.files[0].originalname}`);

// 	  return { success: true, message: 'File uploaded successfully', data };

// 	} catch (err) {
// 	  console.error('Error uploading file to S3:', err);
// 	  return { success: false, message: 'Failed to upload file', error: err };
// 	}
//   };

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

				const userDetails = await client.user.findFirst({
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
				mailTransporter.sendMail(mailDetails, (err, data) => {
					if (err) {
						console.log(`error sending mail : ${err}`)
					}
					else {
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

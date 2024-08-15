const { PrismaClient } = require('@prisma/client');
const { sameContainerReorder, diffContainerReorder } = require('./util');

const client = new PrismaClient();

exports.getIssuesInProject = async (req, res) => {
  const { projectId } = req.customParams;
  const { userId } = req.query;
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
        },
      },
    },
  });
  const issues = listIssues.reduce((p, { id, issues }) => ({ ...p, [id]: issues }), {});
  res.json(issues).end();
};


exports.createIssue = async (req, res) => {
  const { projectId, listId, assignees, ...data } = req.body;
  console.log(req.body)
  try {
    // Get the current order count for the issues in the list
    const { _count: order } = await client.issue.aggregate({
      where: { listId },
      _count: true,
    });

    // Create the new issue with incremented order
    const { id: issueId } = await client.issue.create({
      data: { ...data, order: order + 1, listId },
    });

    // Create assignees for the issue
    if (assignees && assignees.length > 0) {
      await client.assignee.createMany({
        data: assignees.map((userId) => ({ issueId, userId })),
      });
    }

    // Respond with success message
    res.status(201).json({ msg: 'Issue created successfully', issueId }).end();

  } catch (error) {
    console.error('Error creating issue:', error);

    // Handle different error scenarios
    if (error.name === 'PrismaClientKnownRequestError') {
      // Handle specific known errors from Prisma, e.g., unique constraint violations
      res.status(400).json({ error: 'Database error occurred', details: error.message }).end();
    } else if (error.name === 'ValidationError') {
      // Handle validation errors
      res.status(422).json({ error: 'Validation error', details: error.message }).end();
    } else {
      // General error handling
      res.status(500).json({ error: 'An unexpected error occurred', details: error.message }).end();
    }
  }
};


exports.updateIssue = async (req, res) => {
  const { id } = req.params;
  const { type, value } = req.body;

  switch (type) {
    case 'listId':
      const { _count: order } = await client.issue.aggregate({
        where: { listId: value },
        _count: true,
      });
      await client.issue.update({ where: { id: +id }, data: { [type]: value, order } });
      break;
    case 'addAssignee':
      await client.assignee.create({ data: { issueId: +id, userId: value } });
      break;
    case 'removeAssignee':
      await client.assignee.deleteMany({ where: { AND: { issueId: +id, userId: value } } });
      break;
    default:
      await client.issue.update({ where: { id: +id }, data: { [type]: value } });
      break;
  }
  res.end();
};

exports.deleteIssue = async (req, res) => {
  const { id } = req.params;
  const issue = await client.issue.delete({ where: { id: +id } });
  res.json(issue).end();
};

exports.reorderIssues = async (req, res) => {
  const {
    id,
    s: { sId, order },
    d: { dId, newOrder },
  } = req.body;

  await (sId === dId
    ? sameContainerReorder({ id, order, newOrder }, { listId: sId }, client.issue)
    : diffContainerReorder(req.body, client.issue));
  res.end();
};

const nodemailer = require('nodemailer');
require('dotenv').config()

// an user added to project
exports.genAddToProjectTemplate = (userMailId, userName, projectName) => {
    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Hello ${userName},</h2>
            <p>You have been invited to join the project <strong>${projectName}</strong>.</p>
            <p>We are excited to have you on board. You can log in to your account and start contributing to the project.</p>
            <p>If you have any questions, feel free to reach out to the project administrator.</p>
            <p>Best Regards,<br/>The Project Team</p>
        </div>
    `;
    const subject = `Your invited to project ${projectName}`;

    return {
        from: process.env.ADMIN_MAILID,
        to: userMailId,
        subject: subject,
        html: htmlTemplate
    };
};

// an user was removed from the project
exports.genRemovedFromProjectTemplate = (userMailId, userName, projectName) => {
    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Hello ${userName},</h2>
            <p>We regret to inform you that you have been removed from the project <strong>${projectName}</strong>.</p>
            <p>If you believe this was a mistake or have any questions, please contact the project administrator.</p>
            <p>Best Regards,<br/>The Project Team</p>
        </div>
    `;
    const subject = `You have been removed from project ${projectName}`;

    return {
        from: process.env.ADMIN_MAILID,
        to: userMailId,
        subject: subject,
        html: htmlTemplate
    };
};


// an issue is assigned to the user
exports.genIssueAssignedTemplate = (userMailId, userName, projectName, reporterName, issueName) => {
    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Hello ${userName},</h2>
            <p>You have been assigned a new issue <strong>${issueName}</strong> in the project <strong>${projectName}</strong>.</p>
            <p>AS a part of this issue you should report to <strong>${reporterName}</strong>.</p>
            <p>Please log in to the project management system to view more details and start working on it.</p>
            <p>Best Regards,<br/>The Project Team</p>
        </div>
    `;
    const subject = `You have been assigned a new issue`;

    return {
        from: process.env.ADMIN_MAILID,
        to: userMailId,
        subject: subject,
        html: htmlTemplate
    };
};







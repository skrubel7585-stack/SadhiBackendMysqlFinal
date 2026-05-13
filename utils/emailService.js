const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html, text = null) => {
    try {
        const mailOptions = {
            from: `"Matrimonial App" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '')
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
};

const sendWelcomeEmail = async (email, name) => {
    const subject = 'Welcome to Matrimonial App!';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome ${name}!</h2>
            <p>Thank you for registering with our matrimonial platform.</p>
            <p>We're excited to help you find your perfect match.</p>
            <p>Complete your profile to get started!</p>
            <a href="${process.env.CLIENT_URL}/profile" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Profile</a>
            <p>Best regards,<br>Matrimonial Team</p>
        </div>
    `;
    return await sendEmail(email, subject, html);
};

const sendOTPEmail = async (email, otp) => {
    const subject = 'Your OTP for Matrimonial App';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Email Verification</h2>
            <p>Your OTP for email verification is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background-color: #f0f0f0; padding: 10px; text-align: center;">${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;
    return await sendEmail(email, subject, html);
};

const sendPasswordResetEmail = async (email, resetToken) => {
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link is valid for 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;
    return await sendEmail(email, subject, html);
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendOTPEmail,
    sendPasswordResetEmail
};
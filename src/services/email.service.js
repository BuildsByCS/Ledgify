const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Ledgify" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};


async function sendRegistrationEMail(userEmail, name){
    const subject = "Welcome to Ledgify! 🎉";
    
    const text = `
Welcome to Ledgify, ${name}!

We're thrilled to have you join our community! 🚀

Your account has been successfully created, and you're all set to start managing your finances like never before.

What's next?
• Complete your profile to personalize your experience
• Set up your budget categories
• Start tracking your income and expenses
• Explore our powerful analytics tools

Need help? Our support team is here for you!

Best regards,
The Ledgify Team
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 20px; color: #333; font-weight: 600; margin-bottom: 20px; }
          .intro-text { color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
          .highlight-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .highlight-box h3 { color: #667eea; margin-top: 0; font-size: 16px; }
          .features-list { list-style: none; padding: 0; margin: 15px 0; }
          .features-list li { padding: 10px 0; color: #555; display: flex; align-items: center; }
          .features-list li:before { content: "✓"; color: #667eea; font-weight: bold; margin-right: 10px; font-size: 18px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
          .cta-button:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer-text { color: #888; font-size: 13px; line-height: 1.6; margin: 0; }
          .social-links { margin-top: 15px; }
          .social-links a { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Ledgify!</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">Your Personal Finance Management Solution</p>
          </div>
          
          <div class="content">
            <p class="greeting">Hi ${name}! 👋</p>
            
            <p class="intro-text">
              We're absolutely thrilled to have you join the Ledgify community! Your account has been successfully created, and you're ready to take control of your finances.
            </p>

            <div class="highlight-box">
              <h3>🚀 What You Can Do Now</h3>
              <ul class="features-list">
                <li>Create and manage multiple budgets</li>
                <li>Track income and expenses in real-time</li>
                <li>Get intelligent financial insights and analytics</li>
                <li>Set financial goals and monitor progress</li>
                <li>Generate detailed financial reports</li>
              </ul>
            </div>

            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              To get started, we recommend completing your profile and setting up your first budget category. Our interactive tutorials are here to guide you every step of the way.
            </p>

            <center>
              <a href="#" class="cta-button">Get Started Now</a>
            </center>

            <div class="highlight-box" style="background: #fff3cd; border-left-color: #ffc107;">
              <h3 style="color: #856404;">💡 Pro Tip</h3>
              <p style="margin: 0; color: #555; font-size: 14px;">
                Set up automatic expense categorization to save time and get more accurate financial insights from day one.
              </p>
            </div>
          </div>

          <div class="footer">
            <p class="footer-text">
              <strong>Questions?</strong> We're here to help! Contact our support team at <a href="mailto:support@ledgify.com" style="color: #667eea; text-decoration: none;">support@ledgify.com</a>
            </p>
            <div class="social-links">
              <a href="#">Facebook</a> • 
              <a href="#">Twitter</a> • 
              <a href="#">Instagram</a>
            </div>
            <p class="footer-text" style="margin-top: 15px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
              © 2026 Ledgify. All rights reserved. | <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail(userEmail, subject, text, html);
}



module.exports = {
  sendRegistrationEMail
};

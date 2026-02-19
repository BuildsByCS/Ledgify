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


async function sendRegistrationEmail(userEmail, name){
    const subject = "Welcome to Ledgify! 🎉";
    
    const text = `
Welcome to Ledgify, ${name}!

We're thrilled to have you join our community!

Your account has been successfully created, and you're all set to start managing your finances like never before.

Need help? Our support team is here for you!

Best regards,
The Ledgify Team
    `;

    let html = `
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
                <h1> Welcome to Ledgify!</h1>
              </div>

              <div class="content">
                <p class="greeting">Hi ${name}! </p>

                <p class="intro-text">
                  We're absolutely thrilled to have you join the Ledgify community! Your account has been successfully created, and you're ready to take control of your finances.
                </p>
              </div>

              <div class="footer">
                <p class="footer-text" style=" padding-top: 15px;">
                  © 2026 Ledgify. All rights reserved. | <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

    await sendEmail(userEmail, subject, text, html);

} 


async function sendTransactionEmail(userEmail, name, amount, fromAccount, toAccount, type, transactionId) {
  let subject;
  let text;
  let html;

  if (type === "debit") {
    subject = "Transaction Successful: Funds Sent!";
    text = `Hello ${name},\n\nYour transaction of Rs ${amount} to account ${toAccount} with transaction ID ${transactionId} was successful.\n\nBest regards,\nThe Ledgify Team`;
    html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        ${commonStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Transaction Successful!</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Hi ${name},</p>
            
            <p class="intro-text">
              Your transaction of <strong>Rs ${amount}</strong> to account <strong>${toAccount}</strong> with transaction ID <strong>${transactionId}</strong> was successful.
            </p>
            <a href="https://ledgify.com/transactions/${transactionId}" class="cta-button">View Transaction</a>
          </div>
    
          <div class="footer">
            <p class="footer-text" style=" padding-top: 15px;">
              © 2026 Ledgify. All rights reserved. | <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;  } else if (type === "credit") {
    subject = "Transaction Successful: Funds Received!";
    text = `Hello ${name},\n\nYou have received Rs ${amount} from account ${fromAccount} with transaction ID ${transactionId}. The transaction was successful.\n\nBest regards,\nThe Ledgify Team`;
    html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        ${commonStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Transaction Successful!</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Hi ${name},</p>
            
            <p class="intro-text">
              You have received <strong>Rs ${amount}</strong> from account <strong>${fromAccount}</strong> with transaction ID <strong>${transactionId}</strong>. The transaction was successful.
            </p>
            <a href="https://ledgify.com/transactions/${transactionId}" class="cta-button">View Transaction</a>
          </div>
    
          <div class="footer">
            <p class="footer-text" style=" padding-top: 15px;">
              © 2026 Ledgify. All rights reserved. | <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;  } else {
    console.error("Invalid transaction email type provided.");
    return;
  }

  await sendEmail(userEmail, subject, text, html);
}


async function sendTransactionFailureEmail(userEmail, name, amount, fromAccount, toAccount) {
  const subject = `Transaction Failed: $${amount} from ${fromAccount} to ${toAccount}`;
  const text = `Hello ${name},\n\nWe regret to inform you that your transaction of $${amount} from account ${fromAccount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Ledgify Team`;
  const html = `<p>Hello ${name},</p><p>We regret to inform you that your transaction of <strong>$${amount}</strong> from account <strong>${fromAccount}</strong> to account <strong>${toAccount}</strong> has failed. Please try again later.</p><p>Best regards,<br>The Ledgify Team</p>`;
  
  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail
};

// Email configuration and Resend client
// Uses Resend for transactional emails

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "Zomieks <noreply@zomieks.co.za>",
  replyTo: process.env.EMAIL_REPLY_TO || "support@zomieks.co.za",
  apiKey: process.env.RESEND_API_KEY || "",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://zomieks.co.za",
};

export type EmailTemplate =
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "order_created"
  | "order_paid"
  | "order_delivered"
  | "order_completed"
  | "milestone_funded"
  | "milestone_released"
  | "new_message"
  | "new_bid"
  | "bid_accepted"
  | "dispute_opened"
  | "dispute_resolved"
  | "verification_approved"
  | "verification_rejected"
  | "subscription_activated"
  | "subscription_expiring";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailData {
  to: EmailRecipient;
  template: EmailTemplate;
  data: Record<string, string | number | boolean | undefined>;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(email: EmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!EMAIL_CONFIG.apiKey) {
    console.warn("Resend API key not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { subject, html, text } = renderTemplate(email.template, email.data);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMAIL_CONFIG.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.from,
        to: email.to.name
          ? `${email.to.name} <${email.to.email}>`
          : email.to.email,
        reply_to: EMAIL_CONFIG.replyTo,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = (await response.json()) as { id: string };
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Render email template to HTML and text
 */
function renderTemplate(
  template: EmailTemplate,
  data: Record<string, string | number | boolean | undefined>
): { subject: string; html: string; text: string } {
  const templates = getTemplates(data);
  const templateData = templates[template];

  if (!templateData) {
    throw new Error(`Unknown email template: ${template}`);
  }

  return {
    subject: templateData.subject,
    html: wrapInLayout(templateData.html),
    text: templateData.text,
  };
}

/**
 * Wrap HTML content in email layout
 */
function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zomieks</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: bold;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .highlight {
      color: #10b981;
      font-weight: 600;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Zomieks</span>
      </div>
      ${content}
      <div class="footer">
        <p>
          <a href="${EMAIL_CONFIG.baseUrl}">Zomieks</a> - South Africa's Freelance Marketplace
        </p>
        <p style="font-size: 12px; margin-top: 10px;">
          You received this email because you have an account with Zomieks.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get all email templates
 */
function getTemplates(data: Record<string, string | number | boolean | undefined>): Record<
  EmailTemplate,
  { subject: string; html: string; text: string }
> {
  const d = (key: string) => String(data[key] || "");

  return {
    welcome: {
      subject: "Welcome to Zomieks! 🚀",
      html: `
        <h1>Welcome to Zomieks, ${d("name")}!</h1>
        <p>You've just joined South Africa's fastest-growing freelance marketplace.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li><strong>Create your first service</strong> - Start selling your skills</li>
          <li><strong>Browse projects</strong> - Find work that matches your expertise</li>
          <li><strong>Complete your profile</strong> - Stand out from the crowd</li>
        </ul>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard" class="button">Go to Dashboard</a>
        </p>
      `,
      text: `Welcome to Zomieks, ${d("name")}!

You've just joined South Africa's fastest-growing freelance marketplace.

Get started at: ${EMAIL_CONFIG.baseUrl}/dashboard`,
    },

    email_verification: {
      subject: "Verify your email address",
      html: `
        <h1>Verify your email</h1>
        <p>Hi ${d("name")},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
          <a href="${d("verifyUrl")}" class="button">Verify Email</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
      `,
      text: `Verify your email

Hi ${d("name")},

Please verify your email by visiting: ${d("verifyUrl")}

This link expires in 24 hours.`,
    },

    password_reset: {
      subject: "Reset your password",
      html: `
        <h1>Reset your password</h1>
        <p>Hi ${d("name")},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center;">
          <a href="${d("resetUrl")}" class="button">Reset Password</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
      `,
      text: `Reset your password

Hi ${d("name")},

Reset your password at: ${d("resetUrl")}

This link expires in 1 hour.`,
    },

    order_created: {
      subject: `New order: ${d("orderNumber")}`,
      html: `
        <h1>New Order Created</h1>
        <p>Hi ${d("name")},</p>
        <p>A new order has been created:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p><strong>Service:</strong> ${d("serviceTitle")}</p>
          <p class="amount">R${d("amount")}</p>
        </div>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">View Order</a>
        </p>
      `,
      text: `New Order Created

Hi ${d("name")},

Order: ${d("orderNumber")}
Service: ${d("serviceTitle")}
Amount: R${d("amount")}

View order: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    order_paid: {
      subject: `Payment received: ${d("orderNumber")}`,
      html: `
        <h1>Payment Received! 💰</h1>
        <p>Hi ${d("name")},</p>
        <p>Great news! Payment has been received for your order:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p class="amount">R${d("amount")}</p>
        </div>
        <p>The funds are now held securely in escrow. You can begin work on this order.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">Start Working</a>
        </p>
      `,
      text: `Payment Received!

Hi ${d("name")},

Payment received for order ${d("orderNumber")}
Amount: R${d("amount")}

Start working: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    order_delivered: {
      subject: `Delivery submitted: ${d("orderNumber")}`,
      html: `
        <h1>Order Delivered! 📦</h1>
        <p>Hi ${d("name")},</p>
        <p>The seller has submitted a delivery for your order:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p><strong>Milestone:</strong> ${d("milestoneTitle")}</p>
        </div>
        <p>Please review the delivery and accept it or request revisions.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">Review Delivery</a>
        </p>
      `,
      text: `Order Delivered!

Hi ${d("name")},

Delivery submitted for order ${d("orderNumber")}
Milestone: ${d("milestoneTitle")}

Review: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    order_completed: {
      subject: `Order completed: ${d("orderNumber")} ✨`,
      html: `
        <h1>Order Completed! ✨</h1>
        <p>Hi ${d("name")},</p>
        <p>Congratulations! Your order has been successfully completed:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p class="amount">R${d("amount")}</p>
        </div>
        <p>Don't forget to leave a review!</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">Leave a Review</a>
        </p>
      `,
      text: `Order Completed! ✨

Hi ${d("name")},

Order ${d("orderNumber")} has been completed.
Amount: R${d("amount")}

Leave a review: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    milestone_funded: {
      subject: `Milestone funded: ${d("milestoneTitle")}`,
      html: `
        <h1>Milestone Funded! 💵</h1>
        <p>Hi ${d("name")},</p>
        <p>A milestone has been funded for your order:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p><strong>Milestone:</strong> ${d("milestoneTitle")}</p>
          <p class="amount">R${d("amount")}</p>
        </div>
        <p>You can now begin work on this milestone!</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">View Order</a>
        </p>
      `,
      text: `Milestone Funded!

Hi ${d("name")},

Milestone "${d("milestoneTitle")}" has been funded.
Amount: R${d("amount")}

View order: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    milestone_released: {
      subject: `Payment released: ${d("milestoneTitle")} 🎉`,
      html: `
        <h1>Payment Released! 🎉</h1>
        <p>Hi ${d("name")},</p>
        <p>Your payment has been released for:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order:</strong> ${d("orderNumber")}</p>
          <p><strong>Milestone:</strong> ${d("milestoneTitle")}</p>
          <p class="amount">R${d("amount")} received</p>
        </div>
        <p>The funds will be available in your account shortly.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/earnings" class="button">View Earnings</a>
        </p>
      `,
      text: `Payment Released! 🎉

Hi ${d("name")},

Payment released for milestone "${d("milestoneTitle")}"
Amount: R${d("amount")}

View earnings: ${EMAIL_CONFIG.baseUrl}/dashboard/earnings`,
    },

    new_message: {
      subject: `New message from ${d("senderName")}`,
      html: `
        <h1>New Message</h1>
        <p>Hi ${d("name")},</p>
        <p>You have a new message from <span class="highlight">${d("senderName")}</span>:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-style: italic;">"${d("messagePreview")}"</p>
        </div>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/messages/${d("conversationId")}" class="button">Reply</a>
        </p>
      `,
      text: `New Message

Hi ${d("name")},

New message from ${d("senderName")}:
"${d("messagePreview")}"

Reply at: ${EMAIL_CONFIG.baseUrl}/dashboard/messages/${d("conversationId")}`,
    },

    new_bid: {
      subject: `New bid on your project: ${d("projectTitle")}`,
      html: `
        <h1>New Bid Received! 📝</h1>
        <p>Hi ${d("name")},</p>
        <p>You've received a new bid on your project:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Project:</strong> ${d("projectTitle")}</p>
          <p><strong>Bidder:</strong> ${d("bidderName")}</p>
          <p class="amount">R${d("bidAmount")}</p>
          <p><strong>Delivery:</strong> ${d("deliveryDays")} days</p>
        </div>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/projects/${d("projectId")}" class="button">View Bid</a>
        </p>
      `,
      text: `New Bid Received!

Hi ${d("name")},

Project: ${d("projectTitle")}
Bidder: ${d("bidderName")}
Amount: R${d("bidAmount")}
Delivery: ${d("deliveryDays")} days

View bid: ${EMAIL_CONFIG.baseUrl}/dashboard/projects/${d("projectId")}`,
    },

    bid_accepted: {
      subject: `Your bid was accepted! 🎉`,
      html: `
        <h1>Congratulations! 🎉</h1>
        <p>Hi ${d("name")},</p>
        <p>Great news! Your bid has been accepted:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Project:</strong> ${d("projectTitle")}</p>
          <p class="amount">R${d("bidAmount")}</p>
        </div>
        <p>An order has been created. Once the buyer funds the first milestone, you can begin work.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">View Order</a>
        </p>
      `,
      text: `Congratulations! Your bid was accepted!

Hi ${d("name")},

Project: ${d("projectTitle")}
Amount: R${d("bidAmount")}

View order: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    dispute_opened: {
      subject: `Dispute opened: ${d("orderNumber")}`,
      html: `
        <h1>Dispute Opened</h1>
        <p>Hi ${d("name")},</p>
        <p>A dispute has been opened for order <strong>${d("orderNumber")}</strong>:</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
          <p><strong>Reason:</strong> ${d("reason")}</p>
        </div>
        <p>Our team will review this dispute and contact you shortly.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">View Order</a>
        </p>
      `,
      text: `Dispute Opened

Hi ${d("name")},

A dispute has been opened for order ${d("orderNumber")}.
Reason: ${d("reason")}

View order: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    dispute_resolved: {
      subject: `Dispute resolved: ${d("orderNumber")}`,
      html: `
        <h1>Dispute Resolved</h1>
        <p>Hi ${d("name")},</p>
        <p>The dispute for order <strong>${d("orderNumber")}</strong> has been resolved:</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p><strong>Resolution:</strong> ${d("resolution")}</p>
        </div>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}" class="button">View Order</a>
        </p>
      `,
      text: `Dispute Resolved

Hi ${d("name")},

Dispute for order ${d("orderNumber")} has been resolved.
Resolution: ${d("resolution")}

View order: ${EMAIL_CONFIG.baseUrl}/dashboard/orders/${d("orderId")}`,
    },

    verification_approved: {
      subject: "ID Verification Approved ✅",
      html: `
        <h1>You're Verified! ✅</h1>
        <p>Hi ${d("name")},</p>
        <p>Great news! Your ID verification has been approved.</p>
        <p>You now have access to:</p>
        <ul>
          <li>Higher transaction limits</li>
          <li>Verified badge on your profile</li>
          <li>Increased trust with clients</li>
        </ul>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard" class="button">Go to Dashboard</a>
        </p>
      `,
      text: `ID Verification Approved!

Hi ${d("name")},

Your ID verification has been approved.

Go to dashboard: ${EMAIL_CONFIG.baseUrl}/dashboard`,
    },

    verification_rejected: {
      subject: "ID Verification Needs Attention",
      html: `
        <h1>Verification Update</h1>
        <p>Hi ${d("name")},</p>
        <p>Unfortunately, we couldn't verify your ID submission:</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
          <p><strong>Reason:</strong> ${d("reason")}</p>
        </div>
        <p>Please submit a new verification with clearer documents.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/verification" class="button">Try Again</a>
        </p>
      `,
      text: `ID Verification Needs Attention

Hi ${d("name")},

Your ID verification was not approved.
Reason: ${d("reason")}

Try again: ${EMAIL_CONFIG.baseUrl}/dashboard/verification`,
    },

    subscription_activated: {
      subject: "Welcome to Zomieks Pro! 🚀",
      html: `
        <h1>Welcome to Pro! 🚀</h1>
        <p>Hi ${d("name")},</p>
        <p>Your ${d("planName")} subscription is now active!</p>
        <p>You now have access to:</p>
        <ul>
          <li><strong>Unlimited bids</strong> - Bid on any project</li>
          <li><strong>Unlimited services</strong> - List all your skills</li>
          <li><strong>Anonymous outsourcing</strong> - Scale your business</li>
          <li><strong>Priority support</strong> - Get help faster</li>
        </ul>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard" class="button">Start Exploring</a>
        </p>
      `,
      text: `Welcome to Zomieks Pro!

Hi ${d("name")},

Your ${d("planName")} subscription is now active.

Explore: ${EMAIL_CONFIG.baseUrl}/dashboard`,
    },

    subscription_expiring: {
      subject: "Your subscription is expiring soon",
      html: `
        <h1>Subscription Expiring</h1>
        <p>Hi ${d("name")},</p>
        <p>Your Zomieks Pro subscription will expire on <strong>${d("expiryDate")}</strong>.</p>
        <p>To keep access to unlimited bids, services, and outsourcing features, please renew your subscription.</p>
        <p style="text-align: center;">
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard/subscription" class="button">Renew Now</a>
        </p>
      `,
      text: `Subscription Expiring

Hi ${d("name")},

Your subscription expires on ${d("expiryDate")}.

Renew: ${EMAIL_CONFIG.baseUrl}/dashboard/subscription`,
    },
  };
}

export type EmailAction = 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'VERIFY_OTP';

interface EmailTemplateParams {
  action: EmailAction;
  link?: string;
  otp?: string;
  userName?: string;
}

export const Email_Template = async ({
  action,
  link,
  otp,
  userName = 'there',
}: EmailTemplateParams) => {
  const isOtp = action === 'VERIFY_OTP';

  // Action-specific configurations
  const actionConfig: Record<
    EmailAction,
    { heading: string; description: string; buttonText?: string; primaryColor: string }
  > = {
    VERIFY_EMAIL: {
      heading: 'Verify Your Email',
      description: 'Thank you for registering! Please click the button below to verify your email address.',
      buttonText: 'Verify Email Address',
      primaryColor: '#10B981', // Emerald Green
    },
    RESET_PASSWORD: {
      heading: 'Reset Your Password',
      description: 'We received a request to reset your password. Click the button below to choose a new one.',
      buttonText: 'Reset Password',
      primaryColor: '#EF4444', // Red
    },
    VERIFY_OTP: {
      heading: 'Your OTP Code',
      description: 'Use the One-Time Password (OTP) below to complete your verification request.',
      primaryColor: '#3B82F6', // Blue
    },
  };

  const { heading, description, buttonText, primaryColor } = actionConfig[action];

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      padding: 20px;
      margin: 0;
      color: #333333;
    ">
      <div style="
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      ">

        <!-- Header -->
        <div style="
          background-color: ${primaryColor};
          padding: 24px 20px;
          text-align: center;
          color: #ffffff;
        ">
          <h2 style="margin: 0; font-size: 22px; font-weight: bold;">
            ${heading}
          </h2>
        </div>

        <!-- Body -->
        <div style="
          padding: 30px 25px;
          line-height: 1.6;
        ">

          <p style="font-size: 16px; margin-top: 0;">Hello ${userName},</p>

          <p style="font-size: 15px; color: #4b5563;">
            ${description}
          </p>

          ${
            isOtp
              ? `
                <!-- OTP Block -->
                <div style="
                  text-align: center;
                  margin: 30px 0;
                ">
                  <div style="
                    display: inline-block;
                    padding: 18px 32px;
                    background-color: #f8fafc;
                    border: 2px dashed ${primaryColor};
                    border-radius: 8px;
                    letter-spacing: 8px;
                    font-size: 32px;
                    font-weight: bold;
                    color: #0f172a;
                  ">
                    ${otp ?? '------'}
                  </div>
                </div>

                <p style="
                  font-size: 14px;
                  color: #64748b;
                  text-align: center;
                  margin-bottom: 20px;
                ">
                  Enter this code on the verification screen to proceed.
                </p>
              `
              : `
                <!-- Button Block -->
                <div style="
                  text-align: center;
                  margin: 30px 0;
                ">
                  <a href="${link ?? '#'}"
                     style="
                       display: inline-block;
                       padding: 14px 28px;
                       background-color: ${primaryColor};
                       color: #ffffff;
                       text-decoration: none;
                       font-size: 16px;
                       font-weight: bold;
                       border-radius: 6px;
                     ">
                    ${buttonText}
                  </a>
                </div>

                <!-- Fallback URL Link -->
                <p style="
                  font-size: 13px;
                  color: #94a3b8;
                  word-break: break-all;
                ">
                  If the button above doesn't work, copy and paste this link into your browser: <br>
                  <a href="${link ?? '#'}" style="color: ${primaryColor};">${link ?? '#'}</a>
                </p>
              `
          }

          <p style="
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
          ">
            This ${isOtp ? 'code' : 'link'} will expire in <strong>15 minutes</strong>.
          </p>

          <p style="
            font-size: 14px;
            color: #64748b;
            margin-top: 0;
          ">
            If you did not request this, please ignore this email.
          </p>

        </div>

        <!-- Footer -->
        <div style="
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 16px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
        ">
          <p style="margin: 0;">
            &copy; ${new Date().getFullYear()} Messenger. All rights reserved.
          </p>
        </div>

      </div>
    </body>
  </html>
  `;
};
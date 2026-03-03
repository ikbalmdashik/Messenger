// export const Email_Template = async (otp: string) => {
//     return (`
//         <html>
//             <body style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
//             <div style="width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
//                 <div style="text-align: center; padding: 10px; background-color: #4CAF50; color: white; border-radius: 8px 8px 0 0;">
//                 <h2>OTP Verification</h2>
//                 </div>
//                 <div style="padding: 20px;">
//                 <p>Dear User,</p>
//                 <p>Your One-Time Password (OTP) is:</p>
//                 <div style="font-size: 36px; font-weight: bold; text-align: center; color: #4CAF50; margin: 20px 0;">
//                     ${otp}
//                 </div>
//                 <p>This OTP will expire in 10 minutes. Please use it to complete your verification.</p>
//                 </div>
//                 <div style="font-size: 14px; color: #777; text-align: center; padding: 10px; border-top: 1px solid #f1f1f1;">
//                 <p>If you did not request this OTP, please ignore this email.</p>
//                 </div>
//             </div>
//             </body>
//         </html>
//     `)
// }

export const Email_Template = async (
  action: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  link: string,
) => {
  const isVerify = action === 'VERIFY_EMAIL';

  const title = isVerify ? 'Verify Your Email' : 'Reset Your Password';
  const heading = isVerify ? 'Email Verification' : 'Password Reset Request';
  const description = isVerify
    ? 'Please verify your email address by clicking the button below.'
    : 'You requested to reset your password. Click the button below to continue.';
  const buttonText = isVerify ? 'Verify Email' : 'Reset Password';

  return `
  <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background-color: ${isVerify ? '#4CAF50' : '#FF6B6B'}; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0;">${heading}</h2>
        </div>

        <!-- Body -->
        <div style="padding: 25px; color: #333;">
          <p>Hello,</p>
          <p>${description}</p>

          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}"
               style="
                 display: inline-block;
                 padding: 14px 28px;
                 background-color: ${isVerify ? '#4CAF50' : '#FF6B6B'};
                 color: #ffffff;
                 text-decoration: none;
                 font-size: 16px;
                 font-weight: bold;
                 border-radius: 6px;
               ">
              ${buttonText}
            </a>
          </div>

          <p style="font-size: 14px; color: #777;">
            This link will expire in <strong>15 minutes</strong>.
          </p>

          <p style="font-size: 14px; color: #777;">
            If you did not request this, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f1f1; padding: 12px; text-align: center; font-size: 13px; color: #888;">
          <p>© ${new Date().getFullYear()} Messenger. All rights reserved.</p>
        </div>

      </div>
    </body>
  </html>
  `;
};

// export const Email_Template = async (
//   action: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'VERIFY_LOGIN',
//   link: string,
// ) => {
//   const isVerify = action === 'VERIFY_EMAIL' || 'VERIFY_LOGIN';

//   const title = isVerify ? 'Verify Your Email' : 'Reset Your Password';
//   const heading = isVerify ? 'Email Verification' : 'Password Reset Request';
//   const description = isVerify
//     ? 'Please verify your email address by clicking the button below.'
//     : 'You requested to reset your password. Click the button below to continue.';
//   const buttonText = isVerify ? 'Verify Email' : 'Reset Password';

//   return `
//   <html>
//     <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
//       <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

//         <!-- Header -->
//         <div style="background-color: ${isVerify ? '#4CAF50' : '#FF6B6B'}; padding: 20px; text-align: center; color: #ffffff;">
//           <h2 style="margin: 0;">${heading}</h2>
//         </div>

//         <!-- Body -->
//         <div style="padding: 25px; color: #333;">
//           <p>Hello,</p>
//           <p>${description}</p>

//           <!-- Button -->
//           <div style="text-align: center; margin: 30px 0;">
//             <a href="${link}"
//                style="
//                  display: inline-block;
//                  padding: 14px 28px;
//                  background-color: ${isVerify ? '#4CAF50' : '#FF6B6B'};
//                  color: #ffffff;
//                  text-decoration: none;
//                  font-size: 16px;
//                  font-weight: bold;
//                  border-radius: 6px;
//                ">
//               ${buttonText}
//             </a>
//           </div>

//           <p style="font-size: 14px; color: #777;">
//             This link will expire in <strong>15 minutes</strong>.
//           </p>

//           <p style="font-size: 14px; color: #777;">
//             If you did not request this, please ignore this email.
//           </p>
//         </div>

//         <!-- Footer -->
//         <div style="background-color: #f1f1f1; padding: 12px; text-align: center; font-size: 13px; color: #888;">
//           <p>© ${new Date().getFullYear()} Messenger. All rights reserved.</p>
//         </div>

//       </div>
//     </body>
//   </html>
//   `;
// };









export const Email_Template = async (
  action: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'VERIFY_LOGIN',
  link?: string,
  otp?: string,
) => {
  const isVerify =
    action === 'VERIFY_EMAIL' || action === 'VERIFY_LOGIN';

  const isOtp = action === 'VERIFY_LOGIN';

  const title = isOtp
    ? 'Your Verification Code'
    : isVerify
      ? 'Verify Your Email'
      : 'Reset Your Password';

  const heading = isOtp
    ? 'Verification Code'
    : isVerify
      ? 'Email Verification'
      : 'Password Reset Request';

  const description = isOtp
    ? 'Use the verification code below to continue. This code will expire in 15 minutes.'
    : isVerify
      ? 'Please verify your email address by clicking the button below.'
      : 'You requested to reset your password. Click the button below to continue.';

  const buttonText = isVerify
    ? 'Verify Email'
    : 'Reset Password';

  const primaryColor = isOtp || isVerify
    ? '#4CAF50'
    : '#FF6B6B';

  return `
  <html>
    <body style="
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      padding: 20px;
      margin: 0;
    ">
      <div style="
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      ">

        <!-- Header -->
        <div style="
          background-color: ${primaryColor};
          padding: 20px;
          text-align: center;
          color: #ffffff;
        ">
          <h2 style="margin: 0;">
            ${heading}
          </h2>
        </div>

        <!-- Body -->
        <div style="
          padding: 25px;
          color: #333;
        ">

          <p>Hello,</p>

          <p>
            ${description}
          </p>

          ${
            isOtp
              ? `
                <!-- OTP -->
                <div style="
                  text-align: center;
                  margin: 30px 0;
                ">
                  <div style="
                    display: inline-block;
                    padding: 18px 30px;
                    background-color: #f5f5f5;
                    border: 2px dashed ${primaryColor};
                    border-radius: 8px;
                    letter-spacing: 8px;
                    font-size: 28px;
                    font-weight: bold;
                    color: #333;
                  ">
                    ${otp ?? ''}
                  </div>
                </div>

                <p style="
                  font-size: 14px;
                  color: #777;
                  text-align: center;
                ">
                  Enter this code in the verification screen.
                </p>
              `
              : `
                <!-- Button -->
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
              `
          }

          <p style="
            font-size: 14px;
            color: #777;
          ">
            This ${
              isOtp ? 'code' : 'link'
            } will expire in <strong>15 minutes</strong>.
          </p>

          <p style="
            font-size: 14px;
            color: #777;
          ">
            If you did not request this, please ignore this email.
          </p>

        </div>

        <!-- Footer -->
        <div style="
          background-color: #f1f1f1;
          padding: 12px;
          text-align: center;
          font-size: 13px;
          color: #888;
        ">
          <p>
            © ${new Date().getFullYear()} Messenger.
            All rights reserved.
          </p>
        </div>

      </div>
    </body>
  </html>
  `;
};
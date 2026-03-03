import PasswordChange from "@/app/components/secure-session/passwordChange"

export default function SecureSession() {
  const token = "abc123"

  if(!token) {
    return(
      <>
        <h1>Invalid Token!</h1>
      </>
    );
  }

  return (
    <>
      <PasswordChange token={token} />
    </>
  );
}

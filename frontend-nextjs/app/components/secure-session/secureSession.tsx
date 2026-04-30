import { ReactNode } from "react";

interface SecureSessionProps {
  children: ReactNode;
}

const SecureSession = ({ children }: SecureSessionProps) => {
  return (
    <div className="secure-session-wrapper">
      {children}
    </div>
  );
};

export default SecureSession;

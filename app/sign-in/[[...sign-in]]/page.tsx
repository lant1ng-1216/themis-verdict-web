import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4fb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      <SignIn />
    </div>
  );
}

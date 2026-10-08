export default function BiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 100,
        background: "#f5f5f5",
        display: "flex",
      }}
    >
      {children}
    </div>
  );
}

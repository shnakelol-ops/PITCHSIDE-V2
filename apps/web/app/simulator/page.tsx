import { SimulatorPixiSurface } from "@src/features/simulator/pixi/simulator-pixi-surface";

export default function Page() {
  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          textAlign: "center",
        }}
      >
        PIXI SURFACE TEST
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <SimulatorPixiSurface sport="soccer" />
      </div>
    </div>
  );
}

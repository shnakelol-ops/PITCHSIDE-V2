import * as PIXI from "pixi.js";

export class JerseyToken extends PIXI.Container {
  constructor(id, name, color, style = "solid") {
    super();
    this.id = id;
    this.playerName = name;
    this.teamColor = color;

    // 1. THE GLOW (The "Warm" Effect)
    const glow = new PIXI.Graphics();
    glow.beginFill(0xffcc00, 0.4); // Gold tint
    glow.drawCircle(0, 0, 30);
    glow.endFill();
    glow.filters = [new PIXI.BlurFilter(12)];
    this.addChild(glow);

    // 2. THE JERSEY BASE
    this.jerseyBody = new PIXI.Graphics();
    this.renderJersey(style);
    this.addChild(this.jerseyBody);

    // 3. THE NAME TAG
    const textStyle = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: "#ffffff",
      fontWeight: "bold",
      dropShadow: true,
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });
    const label = new PIXI.Text(this.playerName, textStyle);
    label.anchor.set(0.5, 0);
    label.y = 25; // Positions name below the jersey
    this.addChild(label);

    // 4. INTERACTIVITY (Make it movable)
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.onDragStart, this);
  }

  renderJersey(style) {
    this.jerseyBody.clear();
    this.jerseyBody.beginFill(this.teamColor);
    // Simple jersey shape placeholder
    this.jerseyBody.drawRect(-15, -15, 30, 30); // Torso
    this.jerseyBody.drawRect(-22, -15, 7, 12); // Left sleeve
    this.jerseyBody.drawRect(15, -15, 7, 12); // Right sleeve
    this.jerseyBody.endFill();

    // Add the Sash/Slash/Hoops
    if (style === "slash") {
      this.jerseyBody.lineStyle(3, 0xffffff, 0.6);
      this.jerseyBody.moveTo(-15, 15);
      this.jerseyBody.lineTo(15, -15);
    }
  }

  onDragStart(event) {
    // Handle dragging logic here
    this.alpha = 0.8;
    this.data = event.data;
    this.on("pointermove", this.onDragMove);
  }
}

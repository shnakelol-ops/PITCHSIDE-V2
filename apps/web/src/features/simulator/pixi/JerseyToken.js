import * as PIXI from "pixi.js";

const NAME_STYLE = new PIXI.TextStyle({
  fontFamily: "Arial",
  fontSize: 12,
  fill: "#ffffff",
  fontWeight: "bold",
  dropShadow: true,
  dropShadowBlur: 4,
  dropShadowDistance: 2,
});

export class JerseyToken extends PIXI.Container {
  constructor(id, name, color, style = "solid") {
    super();
    this.id = id;
    this.playerName = name;
    this.teamColor = color;
    this.jerseyStyle = style;
    this.data = null;

    // 1. THE GLOW (The "Warm" Effect)
    this.glow = new PIXI.Graphics();
    this.glow.beginFill(0xffcc00, 0.4); // Gold tint
    this.glow.drawCircle(0, 0, 30);
    this.glow.endFill();
    this.glow.filters = [new PIXI.BlurFilter(12)];
    this.addChild(this.glow);

    // 2. THE JERSEY BASE
    this.jerseyBody = new PIXI.Graphics();
    this.addChild(this.jerseyBody);
    this.renderJersey(this.jerseyStyle);

    // 3. THE NAME TAG
    this.label = new PIXI.Text(this.playerName, NAME_STYLE);
    this.label.anchor.set(0.5, 0);
    this.label.y = 25; // Positions name below the jersey
    this.addChild(this.label);

    // 4. INTERACTIVITY (Make it movable)
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.onDragStart, this);
  }

  setIdentity(id, name) {
    this.id = id;
    this.playerName = name;
    this.label.text = name;
  }

  setTeamStyle(color, style = this.jerseyStyle) {
    this.teamColor = color;
    this.jerseyStyle = style;
    this.renderJersey(this.jerseyStyle);
  }

  renderJersey(style = this.jerseyStyle) {
    this.jerseyStyle = style;
    this.jerseyBody.clear();
    this.jerseyBody.beginFill(this.teamColor);
    // Simple jersey shape placeholder
    this.jerseyBody.drawRect(-15, -15, 30, 30); // Torso
    this.jerseyBody.drawRect(-22, -15, 7, 12); // Left sleeve
    this.jerseyBody.drawRect(15, -15, 7, 12); // Right sleeve
    this.jerseyBody.endFill();

    // Add the Sash/Slash/Hoops
    if (this.jerseyStyle === "slash") {
      this.jerseyBody.lineStyle(3, 0xffffff, 0.6);
      this.jerseyBody.moveTo(-15, 15);
      this.jerseyBody.lineTo(15, -15);
    }
  }

  onDragStart(event) {
    // Drag wiring is owned by parent interaction systems; this just captures initial intent.
    this.alpha = 0.8;
    this.data = event.data;
    this.on("pointermove", this.onDragMove, this);
  }

  onDragMove() {
    // Intentionally a no-op placeholder to keep pointermove subscription safe.
  }
}

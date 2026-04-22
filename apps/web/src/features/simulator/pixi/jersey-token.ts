import {
  BlurFilter,
  Container,
  Graphics,
  Text,
  TextStyle,
  type ColorSource,
} from "pixi.js";

export type JerseyStyle = "solid" | "slash";

/**
 * Interactive jersey token with glow + stylized shirt + name tag.
 */
export class JerseyToken extends Container {
  readonly playerName: string;
  readonly teamColor: ColorSource;
  readonly jersey: Graphics;
  readonly nameTag: Text;
  private jerseyStyle: JerseyStyle;

  constructor(
    playerName: string,
    teamColor: ColorSource,
    jerseyStyle: JerseyStyle = "solid",
  ) {
    super();

    this.playerName = playerName;
    this.teamColor = teamColor;
    this.jerseyStyle = jerseyStyle;
    this.eventMode = "static";
    this.cursor = "pointer";

    const glow = new Graphics();
    glow.circle(0, 0, 35).fill({ color: 0xffd700, alpha: 0.3 });
    glow.filters = [new BlurFilter({ strength: 10 })];
    this.addChild(glow);

    this.jersey = new Graphics();
    this.drawJersey(this.jerseyStyle);
    this.addChild(this.jersey);

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: "bold",
      fill: "#ffffff",
      dropShadow: {
        color: 0x000000,
        alpha: 0.35,
        distance: 2,
      },
    });
    this.nameTag = new Text({
      text: this.playerName,
      style,
    });
    this.nameTag.anchor.set(0.5, 0);
    this.nameTag.y = 30;
    this.addChild(this.nameTag);
  }

  drawJersey(style: JerseyStyle): void {
    this.jerseyStyle = style;
    this.jersey.clear();
    this.jersey
      .rect(-20, -20, 40, 40)
      .rect(-30, -20, 15, 15)
      .rect(15, -20, 15, 15)
      .fill(this.teamColor);

    if (style === "slash") {
      this.jersey
        .moveTo(-20, 20)
        .lineTo(20, -20)
        .stroke({
          width: 4,
          color: 0xffffff,
          alpha: 0.8,
          cap: "round",
        });
    }
  }
}

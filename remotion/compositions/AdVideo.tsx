import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from "remotion";

export interface AdVideoProps {
  hook: string;
  subheading: string;
  cta: string;
  companyName: string;
  proof: string;
  backgroundVideoUrl?: string;
  backgroundImageUrl?: string;
  accentColor?: string;
  bullets?: string[];
}

function FadeUpText({
  text,
  fromFrame,
  fontSize,
  fontWeight,
  color,
  textAlign,
  top,
}: {
  text: string;
  fromFrame: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: "center" | "left" | "right";
  top: number;
}) {
  const frame = useCurrentFrame();
  const local = frame - fromFrame;

  const opacity = interpolate(local, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(local, [0, 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 60,
        right: 60,
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        fontWeight,
        color,
        textAlign,
        fontFamily: "Arial Black, Arial, sans-serif",
        lineHeight: 1.2,
        textShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
}

function CTAPill({
  text,
  fromFrame,
  accentColor,
}: {
  text: string;
  fromFrame: number;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const local = frame - fromFrame;

  const opacity = interpolate(local, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(local, [0, 25], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          backgroundColor: accentColor,
          borderRadius: 60,
          paddingLeft: 70,
          paddingRight: 70,
          paddingTop: 32,
          paddingBottom: 32,
          fontSize: 44,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "Arial Black, Arial",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export const AdVideo: React.FC<AdVideoProps> = ({
  hook,
  subheading,
  cta,
  companyName,
  proof,
  backgroundVideoUrl,
  backgroundImageUrl,
  accentColor = "#6366f1",
  bullets = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overlayOpacity = interpolate(frame, [0, 40], [0.3, 0.58], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#111111" }}>

      {/* Background */}
      {backgroundVideoUrl ? (
        <Video
          src={backgroundVideoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={0}
        />
      ) : backgroundImageUrl ? (
        <Img
          src={backgroundImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bgScale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        />
      )}

      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
        }}
      />

      {/* Bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 700,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      />

      {/* Brand name */}
      <Sequence from={5}>
        <FadeUpText
          text={companyName.toUpperCase()}
          fromFrame={5}
          fontSize={30}
          fontWeight={600}
          color="rgba(255,255,255,0.65)"
          textAlign="center"
          top={80}
        />
      </Sequence>

      {/* Hook */}
      <Sequence from={15}>
        <FadeUpText
          text={hook}
          fromFrame={15}
          fontSize={86}
          fontWeight={900}
          color="#ffffff"
          textAlign="center"
          top={200}
        />
      </Sequence>

      {/* Subheading */}
      <Sequence from={38}>
        <FadeUpText
          text={subheading}
          fromFrame={38}
          fontSize={40}
          fontWeight={400}
          color="rgba(255,255,255,0.85)"
          textAlign="center"
          top={500}
        />
      </Sequence>

      {/* Proof */}
      {proof ? (
        <Sequence from={52}>
          <FadeUpText
            text={proof}
            fromFrame={52}
            fontSize={32}
            fontWeight={600}
            color={accentColor}
            textAlign="center"
            top={640}
          />
        </Sequence>
      ) : null}

      {/* Bullets */}
      {bullets.slice(0, 3).map((bullet, i) => (
        <Sequence from={58 + i * 14} key={i}>
          <FadeUpText
            text={`✅  ${bullet}`}
            fromFrame={58 + i * 14}
            fontSize={34}
            fontWeight={600}
            color="#ffffff"
            textAlign="left"
            top={780 + i * 88}
          />
        </Sequence>
      ))}

      {/* CTA */}
      <Sequence from={85}>
        <CTAPill
          text={cta}
          fromFrame={85}
          accentColor={accentColor}
        />
      </Sequence>

      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 60,
          right: 60,
          height: 3,
          backgroundColor: accentColor,
          opacity: interpolate(frame, [10, 40], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

    </AbsoluteFill>
  );
};
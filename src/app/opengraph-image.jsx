import { ImageResponse } from "next/og";
import { BRAND, TAGLINE } from "@/lib/brand";
import { COLORS } from "@/lib/colors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  ink: COLORS.ink,
  paper: COLORS.paper,
  line: "rgba(14, 22, 38, 0.12)",
  brand: COLORS.brand,
  brandSoft: COLORS.brandSoft,
  signalGreen: COLORS.signalGreen,
  signalAmber: COLORS.signalAmber,
  signalRed: COLORS.signalRed
};

// This App Router image route generates the OG/Twitter PNG automatically.
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: colors.ink,
          color: "white",
          padding: 60,
          fontFamily: "Arial, Helvetica, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            <div
              style={{
                color: colors.brand,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 8,
                textTransform: "uppercase"
              }}
            >
              {BRAND}
            </div>
            <div style={{ color: "white", fontSize: 22, fontWeight: 800 }}>
              {TAGLINE}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 54
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 650
              }}
            >
              <div
                style={{
                  color: "white",
                  fontSize: 64,
                  fontWeight: 900,
                  lineHeight: 1.03,
                  letterSpacing: 0
                }}
              >
                See where your online presence is losing you customers.
              </div>
            </div>

            <div
              style={{
                width: 390,
                display: "flex",
                flexDirection: "column",
                gap: 22,
                background: colors.paper,
                color: colors.ink,
                borderRadius: 28,
                border: `2px solid ${colors.line}`,
                padding: 34
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>61 / 100</div>
                <div style={{ color: colors.signalAmber, fontSize: 24, fontWeight: 900 }}>
                  Findable, but leaking calls.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <ScoreRow color={colors.signalGreen} tone="good" text="Phone & address consistent" />
                <ScoreRow color={colors.signalRed} tone="bad" text="Google hours don't match" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

function ScoreRow({ color, tone, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 24,
        fontWeight: 800,
        lineHeight: 1.2
      }}
    >
      <StatusIcon color={color} tone={tone} />
      <div>{text}</div>
    </div>
  );
}

function StatusIcon({ color, tone }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        border: `3px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {tone === "good" ? (
        <div
          style={{
            width: 16,
            height: 10,
            display: "flex",
            borderLeft: `4px solid ${color}`,
            borderBottom: `4px solid ${color}`,
            transform: "rotate(-45deg)",
            marginTop: -4
          }}
        />
      ) : (
        <div
          style={{
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: 20,
              height: 4,
              display: "flex",
              background: color,
              transform: "rotate(45deg)"
            }}
          />
          <div
            style={{
              width: 20,
              height: 4,
              display: "flex",
              background: color,
              transform: "rotate(-45deg)",
              marginLeft: -20
            }}
          />
        </div>
      )}
    </div>
  );
}
"use client";

type ShareTeam = {
  name: string;
  goals: number;
  isEliminated: boolean;
};

type ShareRow = {
  rank: number;
  playerName: string;
  totalGoals: number;
  status: string;
  teams: ShareTeam[];
};

type ShareLeaderboardButtonProps = {
  gameName: string;
  prizePot: number;
  rows: ShareRow[];
};

function sanitiseFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  let value = text;

  while (ctx.measureText(value).width > maxWidth && value.length > 3) {
    value = `${value.slice(0, -4)}...`;
  }

  ctx.fillText(value, x, y);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.95)
  );

  if (!blob) {
    return;
  }

  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "World Cup Blackjack leaderboard",
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ShareLeaderboardButton({
  gameName,
  prizePot,
  rows,
}: ShareLeaderboardButtonProps) {
  async function handleShare() {
    const width = 1080;
    const rowHeight = 86;
    const height = 250 + rows.length * rowHeight + 70;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#111827";
    ctx.font = "700 48px Arial";
    drawText(ctx, "World Cup Blackjack", 48, 72, 960);

    ctx.font = "700 34px Arial";
    drawText(ctx, gameName, 48, 118, 700);

    ctx.font = "700 34px Arial";
    ctx.fillText(`Prize pot: £${prizePot}`, 48, 166);

    ctx.font = "400 24px Arial";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(new Date().toLocaleString("en-GB"), 48, 204);

    roundedRect(ctx, 48, 230, width - 96, 58, 14);
    ctx.fillStyle = "#111827";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px Arial";
    ctx.fillText("Rank", 74, 266);
    ctx.fillText("Player", 160, 266);
    ctx.fillText("Teams", 430, 266);
    ctx.fillText("Goals", 810, 266);
    ctx.fillText("Status", 910, 266);

    rows.forEach((row, index) => {
      const y = 304 + index * rowHeight;
      const isBust = row.totalGoals > 21;
      const isPerfect = row.totalGoals === 21;

      roundedRect(ctx, 48, y - 8, width - 96, rowHeight - 14, 12);
      ctx.fillStyle = isPerfect ? "#dcfce7" : isBust ? "#fee2e2" : "#ffffff";
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.font = "700 28px Arial";
      ctx.fillText(String(row.rank), 78, y + 36);
      drawText(ctx, row.playerName, 160, y + 36, 230);

      ctx.font = "400 20px Arial";
      const teamText =
        row.teams.length > 0
          ? row.teams
              .map((team) => `${team.name} (${team.goals})`)
              .join(", ")
          : "No teams drawn";
      ctx.fillStyle = row.teams.some((team) => team.isEliminated)
        ? "#991b1b"
        : "#374151";
      drawText(ctx, teamText, 430, y + 34, 330);

      ctx.fillStyle = "#111827";
      ctx.font = "700 30px Arial";
      ctx.fillText(String(row.totalGoals), 828, y + 36);

      ctx.font = "700 20px Arial";
      ctx.fillStyle = isPerfect ? "#166534" : isBust ? "#991b1b" : "#374151";
      drawText(ctx, row.status, 910, y + 34, 110);
    });

    ctx.fillStyle = "#6b7280";
    ctx.font = "400 20px Arial";
    ctx.fillText("Generated from world-cup-roulette.vercel.app", 48, height - 34);

    await downloadCanvas(
      canvas,
      `${sanitiseFileName(gameName) || "leaderboard"}-leaderboard.png`
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex rounded-lg border bg-gray-100 px-4 py-3 text-sm font-semibold hover:bg-gray-200"
    >
      Share leaderboard
    </button>
  );
}

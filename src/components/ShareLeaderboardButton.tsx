"use client";

type ShareTeam = {
  name: string;
  code: string | null;
  flagUrl: string | null;
  goals: number;
  gamesPlayed: number;
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

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
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

    const flagUrls = Array.from(
      new Set(
        rows
          .flatMap((row) => row.teams.map((team) => team.flagUrl))
          .filter((flagUrl): flagUrl is string => Boolean(flagUrl))
      )
    );

    const flags = new Map<string, HTMLImageElement>();
    await Promise.all(
      flagUrls.map(async (flagUrl) => {
        const image = await loadImage(flagUrl);

        if (image) {
          flags.set(flagUrl, image);
        }
      })
    );

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
    ctx.fillText("Player", 145, 266);
    ctx.fillText("Teams", 315, 266);
    ctx.fillText("Goals", 850, 266);
    ctx.fillText("Status", 930, 266);

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
      drawText(ctx, row.playerName, 145, y + 36, 145);

      if (row.teams.length === 0) {
        ctx.font = "400 20px Arial";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("No teams drawn", 315, y + 34);
      } else {
        let chipX = 315;
        let chipY = y + 6;
        const minChipX = 315;
        const maxChipX = 838;

        for (const [teamIndex, team] of row.teams.entries()) {
          const code = team.code ?? team.name.slice(0, 3).toUpperCase();
          const label = `${code} ${team.goals} in ${team.gamesPlayed}`;
          const chipWidth = 164;

          if (chipX + chipWidth > maxChipX) {
            chipX = minChipX;
            chipY += 36;
          }

          if (teamIndex > 0 && chipY > y + 44) {
            ctx.font = "700 22px Arial";
            ctx.fillStyle = "#6b7280";
            ctx.fillText("+", chipX + 4, chipY + 27);
            break;
          }

          roundedRect(ctx, chipX, chipY, chipWidth, 32, 9);
          ctx.fillStyle = team.isEliminated ? "#fee2e2" : "#f3f4f6";
          ctx.fill();

          const flag = team.flagUrl ? flags.get(team.flagUrl) : null;

          if (flag) {
            ctx.drawImage(flag, chipX + 10, chipY + 8, 28, 18);
          } else {
            roundedRect(ctx, chipX + 10, chipY + 8, 28, 18, 3);
            ctx.fillStyle = "#d1d5db";
            ctx.fill();
          }

          ctx.font = "700 19px Arial";
          ctx.fillStyle = team.isEliminated ? "#991b1b" : "#374151";
          ctx.fillText(label, chipX + 48, chipY + 23);

          chipX += chipWidth + 8;
        }
      }

      ctx.fillStyle = "#111827";
      ctx.font = "700 30px Arial";
      ctx.fillText(String(row.totalGoals), 868, y + 36);

      ctx.font = "700 20px Arial";
      ctx.fillStyle = isPerfect ? "#166534" : isBust ? "#991b1b" : "#374151";
      drawText(ctx, row.status, 930, y + 34, 100);
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

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

type TeamLinkProps = {
  teamId: number;
  name: string;
  code?: string | null;
  flagUrl?: string | null;
  showCode?: boolean;
  isEliminated?: boolean;
  className?: string;
  imageClassName?: string;
};

export default function TeamLink({
  teamId,
  name,
  code,
  flagUrl,
  showCode = false,
  isEliminated = false,
  className = "",
  imageClassName = "h-4 w-6",
}: TeamLinkProps) {
  const eliminatedClass = isEliminated
    ? "font-semibold text-red-700 decoration-red-300 hover:decoration-red-700"
    : "decoration-gray-300 hover:decoration-gray-900";

  return (
    <Link
      href={`/teams/${teamId}`}
      className={`inline-flex items-center gap-2 underline underline-offset-2 ${eliminatedClass} ${className}`}
    >
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={`${name} flag`}
          className={`${imageClassName} rounded-sm object-cover`}
        />
      ) : (
        <span
          className={`${imageClassName} inline-block rounded-sm bg-gray-200`}
        />
      )}

      <span>
        {name}
        {showCode && code ? ` (${code})` : ""}
      </span>
    </Link>
  );
}

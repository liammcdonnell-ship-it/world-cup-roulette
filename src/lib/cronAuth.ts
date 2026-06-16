import { NextRequest } from "next/server";

export function getCronRequestSecret(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return request.nextUrl.searchParams.get("secret");
}

export function isAuthorisedCronRequest(request: NextRequest) {
  return (
    Boolean(process.env.CRON_SECRET) &&
    getCronRequestSecret(request) === process.env.CRON_SECRET
  );
}

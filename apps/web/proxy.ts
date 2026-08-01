import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.rewrite(new URL("/legacy-home.html", request.url));
}

export const config = {
  matcher: "/",
};

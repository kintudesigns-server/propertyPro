import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
// We will allow public listings (/listings) and auth routes to bypass middleware.

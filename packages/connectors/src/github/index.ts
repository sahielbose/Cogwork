import { z } from "zod";
import { defineAction, type Connector } from "../core/types";

/** GitHub connector — fixture-backed (Phase 0–2). GitHub OAuth2. */

export const githubListIssues = defineAction({
  name: "github.list_issues",
  description: "List issues in a GitHub repo (owner/repo).",
  inputSchema: z.object({
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).optional(),
  }),
  outputSchema: z.object({
    issues: z.array(
      z.object({ number: z.number(), title: z.string(), state: z.string(), url: z.string() }),
    ),
  }),
  sideEffect: false,
  fixture: (input) => ({
    issues: [
      { number: 214, title: "Engine retry backoff", state: "open", url: `https://github.com/${input.repo}/issues/214` },
      { number: 209, title: "Flaky approval test", state: "open", url: `https://github.com/${input.repo}/issues/209` },
    ],
  }),
});

export const githubCreateIssue = defineAction({
  name: "github.create_issue",
  description: "Open a new GitHub issue. Side-effecting → approval-gated.",
  inputSchema: z.object({ repo: z.string(), title: z.string(), body: z.string().optional() }),
  outputSchema: z.object({ number: z.number(), url: z.string() }),
  sideEffect: true,
  fixture: (input) => {
    const number = 1000 + (input.title.length % 999);
    return { number, url: `https://github.com/${input.repo}/issues/${number}` };
  },
});

export const githubComment = defineAction({
  name: "github.comment",
  description: "Comment on a GitHub issue or PR. Side-effecting → approval-gated.",
  inputSchema: z.object({ repo: z.string(), number: z.number(), body: z.string() }),
  outputSchema: z.object({ commentId: z.string(), url: z.string() }),
  sideEffect: true,
  fixture: (input) => ({
    commentId: `c_${input.number}`,
    url: `https://github.com/${input.repo}/issues/${input.number}#issuecomment`,
  }),
});

export const githubConnector: Connector = {
  provider: "github",
  authType: "oauth2",
  oauth: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo"],
    refresh: async () => {
      throw new Error("Live GitHub OAuth is wired at go-live (Phase 3).");
    },
  },
  actions: [githubListIssues, githubCreateIssue, githubComment],
};

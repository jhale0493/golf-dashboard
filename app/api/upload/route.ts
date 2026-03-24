import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_PAT ?? "";
const REPO_OWNER = "jhale0493";
const REPO_NAME = "golf-dashboard";
const BRANCH = "main";

async function githubApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...((opts.headers as Record<string, string>) ?? {}),
    },
  });
  return res;
}

async function getManifest(): Promise<{ sha: string; files: string[] }> {
  const res = await githubApi(`contents/public/data/manifest.json?ref=${BRANCH}`);
  if (!res.ok) return { sha: "", files: [] };
  const data = await res.json();
  const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
  return { sha: data.sha, files: content.files ?? [] };
}

async function commitFile(path: string, content: string, message: string) {
  const existing = await githubApi(`contents/${path}?ref=${BRANCH}`);
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: BRANCH,
  };
  if (existing.ok) {
    const data = await existing.json();
    body.sha = data.sha;
  }
  const res = await githubApi(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const { fileName, csvContent } = await request.json();
    if (!fileName || !csvContent) {
      return NextResponse.json({ error: "Missing fileName or csvContent" }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._\- +]/g, "_");
    const filePath = `public/data/${safeName}`;

    const csvOk = await commitFile(filePath, csvContent, `data: add ${safeName}`);
    if (!csvOk) {
      return NextResponse.json({ error: "Failed to commit CSV file" }, { status: 500 });
    }

    const manifest = await getManifest();
    if (!manifest.files.includes(safeName)) {
      manifest.files.push(safeName);
      const manifestContent = JSON.stringify({ files: manifest.files }, null, 2) + "\n";
      const manifestBody: Record<string, string> = {
        message: `data: update manifest with ${safeName}`,
        content: Buffer.from(manifestContent).toString("base64"),
        branch: BRANCH,
      };
      if (manifest.sha) manifestBody.sha = manifest.sha;
      await githubApi("contents/public/data/manifest.json", {
        method: "PUT",
        body: JSON.stringify(manifestBody),
      });
    }

    return NextResponse.json({ success: true, file: safeName });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

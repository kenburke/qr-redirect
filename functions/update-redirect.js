export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  const repo  = "your-org/your-repo";    // ← make absolutely sure this matches your GitHub repo
  const branch= "main";
  const filePath = context.env.BUILD_OUTPUT === "public"
                   ? "public/redirect.txt"
                   : "redirect.txt";

  let { newUrl } = await context.request.json();
  newUrl = newUrl.trim().replace(/^([^:]+)$/, 'https://$1');
  if (!/^https?:\/\//i.test(newUrl))
    return new Response("❌ Invalid URL after sanitization", { status: 400 });

  // fetch SHA
  const shaRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
    { headers:{ Authorization:`Bearer ${token}` } }
  );
  if (!shaRes.ok) {
    const err = await shaRes.text();
    return new Response(`❌ Failed to fetch SHA: ${err}`, { status: 500 });
  }
  const { sha } = await shaRes.json();

  // commit update
  const commitRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        message: "Update redirect via API",
        content: btoa(newUrl),
        sha,
        branch
      })
    }
  );
  const commitData = await commitRes.json();
  if (!commitRes.ok) {
    return new Response(`❌ GitHub commit failed: ${JSON.stringify(commitData)}`, { status: 500 });
  }

  // return the full commit response for debugging
  return new Response(JSON.stringify(commitData), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

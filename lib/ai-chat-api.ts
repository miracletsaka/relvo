const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function createThread(payload: any) {
  const res = await fetch(`${API_BASE}/ai-chat/threads`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to create thread");
  }

  return res.json();
}

export async function listThreads() {
  const res = await fetch(`${API_BASE}/ai-chat/threads`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to load threads");
  }

  return res.json();
}

export async function getMessages(threadId: string) {
  const res = await fetch(
    `${API_BASE}/ai-chat/threads/${threadId}/messages`,
    {
      credentials: "include",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to load messages");
  }

  return res.json();
}

export async function sendMessage(
  threadId: string,
  payload: any,
) {
  const res = await fetch(
    `${API_BASE}/ai-chat/threads/${threadId}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to send message");
  }

  return res.json();
}

export async function replyToThread(
  threadId: string,
  payload: any,
) {
  const res = await fetch(
    `${API_BASE}/ai-chat/threads/${threadId}/reply`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to get assistant reply");
  }

  return res.json();
}

export async function updateMessage(
  messageId: string,
  payload: any,
) {
  const res = await fetch(
    `${API_BASE}/ai-chat/messages/${messageId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to update message");
  }

  return res.json();
}

export async function updateThread(threadId: string, payload: any) {
  const res = await fetch(`${API_BASE}/ai-chat/threads/${threadId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to update thread");
  }

  return res.json();
}
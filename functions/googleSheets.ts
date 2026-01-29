import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

async function getGoogleSheetsAccessToken() {
  const hostname = Deno.env.get("REPLIT_CONNECTORS_HOSTNAME");
  const replIdentity = Deno.env.get("REPL_IDENTITY");
  const webReplRenewal = Deno.env.get("WEB_REPL_RENEWAL");
  
  const xReplitToken = replIdentity 
    ? 'repl ' + replIdentity 
    : webReplRenewal 
    ? 'depl ' + webReplRenewal 
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Google Sheets connector not configured");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-sheet`,
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error("Google Sheets not connected. Please set up the integration.");
  }
  
  return accessToken;
}

async function fetchSheetData(accessToken: string, spreadsheetId: string, range: string) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch spreadsheet data');
  }

  const data = await response.json();
  return data.values || [];
}

async function fetchSpreadsheetInfo(accessToken: string, spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch spreadsheet info');
  }

  const data = await response.json();
  return data.sheets?.map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    index: s.properties.index
  })) || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, spreadsheetId, sheetName } = body;

    const accessToken = await getGoogleSheetsAccessToken();

    if (action === "getSheets") {
      const sheets = await fetchSpreadsheetInfo(accessToken, spreadsheetId);
      return Response.json({ ok: true, sheets });
    }

    if (action === "getData") {
      const range = sheetName || "Sheet1";
      const data = await fetchSheetData(accessToken, spreadsheetId, range);
      return Response.json({ ok: true, data });
    }

    return Response.json({ ok: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Google Sheets function error:", error);
    return Response.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
});

# Builds "Mail history to Groundwork": a button-started Power Automate flow that
# pages through one Outlook folder over a date range (Graph, through the Office
# 365 Outlook connector's own "Send an HTTP request"), keeps the account mail by
# the same three lists the relays use, and sends each kept email to the relay
# address as a [GW-IN] or [GW-SENT] copy, one at a time.
import json, re, sys, os, shutil, zipfile, uuid

W, REPO, OUTZIP = sys.argv[1], sys.argv[2], sys.argv[3]
RELAY = "relay@gem.antaeus.app"
md = open(os.path.join(REPO, "docs/power-automate-account-filter-lists.md")).read()
blocks = re.findall(r"```\n(.*?)\n```", md, re.S)
A, B, C = [[x.strip().lower() for x in b.split(",") if x.strip()] for b in blocks[:3]]
q = lambda s: "'" + s.replace("'", "''") + "'"
LIMIT = 7000  # a Power Automate expression may run to 8,192 characters


def chunks(items, field):
    out, cur = [], []
    for it in items:
        cur.append(f"contains(item()?['{field}'],{q(it)})")
        if len("@or(" + ",".join(cur) + ")") > LIMIT:
            cur.pop(); out.append(cur); cur = [f"contains(item()?['{field}'],{q(it)})"]
    if cur: out.append(cur)
    return ["or(" + ",".join(c) + ")" if len(c) > 1 else c[0] for c in out]

dom = chunks(A, "who")
ppl = chunks(B, "who")
assert len(ppl) == 1, "colleague list grew past one expression"
names = chunks(C, "words")

inner = {}
prev = None
def add(name, action):
    global prev
    action["runAfter"] = {prev: ["Succeeded"]} if prev else {}
    inner[name] = action
    prev = name

add("Get_page", {"type": "OpenApiConnection", "inputs": {
    "host": {"apiId": "/providers/Microsoft.PowerApps/apis/shared_office365", "connectionName": "shared_office365", "operationId": "HttpRequest"},
    "parameters": {"Uri": "@variables('NextUrl')", "Method": "GET", "ContentType": "application/json"},
    "authentication": "@parameters('$authentication')"},
    "runtimeConfiguration": {"paginationPolicy": {}} if False else {}})
inner["Get_page"].pop("runtimeConfiguration")
inner["Get_page"]["retryPolicy"] = {"type": "exponential", "count": 6, "interval": "PT20S"}

# The live relay's own header format, so the duplicate check knows a copy the
# relay already delivered: bare addresses, joined by semicolons.
REC = lambda f: (
    "join(xpath(xml(json(concat('{\"r\":{\"a\":',string(coalesce(item()?['" + f + "'],json('[]'))),'}}'))),'//address/text()'),';')")
add("Select_page", {"type": "Select", "inputs": {
    "from": "@body('Get_page')?['value']",
    "select": {
        "who": "@toLower(concat(string(item()?['from']),';',string(item()?['toRecipients']),';',string(item()?['ccRecipients'])))",
        "words": "@toLower(concat(coalesce(item()?['subject'],''),' ',coalesce(item()?['body']?['content'],'')))",
        "subject": "@coalesce(item()?['subject'],'')",
        "fromLine": "@coalesce(item()?['from']?['emailAddress']?['address'],'')",
        "toLine": "@" + REC("toRecipients"),
        "ccLine": "@" + REC("ccRecipients"),
        "at": "@item()?['receivedDateTime']",
        "html": "@coalesce(item()?['body']?['content'],'')",
    }}})
# The relay's own copies (to the relay or the old Postmark address) never go again.
add("Not_relay_copies", {"type": "Query", "inputs": {"from": "@body('Select_page')",
    "where": "@and(not(startsWith(item()?['words'],'[gw-')),not(contains(item()?['who'],'gem.antaeus.app')),not(contains(item()?['who'],'postmarkapp.com')))"}})
picks = []
for i, e in enumerate(dom, 1):
    n = f"Account_domains_{i}"; picks.append(n)
    add(n, {"type": "Query", "inputs": {"from": "@body('Not_relay_copies')", "where": "@" + e}})
for i, e in enumerate(names, 1):
    n = f"Colleague_and_account_name_{i}"; picks.append(n)
    add(n, {"type": "Query", "inputs": {"from": "@body('Not_relay_copies')", "where": f"@and({ppl[0]},{e})"}})
add("Kept", {"type": "Compose", "inputs": "@union(" + ",".join(f"body('{p}')" for p in picks) + ")"})
add("Count_read", {"type": "IncrementVariable", "inputs": {"name": "Read", "value": "@length(coalesce(body('Get_page')?['value'],json('[]')))"}})
# Where to start again if this page fails: the day of its first email.
add("Resume_day", {"type": "SetVariable", "inputs": {"name": "Resume", "value": "@{coalesce(first(coalesce(body('Get_page')?['value'],json('[]')))?['receivedDateTime'],RESUME_FALLBACK)}"}})
BODY = ("<p class=\"editor-paragraph\">From: @{items('For_each_kept_email')?['fromLine']}<br>Sent: @{items('For_each_kept_email')?['at']}<br>"
        "To: @{items('For_each_kept_email')?['toLine']}<br>Cc: @{items('For_each_kept_email')?['ccLine']}<br>"
        "Subject: @{items('For_each_kept_email')?['subject']}</p><br><p class=\"editor-paragraph\">@{items('For_each_kept_email')?['html']}</p>")
add("For_each_kept_email", {"type": "Foreach", "foreach": "@outputs('Kept')",
    "runtimeConfiguration": {"concurrency": {"repetitions": 1}},
    "actions": {
        "Send_to_GEM": {"runAfter": {}, "type": "OpenApiConnection",
            "retryPolicy": {"type": "exponential", "count": 4, "interval": "PT30S"},
            "inputs": {"host": {"apiId": "/providers/Microsoft.PowerApps/apis/shared_office365", "connectionName": "shared_office365", "operationId": "SendEmailV2"},
                "parameters": {"emailMessage/To": RELAY,
                    "emailMessage/Subject": "@{variables('Tag')} @{items('For_each_kept_email')?['subject']}",
                    "emailMessage/Body": BODY, "emailMessage/Importance": "Normal"},
                "authentication": "@parameters('$authentication')"}},
        "Count_one_sent": {"runAfter": {"Send_to_GEM": ["Succeeded"]}, "type": "IncrementVariable",
            "inputs": {"name": "Sent", "value": 1}},
        "Stop_after_this_page": {"runAfter": {"Send_to_GEM": ["Failed", "TimedOut"]}, "type": "SetVariable",
            "inputs": {"name": "Stopped", "value": "A send to GEM failed."}},
        # Exchange takes about 30 sends a minute from one mailbox; one every few
        # seconds stays well inside it.
        "Pause": {"runAfter": {"Send_to_GEM": ["Succeeded", "Failed", "Skipped", "TimedOut"]}, "type": "Wait",
            "inputs": {"interval": {"count": 3, "unit": "Second"}}},
    }})
add("Next_page", {"type": "SetVariable", "inputs": {"name": "NextUrl", "value": "@{coalesce(body('Get_page')?['@odata.nextLink'],'')}"}})
# A page whose sends all went moves on; a failed send stops the loop after the
# page instead (Stopped), so nothing past an undelivered email is skipped.
inner["Next_page"]["runAfter"] = {"For_each_kept_email": ["Succeeded", "Failed"]}
# A page that could not be read stops the loop; it never counts as the end.
inner["Stop_on_unread_page"] = {"runAfter": {"Get_page": ["Failed", "TimedOut"]}, "type": "SetVariable",
    "inputs": {"name": "Stopped", "value": "A page of mail could not be read."}}

TB = "triggerBody()?"
CHI = lambda k: f"convertToUtc(concat(trim({TB}['{k}']),'T00:00:00'),'Central Standard Time','yyyy-MM-ddTHH:mm:ssZ')"
FILTER = f"concat('receivedDateTime ge ',{CHI('text')},' and receivedDateTime lt ',{CHI('text_1')})"
URL = ("@concat('https://graph.microsoft.com/v1.0/me/mailFolders/',variables('Folder'),'/messages?$filter=',"
       f"encodeUriComponent({FILTER}),"
       "'&$orderby=receivedDateTime%20asc&$top=50&$select=subject,from,toRecipients,ccRecipients,receivedDateTime,body')")
top = {}
prev = None
def tadd(name, action):
    global prev
    action["runAfter"] = {prev: ["Succeeded"]} if prev else {}
    top[name] = action; prev = name
var = lambda n, t, v: {"type": "InitializeVariable", "inputs": {"variables": [{"name": n, "type": t, "value": v}]}}
tadd("Folder", var("Folder", "string", f"@if(startsWith(toLower(trim({TB}['text_2'])),'sent'),'sentitems','inbox')"))
tadd("Tag", var("Tag", "string", "@if(equals(variables('Folder'),'sentitems'),'[GW-SENT]','[GW-IN]')"))
tadd("NextUrl", var("NextUrl", "string", URL))
tadd("Read", var("Read", "integer", 0))
tadd("Sent", var("Sent", "integer", 0))
tadd("Stopped", var("Stopped", "string", ""))
tadd("Resume", var("Resume", "string", "@" + CHI("text")))
# Power Automate refuses a SetVariable that reads its own variable, so an empty
# page falls back to the first day's Chicago midnight, not to Resume itself.
inner["Resume_day"]["inputs"]["value"] = inner["Resume_day"]["inputs"]["value"].replace("RESUME_FALLBACK", CHI("text"))
tadd("Until_every_page_is_read", {"type": "Until", "expression": "@or(equals(variables('NextUrl'),''),not(equals(variables('Stopped'),'')))",
    "limit": {"count": 5000, "timeout": "P7D"}, "actions": inner})
tadd("Summary", {"type": "Compose", "inputs": "@concat('Read ',string(variables('Read')),' emails in ',variables('Folder'),'. Sent ',string(variables('Sent')),' to GEM.')"})
# The loop reads as Failed when a step inside it failed; the summary and the
# stop check run either way.
top["Summary"]["runAfter"] = {"Until_every_page_is_read": ["Succeeded", "Failed", "TimedOut"]}
# A stopped crawl ends the run as Failed and says where to start again;
# a rerun from that day files nothing twice.
tadd("If_it_stopped", {"type": "If", "expression": {"and": [{"not": {"equals": ["@variables('Stopped')", ""]}}]},
    "actions": {"Fail_the_run": {"runAfter": {}, "type": "Terminate", "inputs": {"runStatus": "Failed",
        "runError": {"code": "Stopped", "message": "@{variables('Stopped')} Run again with First day @{convertFromUtc(variables('Resume'),'Central Standard Time','yyyy-MM-dd')} and the same Stop before day."}}}},
    "else": {"actions": {}}})

trigger = {"manual": {"type": "Request", "kind": "Button", "inputs": {"schema": {"type": "object", "properties": {
    "text": {"title": "First day", "type": "string", "x-ms-dynamically-added": True, "description": "Year-month-day, like 2026-06-15", "x-ms-content-hint": "TEXT"},
    "text_1": {"title": "Stop before this day", "type": "string", "x-ms-dynamically-added": True, "description": "Year-month-day. The day after the last day you want, like 2026-11-20", "x-ms-content-hint": "TEXT"},
    "text_2": {"title": "Folder", "type": "string", "x-ms-dynamically-added": True, "description": "inbox or sent", "x-ms-content-hint": "TEXT"}},
    "required": ["text", "text_1", "text_2"]}}}}

# ── the package: cloned from the Inbox relay's export, as a new flow ──────
src = os.path.join(W, "in", "Inbox")
dst = os.path.join(W, "build", "History")
shutil.rmtree(dst, ignore_errors=True); shutil.copytree(src, dst)
flows = os.path.join(dst, "Microsoft.Flow", "flows")
old = [d for d in os.listdir(flows) if os.path.isdir(os.path.join(flows, d))][0]
new = str(uuid.uuid5(uuid.NAMESPACE_URL, "gem-mail-history-to-groundwork"))
os.rename(os.path.join(flows, old), os.path.join(flows, new))
fm = json.load(open(os.path.join(flows, "manifest.json"))); fm["flowAssets"]["assetPaths"] = [new]
json.dump(fm, open(os.path.join(flows, "manifest.json"), "w"))
f = os.path.join(flows, new, "definition.json")
j = json.load(open(f))
fid = str(uuid.uuid5(uuid.NAMESPACE_URL, "gem-mail-history-flow-id"))
j["name"] = fid; j["id"] = f"/providers/Microsoft.Flow/flows/{fid}"
p = j["properties"]; p["displayName"] = "Mail history to Groundwork"
d = p["definition"]; d["triggers"] = trigger; d["actions"] = top
d["metadata"] = {k: v for k, v in (d.get("metadata") or {}).items() if k in ("creator", "provisioningMethod")}
json.dump(j, open(f, "w"))
m = json.load(open(os.path.join(dst, "manifest.json")))
m["details"]["displayName"] = "Mail history to Groundwork"
res = m["resources"]
res[new] = res.pop(old)
res[new]["details"]["displayName"] = "Mail history to Groundwork"
res[new]["suggestedCreationType"] = "New"
json.dump(m, open(os.path.join(dst, "manifest.json"), "w"))
with zipfile.ZipFile(OUTZIP, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(dst):
        for fl in files:
            pth = os.path.join(root, fl); zf.write(pth, os.path.relpath(pth, dst))
print("wrote", OUTZIP, "| domain filters", len(dom), "| name filters", len(names),
      "| longest expression", max(len(x) for x in dom + names + [f"and({ppl[0]},{n})" for n in names]))

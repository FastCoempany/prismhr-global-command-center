import json, re, sys, glob, os, shutil, zipfile, copy
W, REPO = sys.argv[1], sys.argv[2]
md = open(os.path.join(REPO, 'docs/power-automate-account-filter-lists.md')).read()
blocks = re.findall(r'```\n(.*?)\n```', md, re.S)
A, B, C = [b.strip() for b in blocks[:3]]
# A string that starts with "@" is read by Power Automate as an expression, so the
# personal addresses (which start with a letter) go first.
a = A.split(',')
A = ','.join([x for x in a if not x.startswith('@')] + [x for x in a if x.startswith('@')])
for s in (A, B, C):
    assert not s.startswith('@') and not s.endswith(',') and ',,' not in s

def lists(after):
    return {
        "Account_Domains": {"runAfter": after, "type": "Compose", "inputs": A},
        "Our_People": {"runAfter": {"Account_Domains": ["Succeeded"]}, "type": "Compose", "inputs": B},
        "Account_Names": {"runAfter": {"Our_People": ["Succeeded"]}, "type": "Compose", "inputs": C},
    }

def hits(who, words, first_after):
    def q(name, src, text, after):
        return {name: {"runAfter": after, "type": "Query", "inputs": {
            "from": f"@split(outputs('{src}'),',')",
            # An empty entry never matches, so a stray comma can't let everything through.
            "where": f"@and(not(equals(trim(item()),'')),contains({text},toLower(trim(item()))))"}}}
    out = {}
    out.update(q("Account_Hits", "Account_Domains", who, first_after))
    out.update(q("People_Hits", "Our_People", who, {"Account_Hits": ["Succeeded"]}))
    out.update(q("Name_Hits", "Account_Names", words, {"People_Hits": ["Succeeded"]}))
    return out

TIED = {"or": [
    {"greater": ["@length(body('Account_Hits'))", 0]},
    {"and": [{"greater": ["@length(body('People_Hits'))", 0]},
             {"greater": ["@length(body('Name_Hits'))", 0]}]}]}
T = "triggerOutputs()?"
WHO_MAIL = f"toLower(concat(coalesce({T}['body/from'],''),';',coalesce({T}['body/toRecipients'],''),';',coalesce({T}['body/ccRecipients'],'')))"
WORDS_MAIL = f"toLower(concat(coalesce({T}['body/subject'],''),' ',coalesce({T}['body/body'],'')))"
I = "items('For_each')?"
WHO_CAL = f"toLower(concat(string({I}['organizer']),';',string({I}['requiredAttendees']),';',string({I}['optionalAttendees'])))"
WORDS_CAL = f"toLower(string({I}['subject']))"

def edit(name, fn):
    src = os.path.join(W, 'in', name); dst = os.path.join(W, 'build', name)
    shutil.rmtree(dst, ignore_errors=True); shutil.copytree(src, dst)
    f = glob.glob(dst + '/Microsoft.Flow/flows/*/definition.json')[0]
    j = json.load(open(f)); d = j['properties']['definition']
    fn(d)
    if len(sys.argv) > 3:
        raw = json.dumps(d).replace(os.environ['OLD_RELAY_ADDRESS'], sys.argv[3])
        d.clear(); d.update(json.loads(raw))
    json.dump(j, open(f, 'w'))
    z = os.path.join(W, 'out', f'{name}copytoGroundwork_filtered.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(dst):
            for fl in files:
                p = os.path.join(root, fl); zf.write(p, os.path.relpath(p, dst))
    print('wrote', z)

def sent(d):
    acts = d['actions']; cond = acts.pop('Condition')
    new = lists({}); new.update(hits(WHO_MAIL, WORDS_MAIL, {"Account_Names": ["Succeeded"]}))
    cond['runAfter'] = {"Name_Hits": ["Succeeded"]}
    cond['expression'] = {"and": cond['expression']['and'] + [TIED]}
    new['Condition'] = cond; d['actions'] = new

def inbox(d):
    send = d['actions'].pop('Send_an_email_(V2)'); send['runAfter'] = {}
    new = lists({}); new.update(hits(WHO_MAIL, WORDS_MAIL, {"Account_Names": ["Succeeded"]}))
    new['Condition'] = {"runAfter": {"Name_Hits": ["Succeeded"]}, "type": "If",
        "expression": {"and": [TIED]}, "actions": {"Send_an_email_(V2)": send}, "else": {"actions": {}}}
    d['actions'] = new

def calendar(d):
    acts = d['actions']
    # Chicago's own zone; "Central America Standard Time" never moves for daylight saving.
    for k in ('recurrence', 'evaluatedRecurrence'):
        if k in d['triggers']['Recurrence']: d['triggers']['Recurrence'][k]['timeZone'] = 'Central Standard Time'
    loop = acts['For_each']; send = loop['actions'].pop('Send_an_email_(V2)'); send['runAfter'] = {}
    acts.update(lists({"Get_calendar_view_of_events_(V3)": ["Succeeded"]}))
    loop['runAfter'] = {"Account_Names": ["Succeeded"]}
    inner = hits(WHO_CAL, WORDS_CAL, {})
    inner['Condition'] = {"runAfter": {"Name_Hits": ["Succeeded"]}, "type": "If",
        "expression": {"and": [TIED]}, "actions": {"Send_an_email_(V2)": send}, "else": {"actions": {}}}
    loop['actions'] = inner

edit('Sent', sent); edit('Inbox', inbox); edit('Calendar', calendar)

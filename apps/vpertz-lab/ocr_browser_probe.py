import base64
import json
import os
import sys
import time
import urllib.request

import websocket


def targets():
    with urllib.request.urlopen("http://127.0.0.1:9224/json", timeout=3) as response:
        return json.load(response)


page = next(target for target in targets() if target.get("type") == "page" and "/vplab/" in target.get("url", ""))
ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180, origin="http://127.0.0.1:9224")
request_id = 0
events = []


def command(method, params=None):
    global request_id
    request_id += 1
    current = request_id
    ws.send(json.dumps({"id": current, "method": method, "params": params or {}}))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == current:
            return message
        events.append(message)


command("Runtime.enable")
command("Log.enable")
command("Page.reload", {"ignoreCache": True})
time.sleep(.5)
for _ in range(60):
    ready = command("Runtime.evaluate", {"expression": "Boolean(window.IvScan && window.Tesseract && document.readyState === 'complete' && typeof scanIvImage === 'function')"})
    if ready.get("result", {}).get("result", {}).get("value"):
        break
    time.sleep(.2)
else:
    diagnostic = command("Runtime.evaluate", {"expression": "JSON.stringify({ready:document.readyState, scan:typeof scanIvImage, iv:typeof IvScan, tess:typeof Tesseract})", "returnByValue": True})
    raise RuntimeError(diagnostic)

for filename in sys.argv[1:]:
    with open(filename, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("ascii")
    action = """
      const paste = new Event('paste', {bubbles:true, cancelable:true});
      Object.defineProperty(paste, 'clipboardData', {value:{items:[{type:file.type, getAsFile:()=>file}]}});
      document.dispatchEvent(paste);
      const prevented = paste.defaultPrevented;
      await ivScanChain;
      return {
        layout:'ui', fields:{
          pokemon:document.querySelector('#iv-species-search').value,
          level:document.querySelector('#x-level').value,
          quality:document.querySelector('#x-qual').value,
          power:document.querySelector('#x-power').value,
          total:document.querySelector('#x-ivtotal').value,
          stats:[0,1,2,3,4,5].map(i => document.querySelector('#o'+i).value)
        },
        preview:Boolean(document.querySelector('#iv-preview').src),
        prevented,
        status:document.querySelector('#iv-scan-status').textContent.trim()
      };
    """ if os.environ.get("OCR_UI") else "return await IvScan.readCard(file, {paths});"
    expression = """(async () => {
      const response = await fetch('data:image/png;base64,%s');
      const file = new File([await response.blob()], %s, {type:'image/png'});
      const paths = {
        workerPath: new URL('/vplab/vendor/worker.min.js', location.href).href,
        corePath: new URL('/vplab/vendor/tesseract-core', location.href).href,
        langPath: new URL('/vplab/vendor/lang-data', location.href).href
      };
      %s
    })()""" % (encoded, json.dumps(filename.split("\\")[-1]), action)
    response = command("Runtime.evaluate", {"expression": expression, "awaitPromise": True, "returnByValue": True})
    remote = response.get("result", {}).get("result", {})
    if "value" in remote:
        value = remote["value"]
        summary = {"file": filename, "layout": value.get("layout"), "fields": value.get("fields"), "sources": value.get("sources"), "preview": value.get("preview"), "prevented": value.get("prevented"), "status": value.get("status")}
        if os.environ.get("OCR_DEBUG"):
            summary["ivDebug"] = [item for item in value.get("debug", []) if item.get("region") in {"iv", "ivWide", "card"}]
            summary["regions"] = value.get("regions")
        if os.environ.get("OCR_UI") and not value.get("prevented"):
            summary["browserEvents"] = events
        print(json.dumps(summary, ensure_ascii=True))
    else:
        print(json.dumps({"file": filename, "error": response}, ensure_ascii=True))

ws.close()

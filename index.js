import { Router } from 'itty-router'
import { getAssetFromKV } from "@cloudflare/kv-asset-handler"

// Create a new router
const router = Router()

/*
Our index route, a simple hello world.
*/
router.get("/", () => {return new Response('fghgf')} )

router.get("/get-current-hook", async () => {
  var wurl = await DENTIST_TELEGRAM_BOT.get('webhook_url');
  wurl = wurl === null ? 'no_setup' : wurl;
  return new Response(wurl)
})

router.get("/getbtns", () => {
  // Decode text like "Hello%20world" into "Hello world"
  let input = DENTIST_TELEGRAM_BOT.get('btns')

  // Return the HTML with the string to the client
  return new Response(input, {
    headers: {
      "Content-Type": "application/json"
    }
  })
})

router.post("/getbtns", async request => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  let btns = DENTIST_TELEGRAM_BOT.get('btns', {'type': 'json'})
  //btns = concat arrs

  return new Response(input, {
    headers: {
      "Content-Type": "application/json"
    }
  })
})

router.post("/secreat_chat_patht", async request => {
  var fields = await request.json()
  if ( fields.message == undefined) {
    return new Response();
  }

  var ff = await DENTIST_TELEGRAM_BOT.get('updates', {'type': 'json'}) || [];
  ff.push(fields);
  DENTIST_TELEGRAM_BOT.put('updates', JSON.stringify(ff));

  //return new Response(fields)
  var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'}) || [];
  if (chat_ids.indexOf(fields.message.chat.id) == -1) {
    chat_ids.push(fields.message.chat.id);
  }
  DENTIST_TELEGRAM_BOT.put('chat_ids', JSON.stringify(chat_ids));
  return new Response();
})

router.get("/setup-bot", async () => {
  var url = 'https://api.telegram.org/bot' + BOT_KEY + '/setWebhook';
  const req = {
    body: encodeURIComponent('url') + '=' + encodeURIComponent(BASE_URL + '/secreat_chat_patht'),
    method: "POST",
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  };
  var res = await fetch(url, req);
  var webhook_url = BASE_URL + '/secreat_chat_patht';
  DENTIST_TELEGRAM_BOT.put('webhook_url', webhook_url);
  return new Response('webhook setup was successful');
})

/*
This route demonstrates path parameters, allowing you to extract fragments from the request
URL.

Try visit /example/hello and see the response.
*/
router.get("/example/:text", ({ params }) => {
  // Decode text like "Hello%20world" into "Hello world"
  let input = decodeURIComponent(params.text)

  // Construct a buffer from our input
  let buffer = Buffer.from(input, "utf8")

  // Serialise the buffer into a base64 string
  let base64 = buffer.toString("base64")

  // Return the HTML with the string to the client
  return new Response(`<p>Base64 encoding: <code>${base64}</code></p>`, {
    headers: {
      "Content-Type": "text/html"
    }
  })
})

router.post("/msg", async request => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  var msg = body.msg;
  var url = 'https://api.telegram.org/bot' + BOT_KEY + '/sendMessage';
  var chat_ids = DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'});
  for (let i = 0; i < chat_ids.length; i++) {
    const chat_id = chat_ids[i];
    const req = {
      body: encodeURIComponent('chat_id') + '=' + encodeURIComponent(chat_id) + '&' +  encodeURIComponent('text') + '=' + encodeURIComponent(msg),
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    };
    var res = await fetch(url, req);
  }
  
  return new Response('Msg sent to all chats', {
    headers: {
      "Content-Type": "Content-Type: text/plain; charset=UTF-8"
    }
  })
})

router.post("/post", async request => {
  // Create a base object with some fields.
  let fields = {
    "asn": request.cf.asn,
    "colo": request.cf.colo
  }

  // If the POST data is JSON then attach it to our response.
  if (request.headers.get("Content-Type") === "application/json") {
    fields["json"] = await request.json()
  }

  // Serialise the JSON to a string.
  const returnData = JSON.stringify(fields, null, 2);

  return new Response(returnData, {
    headers: {
      "Content-Type": "application/json"
    }
  })
})

router.get("*", handleEvent)

async function handleEvent(req, event) {
  try {
    //console.DEBUG(getAssetFromKV(event))
    return await getAssetFromKV(event)
  } catch (e) {
    let pathname = new URL(event.request.url).pathname
    return new Response(`"${pathname}" not found`, {
      status: 404,
      statusText: "not found",
    })
  }
}

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', (e) => {
  e.respondWith(router.handle(e.request, e))
})
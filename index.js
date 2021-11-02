import { Router } from 'itty-router'
import { getAssetFromKV } from "@cloudflare/kv-asset-handler"

// Create a new router
const router = Router()

/*
Our index route, a simple hello world.
*/
router.get("/", request => {
  const base = BASE_URL + "/index.html";
  const statusCode = 301;
  const destinationURL = base;
  return Response.redirect(destinationURL, statusCode);
} )

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
  var ff = await DENTIST_TELEGRAM_BOT.get('updates', {'type': 'json'}) || [];
  ff.push(fields);
  await DENTIST_TELEGRAM_BOT.put('updates', JSON.stringify(ff));
  
  if ( !fields.hasOwnProperty('message')) {
    return new Response();
  } else {
    switch(fields['message']['text']) {
      case '/start':
        var ff = await DENTIST_TELEGRAM_BOT.get('statrts', {'type': 'json'}) || [];
        ff.push(fields.message);
        await DENTIST_TELEGRAM_BOT.put('statrts', JSON.stringify(ff));

        var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'}) || [];
        if (chat_ids.indexOf(fields.message.chat.id) == -1) {
          chat_ids.push(fields.message.chat.id);
        }
        await DENTIST_TELEGRAM_BOT.put('chat_ids', JSON.stringify(chat_ids));
        sendMsg(OPT_IN_MSG);
        return new Response();
        break;
      case '/stop':
          var ff = await DENTIST_TELEGRAM_BOT.get('stops', {'type': 'json'}) || [];
          ff.push(fields.message);
          await DENTIST_TELEGRAM_BOT.put('stops', JSON.stringify(ff));

          var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'}) || [];
          delete chat_ids[chat_ids.indexOf(fields.message.chat.id)];
          await DENTIST_TELEGRAM_BOT.put('chat_ids', JSON.stringify(chat_ids));
          sendMsg(OPT_OUT_MSG);
          return new Response();
        break;
    }
  }
  
  //return new Response(fields)
  
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
  await DENTIST_TELEGRAM_BOT.put('webhook_url', webhook_url);
  var dd = await DENTIST_TELEGRAM_BOT.get('webhook_url');
  return new Response(dd);
})

router.post("/msg", async request => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  var msg = body.msg;
  var dd = await sendMsg(msg);
  return new Response(JSON.stringify(dd), {
    headers: {
      "Content-Type": "Content-Type: application/json; charset=UTF-8"
    }
  })
})

async function sendMsg (txt) {
  
  var url = 'https://api.telegram.org/bot' + BOT_KEY + '/sendMessage';
  var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'});
  var dd = [];
  for (let i = 0; i < chat_ids.length; i++) {
    const chat_id = chat_ids[i];
    const req = {
      body: encodeURIComponent('chat_id') + '=' + encodeURIComponent(chat_id) + '&' +  encodeURIComponent('text') + '=' + encodeURIComponent(txt),
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    };
    var res = await fetch(url, req);
    dd.push(res);
  }
  return dd;
}

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
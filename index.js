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

router.get("/getbtns", async () => {
  let input = await __STATIC_CONTENT.list({"prefix": "photos/"})
  for (let u = 0; u < input.length; u++) {
    input[u] = input[u]['name'];
  }
  // Return the HTML with the string to the client
  return new Response(JSON.stringify(input), {
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
    return new Response('ok');
  } else {
    switch(fields['message']['text']) {
      case 'start':
        var ff = await DENTIST_TELEGRAM_BOT.get('statrts', {'type': 'json'}) || [];
        ff.push(fields.message);
        await DENTIST_TELEGRAM_BOT.put('statrts', JSON.stringify(ff));
        try {
        var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'}) || [];
        if (chat_ids.indexOf(fields.message.chat.id) == -1) {
          chat_ids.push(fields.message.chat.id);
        }
        await DENTIST_TELEGRAM_BOT.put('chat_ids', JSON.stringify(chat_ids));
        await sendMsg(OPT_IN_MSG, false, [fields.message.chat.id]);
        return new Response();
        } catch (e) {
          return new Response(JSON.stringify(e));
        }
      case '/stop':
          //var ff = await DENTIST_TELEGRAM_BOT.get('stops', {'type': 'json'}) || [];
          //ff.push(fields.message);
          //await DENTIST_TELEGRAM_BOT.put('stops', JSON.stringify(ff));
          try {
          await sendMsg(OPT_OUT_MSG, false, [fields.message.chat.id]);
          
          var chat_ids = await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'}) || [];
          chat_ids.splice(chat_ids.indexOf(fields.message.chat.id), 1);
          await DENTIST_TELEGRAM_BOT.put('chat_ids', JSON.stringify(chat_ids));
          return new Response();
        } catch (e) {
          return new Response(JSON.stringify(e));
        }
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
  var msg = BASE_URL + '/assets/' + body.msg;
  var dd = await sendMsg(msg, true);
  return new Response(JSON.stringify(dd), {
    headers: {
      "Content-Type": "Content-Type: application/json; charset=UTF-8"
    }
  })
})

async function sendMsg (txt, photo = false, ids) {
  
  var url = 'https://api.telegram.org/bot' + BOT_KEY;
  url = photo ? url + '/sendPhoto' : url + '/sendMessage';
  var chat_ids = ids || await DENTIST_TELEGRAM_BOT.get('chat_ids', {'type': 'json'});
  var dd = [];
  for (let i = 0; i < chat_ids.length; i++) {
    const chat_id = chat_ids[i];
    var data_to_send_param = photo ? encodeURIComponent('photo') : encodeURIComponent('text');
    const req = {
      body: encodeURIComponent('chat_id') + '=' + encodeURIComponent(chat_id) + '&' + data_to_send_param + '=' + encodeURIComponent(txt),
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
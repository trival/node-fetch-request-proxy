# node http fetch proxy

Inside a standard nodejs http handler like this

```js
function handler(request, result) {
  // ...
}
```

you want to forward the request to another url, and then stream the result back
using the nodejs result. You want to use the new and shiny `fetch`, because it
is now included in nodejs by default, and your longtime favorite node library
`request` is deprecated.

With good old `request` you could just do the following:

```js
function handler(req, res) {
  const newUrl = 'https://the-url-you-want-to-send-your-requests-to.com'

  function onError(e) {
    console.error('something bad happended', e)
    res.statusCode = 500
    res.end()
  }

  // prettier-ignore
  req
    .pipe(request(newUrl))
    .on('error', onError)
    .pipe(res)
    .on('error', onError)
}
```

With this library you get some helpers that assist you to achieve the same using
`fetch`:

```js
import {
  forwardFetchResult,
  forwardRequestHeadersToFetch,
  makeErrorHandler,
} from 'node-fetch-request-proxy'

async function handler(request, result) {
  const newUrl = 'https://the-url-you-want-to-send-your-requests-to.com'

  const headers = new Headers()
  // you can add your own custom headers here as well

  // this forwards relevant headers of the request to your new destination
  // ommitting some headers that can cause problems when forwarded
  forwardRequestHeadersToFetch(request, headers)

  // this creates an error handler that logs the error and closes
  // the result stream with a given error message and status code.
  // use your own if you like.
  const onError = makeErrorHandler(result, 'something bad happened', 500)

  try {
    // make your fetch request as usual
    const fetchResult = await fetch(newUrl, {
      method: request.method,
      headers,
      // add more configuration as you see fit...
    })

    // then stream the body of the fetchResult to your node http result
    return forwardFetchResult(fetchResult, result, onError)
  } catch (e) {
    return onError(e)
  }
}
```

A little more verbose, but hey, it's fetch :)

Requires `nodejs >= 18.0.0` because this is when `fetch` became natively
available.

This library is published as ESM only. With commonjs, use this code:

```js
const makeProxyHelpers = () => import('node-fetch-request-proxy')

async function handler(request, result) {
  const { forwardFetchResult, forwardRequestHeadersToFetch, makeErrorHandler } =
    await makeProxyHelpers()

  // proceed as before ...
}
```

Look at the source code, if you want to implement the details yourself, it is
roughly 90 lines of sparsely commented code.

## License

MIT, see the LICENSE file in the repository.

Copyright (c) 2022 Thomas Gorny

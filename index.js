import { Readable } from 'node:stream'
import { ServerResponse, IncomingMessage } from 'node:http'

// see https://fetch.spec.whatwg.org/#forbidden-header-name
export const requestHeadersBlocklist = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'content-encoding',
	// 'cookie', // we want to forward cookies
	// 'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	// 'origin', // we want to forward origin
	// 'referer', // we want to forward referer
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	// 'user-agent', // we want to forward user-agent
	'via',
]

/**
 * Makes an error handler that logs the error and ends the response with given error code
 * @param {ServerResponse} res the nodejs server response object
 * @param {string} msg error message to log. Defaults to "Request streaming error"
 * @param {number} statusCode status code to send. Defaults to 500
 * @returns {function(*): void}
 */
export function makeErrorHandler(
	res,
	msg = 'Request streaming error:',
	statusCode = 500,
) {
	return function (e) {
		console.error(msg, e)
		res.statusCode = statusCode
		res.end()
	}
}

/**
 * Adds all relevant request headers to the fetch request
 * @param {IncomingMessage} req the nodejs client request object
 * @param {Headers} fetchHeaders the headers object for the fetch request
 * @param {string[]} headersBlocklist the headers to block from being forwarded
 */
export function forwardRequestHeadersToFetch(
	req,
	fetchHeaders,
	headersBlocklist = requestHeadersBlocklist,
) {
	for (const [key, value] of Object.entries(req.headers)) {
		if (headersBlocklist.includes(key)) {
			// eslint-disable-next-line no-continue
			continue
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				fetchHeaders.append(key, item)
			}
		} else if (value != null) {
			fetchHeaders.append(key, String(value))
		}
	}
}

/**
 * Forwards the fetch response body to the nodejs response by piping the streams
 * @param {Response} fetchResult the fetch response object to forward
 * @param {ServerResponse} res the nodejs server response object
 * @param {(err: any) => void} onError the error handler
 */
export function forwardFetchResult(fetchResult, res, onError) {
	if (!fetchResult.ok) {
		console.error(`Request failed: ${fetchResult.statusText}`)
		res.statusCode = fetchResult.status
		res.end()
		return
	}

	fetchResult.headers.forEach((value, key) => {
		if (requestHeadersBlocklist.includes(key)) {
			return
		}
		res.setHeader(key, value)
	})

	try {
		if (fetchResult.body) {
			Readable.fromWeb(fetchResult.body).pipe(res).on('error', onError)
		} else {
			res.end()
		}
	} catch (e) {
		return onError(e)
	}
}

import { Readable } from 'stream'
import { ServerResponse, ClientRequest } from 'http'

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

export const makeErrorHandler =
	(res, msg = 'Request streaming error:', statusCode = 500) =>
	(e) => {
		console.error(msg, e)
		res.statusCode = statusCode
		res.end()
	}

export function forwardRequestHeadersToFetch(
	/** @type {ClientRequest} */ req,
	/** @type {Headers} */ fetchHeaders,
	headersBlocklist = requestHeadersBlocklist,
) {
	for (const [key, value] of Object.entries(req.getHeaders())) {
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
 * @param {Response} fetchResult
 * @param {ServerResponse} res
 * @param {(err: any) => void} onError
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
		return
	} catch (e) {
		return onError(e)
	}
}

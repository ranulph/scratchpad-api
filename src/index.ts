

export interface Env {
	SCRATCHPAD_DO: DurableObjectNamespace;
	IDENTITY_BEARERAUTH: Fetcher;
}

const corsHeaders = {
	'Access-Control-Allow-Headers': '*', 
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Origin': 'https://scratchpad.run', 
};

export class SCRATCHPAD_DO {

	state: DurableObjectState;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
	}

	async fetch(request: Request, env: Env) {

		if (request.method === 'OPTIONS') {
			return new Response(JSON.stringify({ ok: true }), {
				headers: {
					...corsHeaders
				}
			});
		}

		if (request.method === 'GET') {
			let textarea: string = await this.state.storage?.get("textarea") || '';
			let requestBody = { textarea: textarea };
		
			return new Response(JSON.stringify(requestBody), {
				headers: {
					'Content-type': 'application/json',
					...corsHeaders
				  }
			});
		}

		if (request.method === 'POST') {
			const requestBody: { textarea: string } = await request.json();
			let textarea = requestBody.textarea;

			await this.state.storage?.put("textarea", textarea);
		
			return new Response(JSON.stringify({ ok: true }), {
				headers: {
					'Content-type': 'application/json',
					...corsHeaders
				  }
			});
		}
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {

		if (request.method === 'OPTIONS') {
			return new Response(JSON.stringify({ ok: true }), {
				headers: {
					...corsHeaders
				}
			});
		}

		const authResponse = await env.IDENTITY_BEARERAUTH.fetch(request.clone())

		if (authResponse.status === 200) {
			const userId = authResponse.headers.get('userId')
			if (!userId) {
				return new Response(JSON.stringify({ error: 'Unknown User' }), {
					status: 404,
					...corsHeaders
				});
			}
			const id = env.SCRATCHPAD_DO.idFromName(userId);
			const stub = env.SCRATCHPAD_DO.get(id);
			
			const response = await stub.fetch(request);
			
			return response;
		} 
		
		return authResponse;
	}
}

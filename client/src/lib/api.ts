export async function apiFetch(input: string, init: RequestInit = {}) {
	const token = localStorage.getItem('token')
	const headers = new Headers(init.headers || {})
	if (token) headers.set('Authorization', `Bearer ${token}`)
	if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
		// пусть вызывающий сам ставит JSON при необходимости
	}
	const res = await fetch(input, { ...init, headers })
	if (res.status === 401) {
		throw Object.assign(new Error('Unauthorized'), { status: 401 })
	}
	return res
}

export function requireAuthOrRedirect(navigate: (path: string)=>void) {
	const token = localStorage.getItem('token')
	if (!token) {
		navigate('/login')
		return false
	}
	return true
}

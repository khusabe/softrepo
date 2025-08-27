import React, { useState } from 'react'

export default function Login() {
	const [login, setLogin] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }) })
		if (!res.ok) return setError('Неверные данные')
		const data = await res.json()
		localStorage.setItem('token', data.token)
		location.href = '/admin'
	}

	return (
		<div className="container py-5" style={{maxWidth: 420}}>
			<h1 className="mb-4">Вход</h1>
			<form onSubmit={submit} className="vstack gap-3">
				<input className="form-control" placeholder="Логин" value={login} onChange={e=>setLogin(e.target.value)} />
				<input className="form-control" placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				{error && <div className="text-danger small">{error}</div>}
				<button className="btn btn-primary" type="submit">Войти</button>
			</form>
		</div>
	)
}

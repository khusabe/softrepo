import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function human(n: number) {
	if (!isFinite(n)) return '—'
	return n.toFixed(1)
}

export default function SpeedTest() {
	const [running, setRunning] = useState(false)
	const [pingMs, setPingMs] = useState<number | null>(null)
	const [dlMbps, setDlMbps] = useState<number | null>(null)
	const [ulMbps, setUlMbps] = useState<number | null>(null)
	const [phase, setPhase] = useState<'idle'|'ping'|'download'|'upload'|'done'>('idle')
	const [dlProgress, setDlProgress] = useState<{loaded: number, total?: number}>({ loaded: 0 })
	const [ulProgress, setUlProgress] = useState<{sent: number, total: number}>({ sent: 0, total: 0 })
	const [ip, setIp] = useState<string>('')

	useEffect(() => { fetch('/api/speed-test/ip').then(r=>r.json()).then(d=> setIp(d.ip)) }, [])

	async function testPing(samples = 5) {
		const times: number[] = []
		for (let i = 0; i < samples; i++) {
			const t0 = performance.now()
			await fetch(`/api/speed-test/ping?rand=${Math.random()}`, { cache: 'no-store' })
			const t1 = performance.now()
			times.push(t1 - t0)
		}
		times.sort((a,b)=>a-b)
		const median = times[Math.floor(times.length/2)]
		setPingMs(median)
	}

	async function testDownload(sizeMb = 20) {
		setPhase('download'); setDlProgress({ loaded: 0 })
		const start = performance.now()
		const res = await fetch(`/api/speed-test?sizeMb=${sizeMb}`, { cache: 'no-store' })
		const reader = res.body?.getReader()
		let received = 0
		if (reader) {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				received += value?.length || 0
				setDlProgress({ loaded: received, total: sizeMb * 1024 * 1024 })
			}
		}
		const sec = (performance.now() - start) / 1000
		const mbits = (received * 8) / (1024 * 1024)
		setDlMbps(mbits / sec)
	}

	async function testUpload(sizeMb = 10) {
		const totalBytes = sizeMb * 1024 * 1024
		setPhase('upload'); setUlProgress({ sent: 0, total: totalBytes })
		const start = performance.now()
		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest()
			xhr.open('POST', '/api/speed-test/upload')
			xhr.upload.onprogress = (ev) => {
				if (ev.lengthComputable) setUlProgress({ sent: ev.loaded, total: ev.total })
			}
			xhr.onerror = () => reject(new Error('Upload failed'))
			xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(String(xhr.status)))
			xhr.send(new Uint8Array(totalBytes))
		})
		const sec = (performance.now() - start) / 1000
		const mbits = (totalBytes * 8) / (1024 * 1024)
		setUlMbps(mbits / sec)
	}

	async function runAll() {
		try {
			setRunning(true); setPhase('ping'); setPingMs(null); setDlMbps(null); setUlMbps(null)
			await testPing(7)
			await testDownload(20)
			await testUpload(10)
			setPhase('done')
		} finally { setRunning(false) }
	}

	return (
		<div className="container py-5" style={{maxWidth: 900}}>
			<h1 className="mb-1">Speed Test</h1>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<div className="text-muted">Ваш IP: {ip || '—'}</div>
				<Link to="/" className="btn btn-outline-secondary btn-sm">На главную</Link>
			</div>
			<div className="row g-3">
				<div className="col-12 col-md-4">
					<div className="card text-center p-4">
						<div className="text-muted">Пинг</div>
						<div className="display-6">{pingMs !== null ? human(pingMs) : '—'}<small className="ms-1 fs-6">мс</small></div>
						{phase==='ping' && <div className="small text-muted">Идёт измерение…</div>}
					</div>
				</div>
				<div className="col-12 col-md-4">
					<div className="card text-center p-4">
						<div className="text-muted">Скачивание</div>
						<div className="display-6">{dlMbps !== null ? human(dlMbps) : '—'}<small className="ms-1 fs-6">Мбит/с</small></div>
						{phase==='download' && (
							<div className="small text-muted mt-1">{(dlProgress.loaded/(1024*1024)).toFixed(1)} / {((dlProgress.total||0)/(1024*1024)).toFixed(1)} МБ</div>
						)}
					</div>
				</div>
				<div className="col-12 col-md-4">
					<div className="card text-center p-4">
						<div className="text-muted">Загрузка</div>
						<div className="display-6">{ulMbps !== null ? human(ulMbps) : '—'}<small className="ms-1 fs-6">Мбит/с</small></div>
						{phase==='upload' && (
							<div className="small text-muted mt-1">{(ulProgress.sent/(1024*1024)).toFixed(1)} / {(ulProgress.total/(1024*1024)).toFixed(1)} МБ</div>
						)}
					</div>
				</div>
			</div>
			<div className="mt-4 d-flex gap-2">
				<button className="btn btn-primary" onClick={runAll} disabled={running}>Начать тест</button>
				{running && <span className="text-muted">Идёт измерение...</span>}
			</div>
			<p className="text-muted mt-3">Результаты ориентировочные; формат похож на Speedtest, но реализация своя.</p>
		</div>
	)
}
